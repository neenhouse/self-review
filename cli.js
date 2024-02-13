#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
require("ts-node").register(require("./tsconfig.json"));

const { program } = require("commander");
const { run } = require("./index.ts");

// Set the version for your CLI
program.version(require("./package.json").version);

// Define command line options
program.argument("<user>", "User to run report for").action((user) => {
  const options = program.opts();
  options.user = user;
  options.accessToken = process.env.ACCESS_TOKEN;
  run(options);
});

// Parse the command line arguments
program.parse(process.argv);
