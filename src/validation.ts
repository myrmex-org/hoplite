/* tslint:disable:max-classes-per-file */
import { EOL } from "os";
import { format } from "./utils";

class ValidationError {
  public message: string;
  public childErrors: ValidationError[];
  public bottomMessage?: string;
  public indent: string; 

  constructor(message: string, errors: ValidationError[] = [], bottomMessage?: string) {
    this.message = message;
    this.childErrors = errors;
    this.bottomMessage = bottomMessage
    this.indent = '    ';
  }

  public getOutput(indent = '') {
    let output = this.message;
    this.childErrors.forEach(error => {
      output += EOL + error.getOutput(indent + this.indent);
    })
    if (this.bottomMessage) {
      output += EOL + this.bottomMessage;
    }
    return indent + output;
  }
}

class UnknownOptionError extends ValidationError {
  constructor(optionName: string, arg: string) {
    super(`Unknown option ${format.error(optionName)} in ${format.error(arg)}`);
  }
}

class UnexpectedParameterError extends ValidationError {
  constructor(value: string) {
    super(`Unexpected parameter ${format.error(value)}`);
  }
}

class CommandError extends ValidationError {
  constructor(command: string, errors: ValidationError[]) {
    let message = `${errors.length === 1 ? `An error` : `Some errors`} occured in command ${format.cmd(command)}:`;
    super(message, errors);
  }
}

class ParameterValidationError extends ValidationError {
  public value: string;
  constructor(usage: string, value: string, allowedValues?: string|string[]) {
    let message = `${format.error(value)} is not a correct value for ${format.cmd(usage)}.`;
    let bottomMessage: string;
    if (Array.isArray(allowedValues)) {
      bottomMessage = `Allowed values: ${allowedValues.map((v) => format.info(v)).join(`, `)}.`;
    } else if (allowedValues) {
      bottomMessage = allowedValues;
    }
    super(message, [], bottomMessage);
    this.value = value;
  }
}

class VariadicParameterValidationError extends ValidationError {
  constructor(usage: string, errors: ValidationError[], allowedValues?: string|string[]) {
    const badValues = errors.reduce((accumulator, currentValidationError) => {
      if (currentValidationError instanceof ParameterValidationError) {
        accumulator.push(currentValidationError.value);
      }
      return accumulator;
    }, []);
    let message = `Some values provided for ${format.cmd(usage)} are not valid:`;
    if (badValues.length === errors.length) {
      message += ` ${badValues.map(bv => format.error(bv)).join(`, `)}.`;
      super(message, [], errors[0].bottomMessage);
    } else {
      super(message, errors);
    }
  }
}

class ValidationResult {
  success: boolean;
  error?: ValidationError;
  constructor(success: boolean, error?: ValidationError) {
    this.success = success;
    this.error = error;
  }
};

export {
  ValidationError,
  UnknownOptionError,
  UnexpectedParameterError,
  CommandError,
  ParameterValidationError,
  VariadicParameterValidationError,
  ValidationResult,
};
