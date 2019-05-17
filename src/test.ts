#!/usr/bin/env node
/* tslint:disable:no-console */
import "source-map-support/register";
import { Command } from "./command";
import { simpleValidator } from "./parameter";
import { format } from "./utils";

const myrmex = new Command({
  name: `myrmex`,
  options: [
    {
      short: "r",
      long: "region",
      parameter: {
        name: "aws-region",
        variadic: true,
        getAllowedValues: () => Promise.resolve(["us-east-1", "us-east-2"]),
      },
      description: "choose an AWS region",
    }, {
      short: "e",
      long: "environment",
      description: "select an environment",
      parameter: {
        name: "environment",
        getAllowedValues: () => Promise.resolve(["toto", "otot"]),
      },
    },
  ],
  subCommands: [
    new Command({
      name: `new`,
      parameters: [
        {
          name: `project-name`,
          description: `The project name`,
          mandatory: true,
        },
        {
          name: `plugins`,
          description: `The plugins to install`,
          variadic: false,
          getAllowedValues: () => Promise.resolve(["@myrmex/lambda", "@myrmex/api-gateway"]),
        },
      ],
      action: (result) => {
        console.log(`Creating new project ${format.cmd(result["project-name"])}`);
        console.log(result);
        console.log("done");
      },
    })
  ],
  description: "Create and manage a Myrmex project",
  longDescription: "This command allows to create a Myrmex project.\nWhen executed in a Myrmex project, it is enriched by module sub-commands",
});

const lambda = new Command({
  name: `lambda`,
  description: "Manage AWS Lambda functions",
  longDescription: "This sub-command provides tools to manage AWS Lambda functions",
  subCommands: [
    new Command({
      name: `deploy`,
      description: "Deploy AWS Lambda functions",
      parameters: [, {
        name: "alias",
        mandatory: true,
        variadic: false,
        getAllowedValues: () => Promise.resolve(["xxx", "yyy"]),
      }, {
        name: "function",
        mandatory: true,
        variadic: true,
        getAllowedValues: () => Promise.resolve(["abc", "def"]),
      }],
      action: (result) => {
        console.log(`RESULT of myrmex lambda deploy`)
        console.log(result)
        console.log(`Deploying ${format.cmd(result.function.join(", "))}`);
      },
    }),
  ],
  action: (parseResult) => {
    console.log(`RESULT of myrmex lambda`)
    console.log(JSON.stringify(parseResult, undefined, 2));
  },
});

myrmex.addSubCommand(lambda);

myrmex.setAction((parseResult) => {
  console.log(`RESULT of myrmex`)
  console.log(JSON.stringify(parseResult, undefined, 2));
});

myrmex.parse(process.argv);
