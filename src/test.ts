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
        mandatory: true,
        variadic: true,
        validator: simpleValidator(["us-east-1", "us-east-2"]),
        getAllowedValues: () => Promise.resolve(["us-east-1", "us-east-2"]),
      },
      description: "choose an AWS region",
    }, {
      short: "e",
      long: "environment",
      description: "select an environment",
      parameter: {
        name: "environment",
        mandatory: true,
        validator: simpleValidator(["toto", "tata"]),
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
          validator: simpleValidator(["@myrmex/lambda", "@myrmex/api-gateway"]),
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
        validator: async (parameterValue) => ["xxx", "yyy"].includes(parameterValue),
        getAllowedValues: () => Promise.resolve(["xxx", "yyy"]),
      }, {
        name: "function",
        mandatory: true,
        variadic: true,
        validator: async (parameterValue) => ["abc", "def"].includes(parameterValue),
        getAllowedValues: () => Promise.resolve(["abc", "def"]),
      }],
      action: (result) => {
        console.log(result)
        console.log(`Deploying ${format.cmd(result.function.join(", "))}`);
      },
    }),
  ],
});

myrmex.addSubCommand(lambda);

myrmex.setAction((parseResult) => {
  console.log(JSON.stringify(parseResult, undefined, 2));
});

myrmex.parse(process.argv);
