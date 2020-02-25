import expect from 'expect';

import { Given, When, Then } from 'cucumber';

import { Command } from '../../src/command';
import { Option, OptionArg } from '../../src/option';
import { Parameter, ParameterArg } from '../../src/parameter';
import { getArgv } from '../../src/process-argv-wrapper';
import { BaseComponent, enableColors } from "../../src/utils";
interface TestContext {
  rootCommand?: Command;
  command?: Command;
  currentArgument?: BaseComponent,
  error?: Error;
  commandResult?: any;
}

Given('a command line named {string}', function (this: TestContext, commandName: string) {
  enableColors(false);
  const command = new Command({
    name: commandName,
    noExit: true
  });
  this.rootCommand = command;
  this.command = command;
});

When('I call the command {string}', async function (this: TestContext, command: string) {
  const argv = await getArgv(command);
  argv.shift()
  expect(this.rootCommand.getName()).toEqual(argv[1]);
  try {
    this.commandResult = await this.rootCommand.parse(argv);
  } catch (e) {
    this.error = e;
  }
});

When('I set its description to {string}', function (this: TestContext, description: string) {
  this.currentArgument.setDescription(description);
});


/*******************************************************************************
 * Manage parameter
 *******************************************************************************/

function addParameter(this: TestContext, variadic: boolean, mandatory: boolean, name: string) {
  const parameter = new Parameter({ name, mandatory, variadic })
  this.command.addParameter(parameter);
  this.currentArgument = parameter;
}

When('I add a parameter {string}', function (this: TestContext, parameterName: string) {
  addParameter.bind(this)(false, false, parameterName);
});

When('I add a mandatory parameter {string}', function (this: TestContext, parameterName: string) {
  addParameter.bind(this)(false, true, parameterName);
});

When('I add a variadic parameter {string}', function (this: TestContext, parameterName: string) {
  addParameter.bind(this)(true, false, parameterName);
});

When('I add a variadic mandatory parameter {string}', function (this: TestContext, parameterName: string) {
  addParameter.bind(this)(true, true, parameterName);
});


/*******************************************************************************
 * Manage option
 *******************************************************************************/
function addOption(this: TestContext, args: OptionArg) {
  const option = new Option(args)
  this.command.addOption(option);
  this.currentArgument = option;
}

When('I add a flag {string}', function (this: TestContext, flag: string) {
  addOption.bind(this)({ short: flag });
});

When('I add an option {string} with a parameter {string}', function (this: TestContext, option: string, parameterName: string) {
  const short = option.length === 1 ? option : undefined;
  const long = option.length > 1 ? option : undefined;
  addOption.bind(this)({ short, long, parameter: { name: parameterName } });
});

When('I add an option {string} with a variadic parameter {string}', function (this: TestContext, option: string, parameterName: string) {
  const short = option.length === 1 ? option : undefined;
  const long = option.length > 1 ? option : undefined;
  addOption.bind(this)({ short, long, parameter: { name: parameterName, variadic: true } });
});


/*******************************************************************************
 * Manage subcommand
 *******************************************************************************/

 When('I add a subcommand {string}', function (this: TestContext, subcommandName: string) {
  const command = new Command({
    name: subcommandName,
    noExit: true
  });
  this.command.addSubCommand(command);
  this.command = command;
});


/*******************************************************************************
 * Check parsing results
 *******************************************************************************/

Then('it should fail', function (this: TestContext, ) {
  expect(this.commandResult).toBeUndefined();
  expect(this.error).toBeInstanceOf(Error);
});

Then('it should succeed', function (this: TestContext, ) {
  expect(this.error).toBeUndefined();
  expect(this.commandResult).toBeDefined();
});

Then('the key {string} of the parse result should be set to {string}', function (this: TestContext, key: string, value: string) {
  expect(this.commandResult[key]).toEqual(value);
});

Then('the key {string} of the parse result should be set to true', function (this: TestContext, key: string) {
  expect(this.commandResult[key]).toEqual(true);
});

Then('the key {string} of the parse result should be set to false', function (this: TestContext, key: string) {
  expect(this.commandResult[key]).toEqual(false);
});

Then('the key {string} of the parse result should be undefined', function (this: TestContext, option: string) {
  expect(this.commandResult[option]).toEqual(undefined);
});

function countElements(this: TestContext, option: string, length: number) {
  expect(this.commandResult[option]).toBeInstanceOf(Array);
  expect(this.commandResult[option]).toHaveLength(length);
}
Then('the key {string} of the parse result should be set to an array of {int} elements', countElements);
Then('the key {string} of the parse result should be set to an array of {int} element', countElements);

Then('the key {string} of the parse result should contain {string}', function (this: TestContext, option: string, value: string) {
  expect(this.commandResult[option]).toContain(value);
});

Then('the standard output should be:', function (this: TestContext, docString: string) {
  expect(this.command.getStdOut()).toEqual(docString);
});
