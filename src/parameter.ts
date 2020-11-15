import { VariadicParameterValidationError, ParameterValidationError, ValidationError } from "./validation";
import { BaseComponent, HelpParts } from "./utils";

/**
 * A parameter validator can return:
 *  - true if the parameter value is validated
 *  - false if the parameter value is not validated
 *  - an array of strings to check the parameter value with
 *  - a ValidationError instance if one wants to customise the error
 *  - a Promise of one of the above
 */
interface ParameterValidator {
  (value: string, otherArgumentValues: Record<string, unknown>): ValidationError|boolean|string[]|Promise<ValidationError|boolean|string[]>;
}

const generateSimpleValidator = (usage: string, allowedValues: string[]) => {
  const validator: ParameterValidator = (value: string) => {
    if (!allowedValues.includes(value)) {
      return Promise.resolve(
        new ParameterValidationError(usage, value, allowedValues)
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

  public async validate(otherArgumentValues: Record<string,unknown>, usageOverride?: string, forceToDefine = false): Promise<boolean|ValidationError> {
    const errors: ValidationError[] = [];
    const usage = usageOverride || this.getUsage()

    // If the instance's validator is an array, we generate a simple validator from it
    let validator: ParameterValidator
    if (this.validator instanceof Array) {
      validator = generateSimpleValidator(usage, this.validator);
    } else {
      const validatorResult = await this.validator(undefined, otherArgumentValues);
      if (validatorResult instanceof Array) {
        validator = generateSimpleValidator(usage, validatorResult);
      } else {
        validator = this.validator;
      }
    }

    for (const value of this.value) {
      const validationResult = await validator(value, otherArgumentValues);
      if (validationResult === false) {
        errors.push(new ParameterValidationError(usage, value));
      } else if (validationResult instanceof ValidationError) {
        errors.push(validationResult);
      }
    }

    if (forceToDefine && this.value.length === 0) {
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
    const name = this.getName() + (this.isVariadic() ? `...` : ``);
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
    } else {
      return this.value[this.value.length - 1];
    }
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
