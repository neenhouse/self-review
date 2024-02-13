# self-review

GraphQL utility to help pull github statistics for user activity.  Intended for use for engineers who need to do annual self reflection.

## Requirements

Requires nodeJS 20+.  Recommended to use NVM.

## Usage

Generate a PAT in your github developer settings and follow the below steps:

Clone repo and run:

```bash
nvm use && yarn install
```

Run command:

```bash
ACCESS_TOKEN=<YOUR_PAT> yarn start <YOUR_GITHUB_HANDLE>
```

Reports will be written to `./reports`