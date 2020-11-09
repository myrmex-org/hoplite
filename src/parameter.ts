import { VariadicParameterValidationError, ParameterValidationError, ValidationError } from "./validation";
import { BaseComponent } from "./utils";

type ParameterValidator = (value: string, otherArgumentValues?: any) => ValidationError|boolean|Promise<ValidationError|boolean>;

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
  validator?: ParameterValidator|string[];
}

class Parameter extends BaseComponent {
  public name: string;
  public description: string;
  public mandatory: boolean;
  public variadic: boolean;
  public validator: ParameterValidator|string[];
  public value: string[];

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

  public async validate(otherArgumentValues: any, usageOverride?: string) {
    const errors: ValidationError[] = [];
    const usage = usageOverride || this.getUsage()
    
    // If the instance's validator is an array, we generate a simple validator from it
    const validator = this.validator instanceof Array
                    ? generateSimpleValidator(usage, this.validator)
                    : this.validator;

    for (const value of this.value) {
      let validationResult = await validator(value, otherArgumentValues);
      if (validationResult === false) {
        errors.push(new ParameterValidationError(usage, value));
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
export { Parameter, ParameterArg, ParameterValidator };
