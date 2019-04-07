/* tslint:disable:max-classes-per-file */
import { EOL } from "os";
import { format } from "./utils";

class HopliteError extends Error {}

class UnknownOptionError extends HopliteError {
  constructor(optionName: string, arg: string) {
    super(`Unknown option "${format.error(optionName)}" in ${format.error(arg)}`);
  }
}

class ParameterValidationError extends HopliteError {
  constructor(value: string, key?: string, correctValues?: string[]) {
    let message = `${format.error(value)} is not a correct value${key ? ` for ${format.cmd(key)}` : ""}.`;
    if (correctValues) {
      message += ` Possible values: ${correctValues.map((v) => format.info(v)).join(`, `)}.`;
    }
    super(message);
  }
}

class SubCommandError extends HopliteError {
  public errors: HopliteError[];
  constructor(subCommand: string, errors: HopliteError[]) {
    let message = `Errors in command ${format.cmd(subCommand)}:${EOL}  `;
    message += errors.map((e) => e.message).join(`${EOL}  `);
    super(message);
    this.errors = errors;
  }
}

export { HopliteError, UnknownOptionError, ParameterValidationError, SubCommandError };
