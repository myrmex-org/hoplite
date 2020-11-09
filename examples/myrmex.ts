#!/usr/bin/env ts-node
/* tslint:disable:no-console */
import { Command } from "../src/command";
import Parameter from "../src/parameter";
import { format } from "../src/utils";
import getArgv from "../src/process-argv-wrapper";
import Option from "../src/option";
import { ValidationError, ParameterValidationError } from "../src/validation";

const myrmex = new Command({
  name: `myrmex`,
  options: [
    {
      short: "r",
      long: "region",
      parameter: {
        name: "aws-region",
        variadic: true,
        validator: ["us-east-1", "us-east-2"],
      },
      mandatory: true,
      description: "choose an AWS region",
    }, {
      short: "c",
      long: "casse",
      parameter: {
        name: "casse",
        validator: ["upper", "lower"],
      },
      mandatory: true,
      description: "casse of environment",
    }, {
      short: "e",
      long: "environment",
      description: "select an environment",
      parameter: {
        name: "environment",
        validator: (value, otherCommandArgumentValues) => {
          if (otherCommandArgumentValues.casse === "upper") {
            return /^[A-Z]*$/.test(value) || new ParameterValidationError("-e, --environment <environment>", value, "The environment must be uppercase")
          }
          return /^[a-z]*$/.test(value) || new ParameterValidationError("-e, --environment <environment>", value, "The environment must be lowercase");
        },
      },
      mandatory: true,
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
          variadic: true,
          validator: ["@myrmex/lambda", "@myrmex/api-gateway"],
        },
      ],
      action: (result) => {
        console.log(`Creating new project ${format.cmd(result["project-name"])}`);
        console.log(result);
        console.log("done");
      },
    }),
  ],
  description: "Create and manage a Myrmex project",
  longDescription: "This command allows to create a Myrmex project.\nWhen executed in a Myrmex project, it is enriched by module sub-commands",
});

const lambda = new Command({
  name: `lambda`,
  subCommands: [
    new Command({
      name: `deploy`,
      options: [
        {
          long: "function",
          mandatory: true,
          parameter: {
            name: "function-identifier",
            mandatory: true,
            variadic: true,
          },
        },
      ],
      action: (result) => {
        console.log(`Deploying ${format.cmd(result.function.join(", "))}`);
        console.log(JSON.stringify(result, null, 2));
        console.log("done");
      },
    }),
  ],
  description: "Manage AWS Lambda functions",
  longDescription: "This sub-command provides tools to manage AWS Lambda functions",
  action: (result) => {
    console.log(`Execute Lambda command`);
    console.log(JSON.stringify(result, null, 2));
    console.log("done");
  },
});

myrmex.addSubCommand(lambda);

myrmex.setAction((parseResult) => {
  console.log(JSON.stringify(parseResult, undefined, 2));
});

myrmex.parse(process.argv);
