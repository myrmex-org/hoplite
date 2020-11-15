/* eslint-disable func-names */
import expect from 'expect';

import {
  Given, When, Then, Before, After,
} from 'cucumber';

import { BaseComponent } from '../../src/base-component';
import { Command } from '../../src/command';
import { Option, OptionArg } from '../../src/option';
import { Parameter } from '../../src/parameter';
import { getArgv } from '../../src/process-argv-wrapper';
import { enableColors, hProcess } from '../../src/utils';

interface TestContext {
  rootCommand?: Command;
  command?: Command;
  currentArgument?: BaseComponent,
  commandResult?: Record<string, unknown>;
  mockRestore?: () => void,
  stdOut?: string,
  stdErr?: string,
  exitCode?: number
}

/**
 * We use a custom error to mock process.exit() call
 * This allows us to simulate the end of the program execution and gather
 * the exit code to check it has the expected value
 */
class ProcessExit extends Error {
  constructor(code: number) {
    super(`Mocked process.exit(${code})`);
  }
}

Before(function (this: TestContext) {
  const mockOriginals = {
    writeStdOut: hProcess.writeStdOut,
    writeStdErr: hProcess.writeStdErr,
    exit: hProcess.exit,
  };
  this.mockRestore = () => {
    hProcess.writeStdOut = mockOriginals.writeStdOut;
    hProcess.writeStdErr = mockOriginals.writeStdErr;
    hProcess.exit = mockOriginals.exit;
  };
  this.stdOut = '';
  this.stdErr = '';
  delete this.exitCode;
  hProcess.writeStdOut = (s: string) => {
    this.stdOut += s;
    return true;
  };
  hProcess.writeStdErr = (s: string) => {
    this.stdErr += s;
    return true;
  };
  hProcess.exit = (code: number) => {
    this.exitCode = code;
    throw (new ProcessExit(code));
  };
});

After(function (this: TestContext) {
  this.mockRestore();
});

Given('a command line named {string}', function (this: TestContext, commandName: string) {
  enableColors(false);
  const command = new Command({ name: commandName });
  this.rootCommand = command;
  this.command = command;
});

When('I execute the command {string}', async function (this: TestContext, command: string) {
  const argv = await getArgv(command);
  argv.shift();
  expect(this.rootCommand.getName()).toStrictEqual(argv[1]);
  try {
    this.commandResult = await this.rootCommand.parse(argv) as Record<string, unknown>;
  } catch (err) {
    // We silence ProcessExit errors because they are mocks for process.exit() call
    // but we propagate other errors
    if (!(err instanceof ProcessExit)) {
      throw err;
    }
  }
});

When('I set its description to {string}', function (this: TestContext, description: string) {
  this.currentArgument.setDescription(description);
});

/** *****************************************************************************
 * Manage parameter
 ****************************************************************************** */

function addParameter(
  this: TestContext,
  variadic: boolean,
  mandatory: boolean,
  name: string,
  allowedValues: string[],
) {
  const parameter = new Parameter({
    name, mandatory, variadic, validator: allowedValues,
  });
  this.command.addParameter(parameter);
  this.currentArgument = parameter;
}

When('I add a parameter {string}', function (this: TestContext, parameterName: string) {
  addParameter.bind(this)(false, false, parameterName);
});

When('I add a parameter {string} that accepts values {string}', function (this: TestContext, parameterName: string, allowedValues) {
  addParameter.bind(this)(false, false, parameterName, allowedValues.split(','));
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

/** *****************************************************************************
 * Manage option
 ****************************************************************************** */
function addOption(this: TestContext, args: OptionArg) {
  const option = new Option(args);
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

When('I add a mandatory option {string} with a parameter {string}', function (this: TestContext, option: string, parameterName: string) {
  const short = option.length === 1 ? option : undefined;
  const long = option.length > 1 ? option : undefined;
  addOption.bind(this)({
    short, long, parameter: { name: parameterName }, mandatory: true,
  });
});

When('I add an option {string} with a parameter {string} that accepts values {string}', function (this: TestContext, option: string, parameterName: string, allowedValues: string) {
  const short = option.length === 1 ? option : undefined;
  const long = option.length > 1 ? option : undefined;
  addOption.bind(this)({ short, long, parameter: { name: parameterName, validator: allowedValues.split(',') } });
});

/** *****************************************************************************
 * Manage subcommand
 ****************************************************************************** */

When('I add a subcommand {string}', function (this: TestContext, subcommandName: string) {
  const command = new Command({ name: subcommandName });
  this.command.addSubCommand(command);
  this.command = command;
});

/** *****************************************************************************
 * Check parsing results
 ****************************************************************************** */

Then('it should fail', function (this: TestContext) {
  expect(this.exitCode).toBeGreaterThan(0);
  expect(this.commandResult).toBeUndefined();
});

Then('it should succeed', function (this: TestContext) {
  expect(this.exitCode).toBeUndefined();
  expect(this.commandResult).toBeDefined();
});

Then('it should exit without error', function (this: TestContext) {
  expect(this.exitCode).toStrictEqual(0);
  expect(this.commandResult).toBeUndefined();
});

Then('the error output should be:', function (this: TestContext, docString: string) {
  expect(this.stdErr).toStrictEqual(docString);
});

Then('the standard output should be:', function (this: TestContext, docString: string) {
  expect(this.stdOut).toStrictEqual(docString);
});

Then('the key {string} of the parse result should be set to {string}', function (this: TestContext, key: string, value: string) {
  expect(this.commandResult[key]).toStrictEqual(value);
});

Then('the key {string} of the parse result should be set to true', function (this: TestContext, key: string) {
  expect(this.commandResult[key]).toStrictEqual(true);
});

Then('the key {string} of the parse result should be set to false', function (this: TestContext, key: string) {
  expect(this.commandResult[key]).toStrictEqual(false);
});

Then('the key {string} of the parse result should be undefined', function (this: TestContext, option: string) {
  expect(this.commandResult[option]).toBeUndefined();
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
