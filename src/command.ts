/* tslint:disable:no-console */
import { EOL } from "os";
import { HopliteError, SubCommandError, UnknownOptionError } from "./errors";
import { Option, OptionArg } from "./option";
import { Parameter, ParameterArg } from "./parameter";
import { format, getIndentation } from "./utils";
import { getArgv } from "./process-argv-wrapper";
import BaseComponent from "./base-component";

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
  autoCompletionCommand?: boolean;
}

function getHelpComponents(helpComponents: BaseComponent[], indent: string) {
  let output = ``;
  const helpParts = helpComponents.map((hc) => hc.getHelpParts());
  const usagePartSize = Math.max(...helpParts.map((parts) => parts.usage.length)) + 3;
  helpParts.forEach((hp) => {
    output += `${indent}${hp.usage.padEnd(usagePartSize)} ${hp.description || ``}${EOL}`;
  });
  return output;
}

class Command extends BaseComponent {
  private execPath: string;
  private scriptPath: string;
  private name: string;
  private description: string;
  private longDescription: string;
  private options: Option[] = [];
  private parameters: Parameter[] = [];
  private subCommands: Map<string, Command> = new Map();
  private providedSubCommand: Command;
  private parentCommand: Command;
  private helpOption: Option;
  private action: Action;
  private parseResult: any = {};
  private endOfOptions: boolean = false;
  private unprocessedParameters: Parameter[] = [];
  private autoCompletionCommand: boolean;

  constructor({
    name,
    description,
    longDescription,
    options = [],
    parameters = [],
    subCommands = [],
    helpOption = { long: "help", description: "show command usage" },
    action,
    autoCompletionCommand = true
  }: CommandArg) {
    super()
    this.name = name;
    this.description = description;
    this.longDescription = longDescription;
    options.forEach((option) => { this.addOption(option); });
    parameters.forEach((parameter) => { this.addParameter(parameter); });
    subCommands.forEach((subCommand) => { this.addSubCommand(subCommand); });
    if (helpOption) {
      this.helpOption = helpOption instanceof Option ? helpOption : new Option(helpOption)
      this.addOption(this.helpOption);
    }
    this.setAction(action);
    this.autoCompletionCommand = autoCompletionCommand;
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

  public addAutoCompletionCommand() {
    const autoCompletionCommand = new Command({
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
        const promptContent = parseResult["current-prompt-content"].substring(
          parseResult["current-prompt-content"].indexOf(" "),
          parseResult["current-prompt-content"].lastIndexOf(" ")
        )
        const argv = (await getArgv(promptContent)).slice(0, parseInt(parseResult["cursor-position"], 10) + 2)
        const autoCompletionValues = await this.parentCommand.parseForAutoCompletion(argv)
        console.log(autoCompletionValues.join(' '))
        process.exit(0)
      }
    })
    this.addSubCommand(autoCompletionCommand);
  }

  public async getAutoCompletion() {
    // Retrieve autocompletion for options
    const optionsCompletion = this.options.reduce((acc: string[], option) => {
      if (option.getValue() === undefined || option.acceptsMultipleValues()) {
        acc.push(option.getLong() ? `--${option.getLong()}` : `-${option.getShort()}`)
      }
      return acc
    }, [])

    // Retrieve autocompletion for parameters
    let parameterCompletion: string[]
    let i = 0
    while (!parameterCompletion && i < this.parameters.length) {
      if (this.parameters[i].getValue() === undefined || this.parameters[i].isVariadic() === undefined || this.parameters[i].isVariadic()) {
        parameterCompletion = await this.parameters[i].getAutoCompletion()
      }
      i++
    }

    // Retrieve autocompletion for subcommands
    const subCommandsCompletion = Array.from(this.subCommands.values()).map((sc) => sc.name)
    return [...optionsCompletion, ...parameterCompletion || [], ...subCommandsCompletion]
  }

  public async parseForAutoCompletion(argv: string[]): Promise<string[]> {
    const currentArgument = await this.process(argv)
    if (currentArgument instanceof Command && currentArgument !== this) {
      return currentArgument.parseForAutoCompletion(argv)
    }
    return currentArgument.getAutoCompletion()
  }

  public async parse(argv: string[]): Promise<any> {
    if (this.autoCompletionCommand) {
      await this.addAutoCompletionCommand();
    }

    await this.process(argv);

    await this.validate();

    // Print errors if needed
    if (this.errors.length) {
      this.printErrors();
      process.exit(1);
    }

    // Execute the action function
    if (this.action) {
      return this.action(this.parseResult);
    }
    return this.parseResult;
  }

  public async process(argv: string[]) {
    if (!this.parentCommand) {
      this.execPath = argv.shift();
      this.scriptPath = argv.shift();
    } else {
      // If the current command is a sub-command,
      // we inject the parsing result of the parent in the parsing result of the sub-command
      this.parseResult.parentCommand = this.parentCommand.parseResult;
    }

    // Iterate through command arguments
    this.unprocessedParameters = [...this.parameters]
    let currentArgument: Command|Option|Parameter = this
    while (argv.length > 0) {
      currentArgument = await this.processNextArgument(argv);
    }

    if (currentArgument instanceof Option && !currentArgument.hasParameter()) {
      return this
    }

    // Check if the help option has been provided
    if (this.helpOption && this.helpOption.getValue() === true) {
      this.setAction(() => {
        console.log(this.getHelp())
      })
    }

    if (this.providedSubCommand) {
      this.setAction(() => {
        return this.providedSubCommand.action(this.providedSubCommand.parseResult)
      })
    }

    return currentArgument
  }

  public async processNextArgument(argv: string[]): Promise<Command|Option|Parameter> {
    const arg = argv.shift()
    let currentArgument: Command|Option|Parameter = this
    if (arg === `--`) {
      this.endOfOptions = true
    } else if (!this.endOfOptions && /^-[a-zA-Z]+$/.test(arg)) {
      // One or more short options
      currentArgument = await this.processShortOptions(arg, argv)
    } else if (!this.endOfOptions && /^--[a-zA-Z][a-zA-Z0-9-]+$/.test(arg)) {
      // A long option
      currentArgument = await this.processOption(arg.substr(2), arg, argv)
    } else if (this.subCommands.has(arg)) {
      // A sub-command
      this.providedSubCommand = this.subCommands.get(arg)
      currentArgument = await this.providedSubCommand.process(argv)
    } else if (this.unprocessedParameters.length > 0) {
      // Parameters
      argv.unshift(arg) 
      currentArgument = await this.processParameter(argv)
    } else {
      this.errors.push(new HopliteError(`Unexpected argument "${arg}"`))
    }
    return currentArgument
  }

  public async processShortOptions(arg: string, argv: string[]) {
    let nextAutocompletionElement
    for (let i = 1; i < arg.length; i++) {
      nextAutocompletionElement = await this.processOption(arg.charAt(i), arg, argv)
    }
    return nextAutocompletionElement
  }

  public async processOption(name: string, arg: string, argv: string[]) {
    const option = this.options.find((o) => { return o.getShort() === name || o.getLong() === name });
    if (option) {
      if (option.hasParameter()) {
        const parameterValue = argv.shift()
        if (!parameterValue) {
          return option.getParameter()
        }
        option.setValue(parameterValue)
      } else {
        option.setValue()
      }
      return this
    }
    this.errors.push(new UnknownOptionError(name, arg))
    return this
  }

  public async processParameter(argv: string[]) {
    const parameter = this.unprocessedParameters.shift()
    parameter.setValue(argv.shift())
    if (parameter.isVariadic()) {
      this.unprocessedParameters.unshift(parameter)
    }
    return this
  }

  public async validate() {
    const validationPromises = [].concat(
      this.options.map(o => { return this.validateElement(o) }),
      this.parameters.map(p => { return this.validateElement(p) })
    )
    if (this.providedSubCommand) {
      validationPromises.push(this.validateElement(this.providedSubCommand))
    }
    await Promise.all(validationPromises)
    return this.errors.length === 0
  }

  public async validateElement(element: Option|Parameter|Command) {
    if (!(await element.validate())) {
      if (element instanceof Command) {
        this.errors.push(new SubCommandError(element.getInvocation(), element.errors));
      } else {
        this.errors = [...this.errors, ...element.getErrors()]
      }
    }
    if (!(element instanceof Command)) {
      // We give the parse result of a parent command to its sub-command in parse()
      // But but we do not the parse result of a sub-command to its parent command here
      this.parseResult[element.getName()] = element.getValue()
    }
  }

  public getValue() {
    return this.parseResult
  }

  public getInvocation(): string {
    return `${this.parentCommand ? this.parentCommand.getInvocation() + ` ` : ``}${this.name}`;
  }

  public getUsage(): string {
    let usage = `${this.parentCommand ? this.parentCommand.getUsage() + ` ` : ``}${this.name}`;
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
      message += `${err.message}${EOL}`;
    });
    console.error(message.replace(new RegExp(EOL, 'gu'), `${EOL}${indent}`));
  }
}

export default Command;
export { Command, CommandArg };
