import { VariadicParameterValidationError, ParameterValidationError, ValidationError, ValidationResult } from "./validation";
import { BaseComponent } from "./utils";

type ParameterValidator = (value: string, usage: string, otherCommandArgumentValues?: object) => Promise<ValidationResult|boolean>;

const generateSimpleValidator = (allowedValues: string[]) => {
  const validator: ParameterValidator = (value: string, usage: string) => {
    if (!allowedValues.includes(value)) {
      return Promise.resolve(
        new ValidationResult(false, new ParameterValidationError(usage, value, allowedValues))
      );
    }
    return Promise.resolve(new ValidationResult(true));
  };
  return validator;
};

type AllowedValuesRetriever = (otherCommandArgumentValues: object) => Promise<string[]>;

interface ParameterArg {
  name: string;
  description?: string;
  mandatory?: boolean;
  variadic?: boolean;
  validator?: ParameterValidator;
  getAllowedValues?: AllowedValuesRetriever;
}

class Parameter extends BaseComponent {
  public name: string;
  public description: string;
  public mandatory: boolean;
  public variadic: boolean;
  public validator: ParameterValidator;
  public getAllowedValues: AllowedValuesRetriever;
  public value: string[];

  constructor({
    name,
    description,
    mandatory = false,
    variadic = false,
    validator = () => Promise.resolve({ success: true }),
    getAllowedValues = () => Promise.resolve([]),
  }: ParameterArg) {
    super();
    this.name = name;
    this.description = description;
    this.mandatory = mandatory;
    this.variadic = variadic;
    this.validator = validator;
    this.getAllowedValues = getAllowedValues;
    this.value = [];
  }

  public getName() {
    return this.name;
  }

  public isMandatory() {
    return this.mandatory;
  }

  public setAsMandatory(value: boolean) {
    this.mandatory = value;
  }

  public isVariadic() {
    return this.variadic;
  }

  public async validate(usage?: string, otherCommandArgumentValues?: object) {
    const errors: ValidationError[] = [];
    usage = usage || this.getUsage()
    for (const value of this.value) {
      let validationResult = await this.validator(value, usage, otherCommandArgumentValues);
      if (typeof validationResult === 'boolean') {
        validationResult = { success: validationResult };
      }
      if (validationResult.success === false) {
        if (validationResult.error) {
          errors.push(validationResult.error);
        } else {
          errors.push(new ParameterValidationError(usage, value));
        }
      }
    }
    if (errors.length > 0) {
      if (this.isVariadic() && errors.length > 1) {
        return new ValidationResult(false, new VariadicParameterValidationError(usage, errors));
      }
      return new ValidationResult(false, errors[errors.length - 1]);
    }
    return new ValidationResult(true);
  }

  public getUsage() {
    const name = this.getName() + (this.isVariadic() ? `...` : ``);
    if (this.isMandatory()) {
      return `<${name}>`;
    }
    return `[${name}]`;
  }

  public getHelpParts() {
    return { usage: this.getUsage(), description: this.description };
  }

  public setValue(value: string) {
    this.value.push(value);
    return this;
  }

  public getValue() {
    if (this.isVariadic()) {
      return this.value;
    } else {
      return this.value[this.value.length - 1];
    }
  }

  public hasValue() {
    if (this.isVariadic()) {
      return this.getValue().length > 0;
    }
    return this.getValue() !== undefined;
  }

  public toString() {
    return `Parameter ${this.getUsage()}`;
  }
}

export default Parameter;
export { Parameter, ParameterArg, ParameterValidator, generateSimpleValidator };
