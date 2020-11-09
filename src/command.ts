import { EOL } from "os";
import { ValidationError, CommandError, UnknownOptionError, UnexpectedParameterError } from "./validation";
import { Option, OptionArg } from "./option";
import { Parameter, ParameterArg } from "./parameter";
import { format, getIndentation, BaseComponent, hProcess } from "./utils";

type Action = (parseResult: any) => any;

interface CommandArg {
  options?: Array<Option|OptionArg>;
  parameters?: Array<Parameter|ParameterArg>;
  subCommands?: Array<Command|CommandArg>;
  name: string;
  description?: string;
  longDescription?: string;
  helpOption?: Option|OptionArg;
  action?: Action;
}

function getHelpComponentsFormatation(helpComponents: BaseComponent[], indent: string) {
  let output = ``;
  const helpParts = helpComponents.map((hc) => hc.getHelpParts());
  const usagePartSize = Math.max(...helpParts.map((parts) => parts.usage.length)) + 3;
  helpParts.forEach((hp) => {
    if (hp.description) {
      output += `${indent}${hp.usage.padEnd(usagePartSize)} ${hp.description}${EOL}`;
    } else {
      output += `${indent}${hp.usage}${EOL}`;
    }
  });
  return output;
}

class Command extends BaseComponent {
  public execPath: string;
  public scriptPath: string;
  public name: string;
  public description: string;
  public longDescription: string;
  public options: Option[] = [];
  public parameters: Parameter[] = [];
  public subCommands: Map<string, Command> = new Map();
  public subCommand: Command;
  public parentCommand: Command;
  public helpOption: Option;
  public action: Action;
  public parseResult: any = {};
  public errors: ValidationError[];
  private stdOut: string = "";
  private stdErr: string = "";

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
    super();
    options.forEach((option) => { this.addOption(option); });
    parameters.forEach((parameter) => { this.addParameter(parameter); });
    subCommands.forEach((subCommand) => { this.addSubCommand(subCommand); });
    this.name = name;
    this.description = description;
    this.longDescription = longDescription;
    if (helpOption) {
      this.helpOption = helpOption instanceof Option ? helpOption : new Option(helpOption),
      this.addOption(this.helpOption);
    }
    this.setAction(action);
    this.errors = [];
  }


  /***************************************************************
   * Methods to build the command
   ***************************************************************/

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

  public getCurrentParameter() {
    for (const parameter of this.parameters) {
      if (!parameter.hasValue() || parameter.isVariadic()) {
        return parameter
      }
    }
  }


  /***************************************************************
   * Methods to parse the command input
   ***************************************************************/

  public setValuesAndGetCurrentArgument(argv: string[]): BaseComponent {
    if (!this.parentCommand) {
      this.execPath = argv.shift();
      this.scriptPath = argv.shift();
    }

    let currentArgument: BaseComponent = this;

    // Iterate through command arguments
    while (argv.length > 0) {
      currentArgument = this.processNextArgument(argv);
    }

    if (currentArgument instanceof Option && !currentArgument.parameter) {
      return this
    }
    return currentArgument;
  }

  public async getAutoCompletionElement(argv: string[]): Promise<BaseComponent> {
    const currentArgument = this.setValuesAndGetCurrentArgument(argv);
    return currentArgument;
  }

  public async parse(argv: string[]): Promise<any> {
    this.setValuesAndGetCurrentArgument(argv);

    // Check if the help option has been provided
    const helpPrinted = await this.printHelpIfNeeded()
    if (helpPrinted) {
      hProcess.exit(0);
    }

    // Perform validation, print error and stop execution if needed
    const errorPrinted = await this.printErrorIfNeeded();
    if (errorPrinted) {
      hProcess.exit(1);
    }

    return this.execAction();
  }

  public getValues() {
    const values: any = {};
    if (this.parentCommand) {
      values._ = this.parentCommand.getValues();
    }
    this.options.forEach(option => {
      values[option.getName()] = option.getValue();
    });
    this.parameters.forEach(parameter => {
      values[parameter.getName()] = parameter.getValue();
    });
    return values;
  }

  public execAction(): any {
    if (this.subCommand) {
      return this.subCommand.execAction();
    }
    if (this.action) {
      return this.action(this.getValues());
    }
    return this.getValues();
  }


  /***************************************************************
   * Methods to validate the command
   ***************************************************************/

  private async checkMandatoryOptions() {
    this.options.forEach((option) => {
      if (option.isMandatory() && !option.hasValue()) {
        this.errors.push(new ValidationError(
          `The option ${format.cmd(option.getUsage())} is ${format.error(`mandatory`)} for command ${format.cmd(this.getInvocation())}`,
        ));
      }
    });
  }

  private async checkMandatoryParameters() {
    this.parameters.forEach((parameter) => {
      if (parameter.isMandatory() && !parameter.hasValue()) {
        this.errors.push(new ValidationError(
          `The parameter ${format.cmd(parameter.getUsage())} is ${format.error(`mandatory`)} for command ${format.cmd(this.getInvocation())}`,
        ));
      }
    });
  }

  public async validate() {
    // Check if mandatory options are provided
    await this.checkMandatoryOptions();

    // Check if mandatory parameters are provided
    await this.checkMandatoryParameters();

    // Retrieve values provided for all arguments to use for validation
    const values = this.getValues()

    // Retrieve option errors
    for (const option of this.options) {
      const validationResult = await option.validate(values);
      if (validationResult instanceof ValidationError) {
        this.errors.push(validationResult);
      }
    }

    // Retrieve parameter errors
    for (const parameter of this.parameters) {
      const validationResult = await parameter.validate(values);
      if (validationResult instanceof ValidationError) {
        this.errors.push(validationResult);
      }
    }

    // Retrieve sub-command errors
    if (this.subCommand) {
      const validationResult = await this.subCommand.validate();
      if (validationResult instanceof ValidationError) {
        this.errors.push(validationResult);
      }
    }

    if (this.errors.length === 0) {
      return true;
    }
    return new CommandError(this.getName(), this.errors);
  }


  /***************************************************************
   * Methods to set values the command parts
   ***************************************************************/

  public processNextArgument(argv: string[]) {
    const arg = argv.shift();
    let currentArgument;
    if (/^-[a-zA-Z]+$/.test(arg)) {
      // One or more short options
      currentArgument = this.processShortOptions(arg, argv);
    } else if (/^--[a-zA-Z][a-zA-Z0-9]+$/.test(arg)) {
      // A long option
      currentArgument = this.processOption(arg.substr(2), arg, argv);
    } else if (this.subCommands.has(arg)) {
      // A sub-command
      currentArgument = this.processSubCommand(arg, argv);
    } else {
      // A parameter
      currentArgument = this.processParameters(arg, argv);
    }
    return currentArgument;
  }

  public processShortOptions(arg: string, argv: string[]) {
    let option;
    for (let i = 1; i < arg.length; i++) {
      option = this.processOption(arg.charAt(i), arg, argv);
    }
    return option;
  }

  public processOption(name: string, arg: string, argv: string[]) {
    const option = this.options.find((o) => {
      return o.short === name || o.long === name;
    });
    if (!option) {
      this.errors.push(new UnknownOptionError(name, arg));
      return this;
    }
    option.setValue(argv);
    return option;
  }

  public processSubCommand(arg: string, argv: string[]) {
    this.subCommand = this.subCommands.get(arg);
    return this.subCommand.setValuesAndGetCurrentArgument(argv);
  }

  public processParameters(arg: string, argv: string[]) {
    const currentParameter = this.getCurrentParameter();
    if (!currentParameter) {
      this.errors.push(new UnexpectedParameterError(arg));
      return this;
    }
    currentParameter.setValue(arg);
    return currentParameter;
  }


  /***************************************************************
   * Methods to print information for the end user
   ***************************************************************/

  public getName() {
    return this.name
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
    help += `${EOL}Usage: ${format.cmd(this.getUsage())}${EOL}`
    if (this.longDescription) {
      help += `${EOL}${this.longDescription}${EOL}`;
    }
    if (this.options.length) {
      help += `${EOL}Options:${EOL}`;
      help += getHelpComponentsFormatation(this.options, indent);
    }
    if (this.parameters.length) {
      help += `${EOL}Parameters:${EOL}`;
      help += getHelpComponentsFormatation(this.parameters, indent);
    }
    if (this.subCommands.size) {
      help += `${EOL}Commands:${EOL}`;
      help += getHelpComponentsFormatation(Array.from(this.subCommands.values()), indent);
    }
    return help;
  }

  public async printHelpIfNeeded(): Promise<boolean> {
    if (this.helpOption && this.helpOption.getValue() === true) {
      const helpContent = this.getHelp();
      hProcess.writeStdOut(helpContent);
      return true;
    }
    if (this.subCommand) {
      return await this.subCommand.printHelpIfNeeded()
    }
    return false;
  }

  public async printErrorIfNeeded(): Promise<boolean> {
    const validationResult = await this.validate();
    if (validationResult !== true) {
      hProcess.writeStdErr(validationResult.getOutput());
      return true
    }
    return false;
  }
}

export default Command;
export { Command, CommandArg };
