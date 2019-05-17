/* tslint:disable:max-classes-per-file */
import { EOL } from "os";
import { format, getIndentation } from "./utils";

class HopliteError extends Error {}

class UnknownOptionError extends HopliteError {
  constructor(optionName: string, arg: string) {
    super(`Unknown option ${format.error(optionName)} in ${format.error(arg)}.`);
  }
}

class MissingOptionError extends HopliteError {
  constructor(optionName: string) {
    super(`Option ${format.error(optionName)} is mandatory.`);
  }
}

class MissingParameterError extends HopliteError {
  constructor(optionName: string) {
    super(`Parameter ${format.error(optionName)} is mandatory.`);
  }
}

class ParameterValidationError extends HopliteError {
  private value: string

  constructor(value: string, usageDisplay: string, correctValues?: string[]) {
    let message = `${format.error(value)} is not a correct value for ${format.cmd(usageDisplay)}.`;
    if (correctValues) {
      message += ` Possible values: ${correctValues.map((v) => format.info(v)).join(`, `)}.`;
    }
    super(message)
    this.value = value
  }

  getValue() {
    return this.value;
  }
}

class MultipleParameterValidationError extends HopliteError {
  constructor(key: string, errors: ParameterValidationError[], correctValues?: string[]) {
    let message: string
    if (errors.length === 1) {
      message = errors[0].message
    } else {
      const errorValues = errors.map(e => e.getValue())
      const lastErrorValue = errorValues.pop()
      message = `${errorValues.map(v => format.error(v)).join(`, `)} and ${format.error(lastErrorValue)}`;
      message +=  ` are not correct values for parameter ${format.cmd(key)}.`
      if (correctValues) {
        message += `${EOL}Possible values: ${correctValues.map((v) => format.info(v)).join(`, `)}.`;
      }
    }
    super(message);
  }
}

class SubCommandError extends HopliteError {
  constructor(subCommand: string, errors: HopliteError[]) {
    const indent = getIndentation()
    let message = `Errors in command ${format.cmd(subCommand)}:${EOL}${indent}`;
    message += (errors.map(e => e.message).join(`${EOL}`)).replace(new RegExp(EOL, 'gu'), `${EOL}${indent}`)
    super(message)
  }
}

export {
  HopliteError,
  UnknownOptionError,
  MissingOptionError,
  MissingParameterError,
  ParameterValidationError,
  MultipleParameterValidationError,
  SubCommandError
};
