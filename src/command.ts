/* tslint:disable:no-console */
import { EOL } from "os";
import { HopliteError, SubCommandError, UnknownOptionError } from "./errors";
import { Option, OptionArg } from "./option";
import { Parameter, ParameterArg } from "./parameter";
import { format, getIndentation, HelpComponent } from "./utils";

type Action = (parseResult: any) => any;

interface CommandArg {
  options?: Array<Option|OptionArg>;
  parameters?: Array<Parameter|ParameterArg>;
  subCommands?: Array<Command|CommandArg>;
  name: string;
  description?: string;
  longDescription?: string;
  helpOption?: OptionArg;
  action?: Action;
}

function getHelpComponents(helpComponents: HelpComponent[], indent: string) {
  let output = ``;
  const helpParts = helpComponents.map((hc) => hc.getHelpParts());
  const usagePartSize = Math.max(...helpParts.map((parts) => parts.usage.length)) + 3;
  helpParts.forEach((hp) => {
    output += `${indent}${hp.usage.padEnd(usagePartSize)} ${hp.description || ``}${EOL}`;
  });
  return output;
}

class Command implements HelpComponent {
  public execPath: string;
  public scriptPath: string;
  public name: string;
  public description: string;
  public longDescription: string;
  public options: Option[] = [];
  public parameters: Parameter[] = [];
  public subCommands: Map<string, Command> = new Map();
  public parentCommand: Command;
  public helpOptions: string[] = [];
  public action: Action;
  public parseResult: any = {};
  public errors: HopliteError[];

  constructor({
    name,
    description,
    longDescription,
    options = [],
    parameters = [],
    subCommands = [],
    helpOption = { long: "help", description: "show command usage" },
    action,
  }: CommandArg) {
    options.forEach((option) => { this.addOption(option); });
    parameters.forEach((parameter) => { this.addParameter(parameter); });
    subCommands.forEach((subCommand) => { this.addSubCommand(subCommand); });
    this.name = name;
    this.description = description;
    this.longDescription = longDescription;
    if (helpOption) {
      if (helpOption.short) {
        this.helpOptions.push(helpOption.short);
      }
      if (helpOption.long) {
        this.helpOptions.push(helpOption.long);
      }
      this.addOption(helpOption);
    }
    this.setAction(action);
    this.errors = [];
  }

  public getName() {
    return this.name
  }

  public addOption(option: Option|OptionArg) {
    this.options.push(option instanceof Option ? option : new Option(option));
  }

  public addParameter(parameter: Parameter|ParameterArg) {
    this.parameters.push(parameter instanceof Parameter ? parameter : new Parameter(parameter));
  }

  public addSubCommand(subCommand: Command|CommandArg) {
    const sc = subCommand instanceof Command ? subCommand : new Command(subCommand);
    this.subCommands.set(sc.name, sc);
    sc.setParentCommand(this);
  }

  public setParentCommand(parentCommand: Command) {
    this.parentCommand = parentCommand;
  }

  public setAction(action: Action) {
    this.action = action;
  }

  public async getAutoCompletionElement(argv: string[]): Promise<Command|Option|Parameter> {
    if (!this.parentCommand) {
      this.execPath = argv.shift();
      this.scriptPath = argv.shift();
    }

    // if (argv.length <= 1) {
    //   return this;
    // }

    // Iterate through command arguments
    while (argv.length > 1) {
      const currentArgument = await this.processNextArgument(argv);
      if (currentArgument instanceof Command) {
        return currentArgument.getAutoCompletionElement(argv);
      }
    }

    const argument = await this.processNextArgument(argv);
    if (argument instanceof Option && !argument.parameter) {
      return this
    }
    return argument || this;
  }

  public async parse(argv: string[]): Promise<any> {
    if (!this.parentCommand) {
      this.execPath = argv.shift();
      this.scriptPath = argv.shift();
    } else {
      this.parseResult.parentCommand = this.parentCommand.parseResult;
    }

    // Iterate through command arguments
    while (argv.length > 0) {
      const currentArgument = await this.processNextArgument(argv);
      if (currentArgument instanceof Command) {
        try {
          await currentArgument.parse(argv);
        } catch (err) {
          if (err instanceof HopliteError) {
            this.errors.push(err);
          } else {
            throw err;
          }
        }
      }
    }

    // Check if the help option has been provided
    this.helpOptions.forEach((option) => {
      if (this.parseResult.hasOwnProperty(option)) {
        console.log(this.getHelp());
        process.exit(0);
      }
    });

    // Check if required options are provided
    await this.checkOptions();

    // Check if required parameters are provided
    await this.checkParameters();

    // Print errors if needed
    if (this.errors.length) {
      if (this.parentCommand) {
        throw new SubCommandError(this.getInvocation(), this.errors);
      }
      this.printErrors();
      process.exit(1);
    }

    // Execute the action function
    if (this.action) {
      return this.action(this.parseResult);
    }
    return this.parseResult;
  }

  public async processNextArgument(argv: string[]) {
    const parameters = [...this.parameters];
    const arg = argv.shift();
    let currentArgument;
    if (/^-[a-zA-Z]+$/.test(arg)) {
      // One or more short options
      currentArgument = await this.processShortOptions(arg, argv);
    } else if (/^--[a-zA-Z][a-zA-Z0-9]+$/.test(arg)) {
      // A long option
      currentArgument = await this.processOption(arg.substr(2), arg, argv);
    } else if (this.subCommands.has(arg)) {
      // A sub-command
      currentArgument = await this.processSubCommand(arg, argv);
    } else if (parameters.length > 0) {
      // One or more parameters
      currentArgument = await this.processParameters(parameters, arg, argv);
    } else {
      this.errors.push(new HopliteError(`Unexpected parameter "${arg}"`));
    }
    return currentArgument;
  }

  public async processShortOptions(arg: string, argv: string[]) {
    let option;
    for (let i = 1; i < arg.length; i++) {
      option = await this.processOption(arg.charAt(i), arg, argv);
    }
    return option;
  }

  public async processOption(name: string, arg: string, argv: string[]) {
    let option;
    try {
      option = this.options.find((o) => {
        return o.short === name || o.long === name;
      });
      if (!option) { throw new UnknownOptionError(name, arg); }
      const optionKey = option.long || option.short;
      const optionValue = await option.resolve(argv, this.parseResult);
      if (option.doesAcceptMultipleValues()) {
        this.parseResult[optionKey] = this.parseResult[optionKey] || [];
        this.parseResult[optionKey].push(optionValue);
      } else {
        this.parseResult[optionKey] = optionValue;
      }
    } catch (err) {
      if (err instanceof HopliteError) {
        this.errors.push(err);
      } else {
        throw err;
      }
    }
    return option;
  }

  public async processSubCommand(arg: string, argv: string[]) {
    return this.subCommands.get(arg);
  }

  public async processParameters(parameters: Parameter[], arg: string, argv: string[]): Promise<void|Command|Parameter> {
    const currentParameter = parameters[0];
    try {
      await currentParameter.validate(arg, undefined, this.parseResult);
    } catch (err) {
      if (err instanceof HopliteError) {
        this.errors.push(err);
      } else {
        throw err;
      }
    }
    if (currentParameter.isVariadic()) {
      this.parseResult[currentParameter.getName()] = this.parseResult[currentParameter.getName()] || [];
      this.parseResult[currentParameter.getName()].push(arg);
    } else {
      this.parseResult[currentParameter.getName()] = arg;
      parameters.shift();
    }
    if (argv.length > 0) {
      const nextArg = argv.shift();
      return await this.processParameters(parameters, nextArg, argv);
    }
    return currentParameter;
  }


  public async checkOptions() {
    this.options.forEach((option) => {
      if (option.isMandatory() && !this.parseResult[option.getName()]) {
        this.errors.push(new HopliteError(
          `The option ${format.cmd(option.getUsage())} is ${format.error(`mandatory`)} for command ${format.cmd(this.getInvocation())}`,
        ));
      }
    });
  }

  public async checkParameters() {
    this.parameters.forEach((parameter) => {
      if (parameter.isMandatory() && !this.parseResult[parameter.getName()]) {
        this.errors.push(new HopliteError(
          `The parameter ${format.cmd(parameter.getUsage())} is ${format.error(`mandatory`)} for command ${format.cmd(this.getInvocation())}`,
        ));
      }
    });
  }

  public getInvocation(): string {
    return `${this.parentCommand ? this.parentCommand.getInvocation() + ` ` : ``}${this.name}`;
  }

  public getUsage() {
    let usage = this.getInvocation();
    if (this.options.length) {
      usage += ` [OPTIONS]`;
    }
    if (this.parameters.length) {
      this.parameters.forEach((parameter) => { usage += ` ${parameter.getUsage()}`; });
    }
    if (this.subCommands.size) {
      usage += ` <COMMAND>`;
    }
    return usage;
  }

  public getHelpParts() {
    return { usage: this.name, description: this.description };
  }

  public getHelp() {
    const indent = getIndentation();
    let help = ``;
    if (this.description) {
      help += `${EOL}${this.description}${EOL}`;
    }
    if (this.longDescription) {
      help += `${EOL}${this.longDescription}${EOL}`;
    }
    if (this.options.length) {
      help += `${EOL}Options:${EOL}`;
      help += getHelpComponents(this.options, indent);
    }
    if (this.parameters.length) {
      help += `${EOL}Parameters:${EOL}`;
      help += getHelpComponents(this.parameters, indent);
    }
    if (this.subCommands.size) {
      help += `${EOL}Commands:${EOL}`;
      help += getHelpComponents(Array.from(this.subCommands.values()), indent);
    }
    return `${EOL}${EOL}Usage: ${format.cmd(this.getUsage())}${EOL}${EOL}${help}`;
  }

  public printErrors() {
    const indent = getIndentation();
    let message = `${EOL}${this.errors.length === 1 ? `An error` : `Some errors`} occured:${EOL}${EOL}`;
    this.errors.forEach((err) => {
      message += `${indent}${err.message}${EOL}`;
    });
    console.error(message);
  }
}

export default Command;
export { Command, CommandArg };
