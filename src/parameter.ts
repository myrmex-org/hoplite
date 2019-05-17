import { HopliteError, MissingParameterError, ParameterValidationError, MultipleParameterValidationError } from "./errors";
import BaseComponent from "./base-component";

type ParameterValidator = (parameterValue: string, usageDisplay?: string) => Promise<boolean>;

const simpleValidator = (allowedValuesPromise: Promise<string[]>) => {
  const validator: ParameterValidator = async (parameterValue: string, usageDisplay: string) => {
    const allowedValues = await allowedValuesPromise
    if (!allowedValues.includes(parameterValue)) {
      return Promise.reject(new ParameterValidationError(parameterValue, usageDisplay, allowedValues))
    }
    return Promise.resolve(true)
  };
  return validator
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

class Parameter extends BaseComponent {
  private name: string;
  private description: string;
  private mandatory: boolean;
  private variadic: boolean;
  private getAllowedValues: AllowedValuesRetriever;
  private validator: ParameterValidator;
  private value: string[] = [];

  constructor({
    name,
    description,
    mandatory = false,
    variadic = false,
    getAllowedValues,
    validator,
  }: ParameterArg) {
    super()
    this.name = name
    this.description = description
    this.mandatory = mandatory
    this.variadic = variadic
    this.getAllowedValues = getAllowedValues || (() => Promise.resolve([]))
    if (!validator) {
      this.validator = getAllowedValues ? simpleValidator(this.getAllowedValues()) : () => Promise.resolve(true)
    } else {
      this.validator = validator
    }
  }

  public getName() {
    return this.name
  }

  public setAsMandatory(isMandatory: boolean) {
    this.mandatory = isMandatory
  }
  
  public isMandatory() {
    return this.mandatory
  }

  public isVariadic() {
    return this.variadic
  }

  public setValue(value: string) {
    if (this.isVariadic()) {
      this.value.push(value)
    } else {
      this.value = [value]
    }
  }

  public getValue() {
    if (this.value.length === 0) {
      return undefined
    }
    return this.isVariadic() ? this.value : this.value[0]
  }

  public async validate(usageDisplay?: string) {
    if (this.getValue() === undefined && this.isMandatory()) {
      this.errors.push(new MissingParameterError(this.getUsage()))
    }
    const errorUsageDisplay = usageDisplay || `parameter ${this.getUsage()}`
    const parameterValidationErrors: ParameterValidationError[] = []
    await Promise.all(this.value.map(async (value) => {
      try {
        await this.validator(value, errorUsageDisplay)
      } catch (err) {
        if (err instanceof ParameterValidationError) {
          parameterValidationErrors.push(err)
        } else if (err instanceof HopliteError) {
          this.errors.push(err)
        } else {
          throw err
        }
      }
    }))
    if (parameterValidationErrors.length) {
      const allowedValues = await this.getAllowedValues()
      this.errors.push(new MultipleParameterValidationError(this.getName(), parameterValidationErrors, allowedValues))
    }
    return this.errors.length === 0
  }

  public getUsage() {
    const name = this.getName() + (this.isVariadic() ? `...` : ``)
    if (this.isMandatory()) {
      return `<${name}>`
    }
    return `[${name}]`
  }

  public getHelpParts() {
    return { usage: this.getUsage(), description: this.description }
  }

  public getAutoCompletion() {
    return this.getAllowedValues()
  }
}

export default Parameter;
export { Parameter, ParameterArg, ParameterValidator, simpleValidator };
