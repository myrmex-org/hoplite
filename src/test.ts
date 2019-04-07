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
          variadic: true,
          validator: simpleValidator(["@myrmex/lambda", "@myrmex/api-gateway"]),
        },
      ],
      action: (result) => {
        console.log(result);
        console.log(`Create new project ${format.cmd(result["project-name"])}`);
      },
    }),
  ],
  description: "Create and manage a Myrmex project",
  longDescription: "This command allows to create a Myrmex project.\nWhen executed in a Myrmex project, it is enriched by module subcommands",
});

const lambda = new Command({
  name: `lambda`,
  subCommands: [
    new Command({
      name: `deploy`,
      options: [
        {
          long: "function",
          parameter: {
            name: "function-identifier",
            mandatory: true,
            variadic: true,
            validator: async (parameterValue) => ["abc", "def"].includes(parameterValue),
          },
        },
      ],
    }),
  ],
  description: "Manage AWS Lambda functions",
  longDescription: "This sub-command provides tools to manage AWS Lambda functions",
});

myrmex.addSubCommand(lambda);

myrmex.action((parseResult) => {
  console.log(JSON.stringify(parseResult, undefined, 2));
});

myrmex.parse(process.argv);
