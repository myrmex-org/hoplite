import { ParameterValidationError } from "./errors";
import { HelpComponent } from "./utils";

type ParameterValidator = (parameterValue: string, parameterKey?: string, parseResult?: any) => Promise<boolean>;

const simpleValidator = (allowedValues: string[]) => {
  const validator: ParameterValidator = (parameterValue: string, parameterKey: string) => {
    if (!allowedValues.includes(parameterValue)) {
      return Promise.reject(new ParameterValidationError(parameterValue, parameterKey, allowedValues));
    }
    return Promise.resolve(true);
  };
  return validator;
};

type AllowedValuesRetriever = () => Promise<string[]>;

interface ParameterArg {
  name: string;
  description?: string;
  mandatory?: boolean;
  variadic?: boolean;
  validator?: ParameterValidator;
  getAllowedValues?: AllowedValuesRetriever;
}

class Parameter implements HelpComponent {
  public name: string;
  public description: string;
  public mandatory: boolean;
  public variadic: boolean;
  public validator: ParameterValidator;
  public getAllowedValues: AllowedValuesRetriever;

  constructor({
    name,
    description,
    mandatory = false,
    variadic = false,
    validator = () => Promise.resolve(true),
    getAllowedValues = () => Promise.resolve([]),
  }: ParameterArg) {
    this.name = name;
    this.description = description;
    this.mandatory = mandatory;
    this.variadic = variadic;
    this.validator = validator;
    this.getAllowedValues = getAllowedValues;
  }

  public getName() {
    return this.name;
  }

  public isMandatory() {
    return this.mandatory;
  }

  public isVariadic() {
    return this.variadic;
  }

  public validate(value: string, usage?: string, parseResult?: any) {
    return this.validator(value, usage || this.getUsage(), parseResult);
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

  public getAutoCompletion() {
    return this.getAllowedValues();
  }
}

export default Parameter;
export { Parameter, ParameterArg, ParameterValidator, simpleValidator };
