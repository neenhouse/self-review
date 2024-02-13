import { graphql } from "@octokit/graphql";
import fs from "fs";

/**
 * getUserPullRequests()
 * Pages through GQL results to get all pull request info related to given user
 * @param runArgs
 * @param previousEndCursor
 * @param allResponses
 * @returns
 */
async function getUserPullRequests(
  runArgs: RunArgs,
  previousEndCursor?: string,
  allResponses: any[] = [],
) {
  const { user, accessToken } = runArgs;
  const response: any = await graphql(
    `
    {
        search(query: "type:pr state:closed author:${user} owner:udemy created:2023-01-01..2024-01-01", type: ISSUE, first: 100${
          previousEndCursor ? ', after:"' + previousEndCursor + '"' : ""
        }) {
            issueCount
            pageInfo {
                endCursor
                startCursor
                hasNextPage
            }
            edges {
                node {
                    ... on PullRequest {
                        additions
                        changedFiles
                        createdAt 
                        mergedAt
                        deletions
                        repository {
                            nameWithOwner
                        }
                        merged
                        mergedBy {
                          login
                        }
                        title
                        number
                        url
                    }
                }
            }
        }
    }
    `,
    {
      headers: {
        authorization: `token ${accessToken}`,
      },
    },
  );
  allResponses.push(response);
  if (response.search.pageInfo.hasNextPage) {
    const endCursor = response.search.pageInfo.endCursor;
    console.log("fetching next set of results...", endCursor);
    return await getUserPullRequests(runArgs, endCursor, allResponses);
  }
  return allResponses;
}

interface Data {
  [key: string]: {
    merged: number;
    additions: number;
    deletions: number;
    changedFiles: number;
    prs: {
      [key: number]: {
        title: string;
        url: string;
        createdAt: string;
        mergedAt: string;
        lagHours: number;
        additions: number;
        deletions: number;
        changedFiles: number;
      };
    };
  };
}

interface RunArgs {
  user: string;
  accessToken: string;
}

// Main function to fetch merged pull requests and display them
export async function run(runArgs: RunArgs) {
  const { user, accessToken } = runArgs;
  if (!user) {
    throw new Error("Please provide a user");
  }
  if (!accessToken) {
    throw new Error("Please provide an access token");
  }
  const allResponses = await getUserPullRequests(runArgs);

  // Cache response on disk
  // fs.writeFileSync("./response.json", JSON.stringify(allResponses));

  // Iterate through search results
  const data: Data = {};
  // const repoName = edge.repository.nameWithOwner;
  for (let response of allResponses) {
    for (let edge of response.search.edges) {
      if (!edge.node.merged) {
        continue;
      }
      const repoName = edge.node.repository.nameWithOwner as keyof typeof data;
      data[repoName] = data[repoName] || {
        merged: 0,
        additions: 0,
        changedFiles: 0,
        deletions: 0,
        prs: {},
      };
      const lagHours =
        (new Date(edge.node.mergedAt).getTime() -
          new Date(edge.node.createdAt).getTime()) /
        1000 /
        60 /
        60;
      data[repoName].merged++;
      data[repoName].additions += edge.node.additions;
      data[repoName].deletions += edge.node.deletions;
      data[repoName].changedFiles += edge.node.changedFiles;
      data[repoName].prs[edge.node.number] = {
        title: edge.node.title,
        url: edge.node.url,
        createdAt: edge.node.createdAt,
        mergedAt: edge.node.mergedAt,
        lagHours,
        additions: edge.node.additions,
        deletions: edge.node.deletions,
        changedFiles: edge.node.changedFiles,
      };
    }
  }

  const sortByOpened = Object.entries(data);
  sortByOpened.sort((a, b) => b[1].merged - a[1].merged);

  const reportsDirectory = "./reports";
  if (!fs.existsSync(reportsDirectory)) {
    fs.mkdirSync(reportsDirectory);
  }

  // Write out summaries
  fs.writeFileSync(
    `${reportsDirectory}/statistics-${user}.json`,
    JSON.stringify(data, null, 2),
  );
  fs.writeFileSync(
    `${reportsDirectory}/statistics-${user}-by-opened.json`,
    JSON.stringify(sortByOpened, null, 2),
  );
}
