import { EOL } from 'os';
import {
  ValidationError,
  CommandError,
  UnknownOptionError,
  UnexpectedParameterError,
} from './validation';
import { Option, OptionArg } from './option';
import { Parameter, ParameterArg } from './parameter';
import { format, getIndentation, hProcess } from './utils';
import { BaseComponent, HelpParts } from './base-component';

type Action = (parseResult: Record<string, unknown>) => unknown;

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
  let output = '';
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
  protected execPath: string;

  protected scriptPath: string;

  protected name: string;

  protected description: string;

  protected longDescription: string;

  protected options: Option[] = [];

  protected parameters: Parameter[] = [];

  protected subCommands: Map<string, Command> = new Map();

  protected subCommand: Command;

  protected parentCommand: Command;

  protected helpOption: Option;

  public action: Action;

  protected errors: ValidationError[];

  protected stdOut = '';

  protected stdErr = '';

  constructor({
    name,
    description,
    longDescription,
    options = [],
    parameters = [],
    subCommands = [],
    helpOption = { long: 'help', description: 'show command usage' },
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
      this.helpOption = helpOption instanceof Option ? helpOption : new Option(helpOption);
      this.addOption(this.helpOption);
    }
    this.setAction(action);
    this.errors = [];
  }

  /** *************************************************************
   * Methods to build the command
   ************************************************************** */

  public addOption(option: Option|OptionArg): Command {
    this.options.push(option instanceof Option ? option : new Option(option));
    return this;
  }

  public addParameter(parameter: Parameter|ParameterArg): Command {
    this.parameters.push(parameter instanceof Parameter ? parameter : new Parameter(parameter));
    return this;
  }

  public addSubCommand(subCommand: Command|CommandArg): Command {
    const sc = subCommand instanceof Command ? subCommand : new Command(subCommand);
    this.subCommands.set(sc.name, sc);
    sc.setParentCommand(this);
    return this;
  }

  public setParentCommand(parentCommand: Command): Command {
    this.parentCommand = parentCommand;
    return this;
  }

  public setAction(action: Action): Command {
    this.action = action;
    return this;
  }

  public getCurrentParameter(): Parameter {
    return this.parameters.find((parameter) => !parameter.isSet() || parameter.isVariadic());
  }

  /** *************************************************************
   * Methods to parse the command input
   ************************************************************** */

  public setValuesAndGetCurrentArgument(argv: string[]): BaseComponent {
    if (!this.parentCommand) {
      this.execPath = argv.shift();
      this.scriptPath = argv.shift();
    }

    // We allow aliasing "this" here because "currentArgument" contains the
    // current element being parsed and it statrs with the command itself
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let currentArgument: BaseComponent = this;

    // Iterate through command arguments
    while (argv.length > 0) {
      currentArgument = this.processNextArgument(argv);
    }

    if (currentArgument instanceof Option && !currentArgument.hasParameter()) {
      return this;
    }
    return currentArgument;
  }

  public async getAutoCompletionElement(argv: string[]): Promise<BaseComponent> {
    const currentArgument = this.setValuesAndGetCurrentArgument(argv);
    return currentArgument;
  }

  public async parse(argv: string[]): Promise<unknown> {
    this.setValuesAndGetCurrentArgument(argv);

    // Check if the help option has been provided
    const helpPrinted = await this.printHelpIfNeeded();
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

  public getValues(): Record<string, unknown> {
    const values: Record<string, unknown> = {};
    if (this.parentCommand) {
      values._ = this.parentCommand.getValues();
    }
    this.options.forEach((option) => {
      values[option.getName()] = option.getValue();
    });
    this.parameters.forEach((parameter) => {
      values[parameter.getName()] = parameter.getValue();
    });
    return values;
  }

  public execAction(): unknown {
    if (this.subCommand) {
      return this.subCommand.execAction();
    }
    if (this.action) {
      return this.action(this.getValues());
    }
    return this.getValues();
  }

  /** *************************************************************
   * Methods to validate the command
   ************************************************************** */

  public async validate(): Promise<true|ValidationError> {
    // Retrieve values provided for all arguments to use for validation
    const values = this.getValues();

    const validationPromises: Promise<true|ValidationError>[] = [];

    // Retrieve option errors
    this.options.forEach((option) => {
      validationPromises.push(option.validate(values));
    });

    // Retrieve parameter errors
    this.parameters.forEach((parameter) => {
      validationPromises.push(parameter.validate(values));
    });

    // Retrieve sub-command errors
    if (this.subCommand) {
      validationPromises.push(this.subCommand.validate());
    }

    const validationResults = await Promise.all(validationPromises);
    this.errors = validationResults.reduce((acc, validationResult) => {
      if (validationResult !== true) {
        acc.push(validationResult);
      }
      return acc;
    }, this.errors);

    if (this.errors.length === 0) {
      return true;
    }
    return new CommandError(this.getName(), this.errors);
  }

  /** *************************************************************
   * Methods to set values the command parts
   ************************************************************** */

  public processNextArgument(argv: string[]): BaseComponent {
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
      currentArgument = this.processParameters(arg);
    }
    return currentArgument;
  }

  public processShortOptions(arg: string, argv: string[]): Option|Command {
    let option;
    for (let i = 1; i < arg.length; i += 1) {
      option = this.processOption(arg.charAt(i), arg, argv);
    }
    return option;
  }

  public processOption(name: string, arg: string, argv: string[]): Option|Command {
    const option = this.options.find((o) => o.getShort() === name || o.getLong() === name);
    if (!option) {
      this.errors.push(new UnknownOptionError(name, arg));
      return this;
    }
    option.setValue(argv);
    return option;
  }

  public processSubCommand(arg: string, argv: string[]): BaseComponent {
    this.subCommand = this.subCommands.get(arg);
    return this.subCommand.setValuesAndGetCurrentArgument(argv);
  }

  public processParameters(arg: string): Parameter|Command {
    const currentParameter = this.getCurrentParameter();
    if (!currentParameter) {
      this.errors.push(new UnexpectedParameterError(arg));
      return this;
    }
    currentParameter.setValue(arg);
    return currentParameter;
  }

  /** *************************************************************
   * Methods to print information for the end user
   ************************************************************** */

  public getName(): string {
    return this.name;
  }

  public getInvocation(): string {
    return `${this.parentCommand ? `${this.parentCommand.getInvocation()} ` : ''}${this.name}`;
  }

  public getUsage(): string {
    let usage = this.getInvocation();
    if (this.options.length) {
      usage += ' [OPTIONS]';
    }
    if (this.parameters.length) {
      this.parameters.forEach((parameter) => { usage += ` ${parameter.getUsage()}`; });
    }
    if (this.subCommands.size) {
      usage += ' <COMMAND>';
    }
    return usage;
  }

  public getHelpParts(): HelpParts {
    return { usage: this.name, description: this.description };
  }

  public getHelp(): string {
    const indent = getIndentation();
    let help = '';
    if (this.description) {
      help += `${EOL}${this.description}${EOL}`;
    }
    help += `${EOL}Usage: ${format.cmd(this.getUsage())}${EOL}`;
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
      return this.subCommand.printHelpIfNeeded();
    }
    return false;
  }

  public async printErrorIfNeeded(): Promise<boolean> {
    const validationResult = await this.validate();
    if (validationResult instanceof ValidationError) {
      hProcess.writeStdErr(validationResult.getOutput());
      return true;
    }
    return false;
  }
}

export default Command;
export { Command, CommandArg };
