import {
  VariadicParameterValidationError,
  ParameterValidationError,
  ValidationError,
  MandatoryParameterError,
} from './validation';
import { BaseComponent, HelpParts } from './base-component';

/**
 * A parameter validator can return:
 *  - true if the parameter value is validated
 *  - false if the parameter value is not validated
 *  - an array of strings to check the parameter value with
 *  - a ValidationError instance if one wants to customise the error
 *  - a Promise of one of the above
 */
interface ParameterValidator {
  (value: string, otherArgumentValues: Record<string, unknown>):
  ValidationError|boolean|string[]|Promise<ValidationError|boolean|string[]>;
}

const generateSimpleValidator = (usage: string, allowedValues: string[]) => {
  const validator: ParameterValidator = (value: string) => {
    if (!allowedValues.includes(value)) {
      return Promise.resolve(
        new ParameterValidationError(usage, value, allowedValues),
      );
    }
    return Promise.resolve(true);
  };
  return validator;
};

interface ParameterArg {
  name: string;
  description?: string;
  mandatory?: boolean;
  variadic?: boolean;
  validator?: string[]|ParameterValidator;
}

class Parameter extends BaseComponent {
  protected name: string;

  protected description: string;

  protected mandatory: boolean;

  protected variadic: boolean;

  protected validator: string[]|ParameterValidator;

  protected value: string[];

  constructor({
    name,
    description,
    mandatory = false,
    variadic = false,
    validator = () => Promise.resolve(true),
  }: ParameterArg) {
    super();
    this.name = name;
    this.description = description;
    this.mandatory = mandatory;
    this.variadic = variadic;
    this.validator = validator;
    this.value = [];
  }

  public getName(): string {
    return this.name;
  }

  public isMandatory(): boolean {
    return this.mandatory;
  }

  public setAsMandatory(value: boolean): void {
    this.mandatory = value;
  }

  public isVariadic(): boolean {
    return this.variadic;
  }

  public async validate(
    otherArgumentValues: Record<string, unknown>,
    optionUsage?: string,
  ): Promise<true|ValidationError> {
    const errors: ValidationError[] = [];
    const usage = optionUsage || this.getUsage();

    // Check if the parameter is mandatory and set
    // We exclude the case of a parameter linked to an option
    if (!optionUsage && !this.isSet() && this.isMandatory()) {
      return new MandatoryParameterError(usage);
    }

    let validator: ParameterValidator;
    if (this.validator instanceof Array) {
      // If the instance's validator is an array, we generate a simple validator from it
      validator = generateSimpleValidator(usage, this.validator);
    } else {
      // If the instance's validator is a function,
      // we execute it and receive the result in a Promise
      const validatorResult = await this.validator(undefined, otherArgumentValues);
      if (validatorResult instanceof Array) {
        // If the result of the Promise is an array, we generate a simple validator from it
        validator = generateSimpleValidator(usage, validatorResult);
      } else {
        // Otherwise, we use the function as the validator
        validator = this.validator;
      }
    }

    const validationResults = await Promise.all(
      this.value.map(async (v) => {
        const result = await validator(v, otherArgumentValues);
        return {
          value: v,
          result,
        };
      }),
    );
    validationResults.forEach((vr) => {
      if (vr.result === false) {
        errors.push(new ParameterValidationError(usage, vr.value));
      } else if (vr.result instanceof ValidationError) {
        errors.push(vr.result);
      }
    });

    // If the parameter is linked to an option and has no value
    if (optionUsage && this.value.length === 0) {
      const validationResult = await validator(undefined, otherArgumentValues);
      if (validationResult === true) {
        errors.push(new ParameterValidationError(usage, undefined));
      } else if (validationResult instanceof ValidationError) {
        errors.push(validationResult);
      }
    }

    if (errors.length > 0) {
      if (this.isVariadic() && errors.length > 1) {
        return new VariadicParameterValidationError(usage, errors);
      }
      return errors[errors.length - 1];
    }
    return true;
  }

  public getUsage(): string {
    const name = this.getName() + (this.isVariadic() ? '...' : '');
    if (this.isMandatory()) {
      return `<${name}>`;
    }
    return `[${name}]`;
  }

  public getHelpParts(): HelpParts {
    return { usage: this.getUsage(), description: this.description };
  }

  public setValue(value: string): void {
    this.value.push(value);
  }

  public getValue(): string|string[] {
    if (this.isVariadic()) {
      return this.value;
    }
    return this.value[this.value.length - 1];
  }

  public isSet(): boolean {
    if (this.isVariadic()) {
      return this.getValue().length > 0;
    }
    return this.getValue() !== undefined;
  }

  public toString(): string {
    return `Parameter ${this.getUsage()}`;
  }
}

export default Parameter;
export { Parameter, ParameterArg, ParameterValidator };
