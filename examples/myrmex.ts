#!/usr/bin/env ts-node
/* tslint:disable:no-console */
import { Command } from "../src/command";
import Parameter, { generateSimpleValidator } from "../src/parameter";
import { format } from "../src/utils";
import getArgv from "../src/process-argv-wrapper";
import Option from "../src/option";

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
        validator: generateSimpleValidator(["us-east-1", "us-east-2"]),
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
        validator: generateSimpleValidator(["toto", "tata"]),
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
          variadic: true,
          validator: generateSimpleValidator(["@myrmex/lambda", "@myrmex/api-gateway"]),
          getAllowedValues: () => Promise.resolve(["@myrmex/lambda", "@myrmex/api-gateway"]),
        },
      ],
      action: (result) => {
        console.log(`Creating new project ${format.cmd(result["project-name"])}`);
        console.log(result);
        console.log("done");
      },
    }), {
      name: "completion",
      parameters: [
        {
          name: `current-prompt-content`,
          description: `The current content typed in the prompt.`,
          mandatory: true,
        },
        {
          name: `cursor-position`,
          description: `Index of the word where the cursor is positioned.`,
          mandatory: true,
        },
      ],
      action: async function (parseResult) {
        // console.log(parseResult);
        const promptContent = parseResult["current-prompt-content"].substring(0, parseResult["current-prompt-content"].lastIndexOf(" "))
        const argv = (await getArgv(promptContent)).slice(0, parseInt(parseResult["cursor-position"], 10) + 2);
        // console.log(argv.join('#####'));
        // console.log(parseResult["cursor-position"])
        const command = this.parentCommand as Command;
        // console.log(argv)
        const autoCompletionElement = await command.getAutoCompletionElement(argv);
        // console.log(`XXX` + autoCompletionElement.getName())
        // console.log(autoCompletionElement)
        if (autoCompletionElement instanceof Command) {
          // console.log("COMMAND");
          const options = autoCompletionElement.options.map((o) => o.long ? `--${o.long}` : `-${o.short}`);
          const subCommands = Array.from(autoCompletionElement.subCommands.values()).map((sc) => sc.name);
          console.log([...options, ...subCommands].join(" "));
        } else if (autoCompletionElement instanceof Parameter) {
          // console.log("PARAMETER");
          console.log((await autoCompletionElement.getAllowedValues({})).join(' '));
        } else if (autoCompletionElement instanceof Option && autoCompletionElement.parameter) {
          // console.log("OPTION_WITH_PARAMETER");
          console.log((await autoCompletionElement.parameter.getAllowedValues({})).join(' '));
        } else {
          // console.log("NOTHING")
        }
        process.exit(0);
      },
    },
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
            // validator: async (parameterValue) => ["abc", "def"].includes(parameterValue),
            getAllowedValues: () => Promise.resolve(["abc", "def"]),
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
