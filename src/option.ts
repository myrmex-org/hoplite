import { MissingOptionError } from "./errors";
import { Parameter, ParameterArg } from "./parameter";
import BaseComponent from "./base-component";

interface OptionArg {
  short?: string;
  long?: string;
  parameter?: (Parameter|ParameterArg);
  mandatory?: boolean;
  description?: string;
}

class Option extends BaseComponent {
  private short: string;
  private long: string;
  private description: string;
  private mandatory: boolean;
  private parameter: Parameter;
  private value: boolean;

  constructor({
    short,
    long,
    description,
    mandatory = false,
    parameter,
  }: OptionArg) {
    super()
    this.short = short
    this.long = long
    this.description = description
    this.mandatory = mandatory
    if (parameter) {
      this.parameter = parameter instanceof Parameter ? parameter : new Parameter(parameter)
      this.parameter.setAsMandatory(true)
    }
  }

  public getShort() {
    return this.short
  }

  public getLong() {
    return this.long
  }

  public getName() {
    return this.long || this.short
  }

  public isMandatory() {
    return this.mandatory
  }

  public hasParameter() {
    return !!this.parameter
  }

  public getParameter() {
    return this.parameter
  }

  public acceptsMultipleValues() {
    return this.hasParameter() && this.parameter.isVariadic();
  }

  public setValue(value?: string) {
    if (!this.parameter) {
      this.value = true;
    } else {
      this.parameter.setValue(value)
    }
  }

  public getValue() {
    return this.hasParameter() ? this.parameter.getValue() : this.value
  }

  public async validate() {
    if (this.getValue() === undefined && this.isMandatory()) {
      this.errors.push(new MissingOptionError(this.getUsage()))
    } else if (this.parameter && this.getValue()) {
      if (!(await this.parameter.validate(this.getUsage()))) {
        this.errors = this.parameter.getErrors()
      }
    }
    return this.errors.length === 0
  }

  public getUsage(trim: boolean= false) {
    const usage = (this.short ? `-${this.short}${this.long ? ", " : "  "}` : "  ")
         + (this.long ? `--${this.long}` : "")
         + (this.parameter ? ` ${this.parameter.getUsage()}` : "");
    return trim ? usage.trim() : usage;
  }

  public getHelpParts() {
    return { usage: this.getUsage(), description: this.description };
  }

  public getAutoCompletion() {
    if (this.parameter) {
      return this.parameter.getAutoCompletion();
    }
  }
}

export default Option;
export { Option, OptionArg };
