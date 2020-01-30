import expect from 'expect';

import { Given, When, Then } from 'cucumber';

import { Command } from '../../src/command';
import { OptionArg } from '../../src/option';
import { getArgv } from '../../src/process-argv-wrapper';


Given('a command line named {string}', function (commandName: string) {
  this.command = new Command({
    name: commandName,
  });
});

When('I call the command {string}', async function (command: string) {
  const argv = await getArgv(command);
  argv.shift()
  expect(this.command.getName()).toEqual(argv[1]);
  this.commandOutput = await this.command.parse(argv);
});

When('I add a flag {string}', function (flag: string) {
  const optionArg: OptionArg = { short: flag };
  this.command.addOption(optionArg);
});

When('I add an option with a parameter {string}', function (flag: string) {
  const optionArg: OptionArg = { short: flag, parameter: { name: 'xxx' } };
  this.command.addOption(optionArg);
});

When('I add an option with a variadic parameter {string}', function (flag: string) {
  const optionArg: OptionArg = { short: flag, parameter: { name: 'xxx', variadic: true } };
  this.command.addOption(optionArg);
});

Then('I should see an error', function () {
  expect(false);
});

Then('the key {string} of the parse result should be set to {string}', function (flag: string, value: string) {
  expect(this.commandOutput[flag]).toEqual(value);
});

Then('the key {string} of the parse result should be set to true', function (flag: string) {
  expect(this.commandOutput[flag]).toEqual(true);
});

Then('the key {string} of the parse result should be set to false', function (flag: string) {
  expect(this.commandOutput[flag]).toEqual(false);
});

Then('the key {string} of the parse result should be undefined', function (option: string) {
  expect(this.commandOutput[option]).toEqual(undefined);
});

function countElements (option: string, length: number) {
  expect(this.commandOutput[option]).toBeInstanceOf(Array);
  expect(this.commandOutput[option]).toHaveLength(length);
}
Then('the key {string} of the parse result should be set to an array of {int} elements', countElements);
Then('the key {string} of the parse result should be set to an array of {int} element', countElements);

Then('the key {string} of the parse result should contain {string}', function (option: string, value: string) {
  expect(this.commandOutput[option]).toContain(value);
});
