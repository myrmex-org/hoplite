import { Parameter, ParameterArg } from "./parameter";
import { BaseComponent } from "./utils";

interface OptionArg {
  short?: string;
  long?: string;
  parameter?: (Parameter|ParameterArg);
  mandatory?: boolean;
  description?: string;
}

class Option extends BaseComponent {
  protected short?: string;
  protected long?: string;
  protected description?: string;
  protected mandatory?: boolean;
  protected parameter?: Parameter;
  protected value: boolean;
  protected setWithoutParameter: boolean;

  constructor({
    short,
    long,
    description,
    mandatory = false,
    parameter,
  }: OptionArg) {
    if (!short && !long) {
      throw new Error("An option should have a least one short name or one long name.")
    }
    super();
    this.short = short;
    this.long = long;
    this.description = description;
    this.mandatory = mandatory;
    if (parameter) {
      this.parameter = parameter instanceof Parameter ? parameter : new Parameter(parameter);
      this.parameter.setAsMandatory(true);
    }
    this.value = false;
    this.setWithoutParameter = false;
  }

  public setValue(argv: string[]) {
    if (this.parameter) {
      if (argv.length === 0) {
        this.setWithoutParameter = true;
      } else {
        this.parameter.setValue(argv.shift());
      }
    } else {
      this.value = true;
    }
  }

  public getValue() {
    if (this.parameter) {
      return this.parameter.getValue();
    }
    return this.value;
  }

  public isSet() {
    if (this.parameter) {
      return this.setWithoutParameter || this.parameter.isSet();
    }
    return this.value !== undefined;
  }

  public hasParameter() {
    return this.parameter instanceof Parameter;
  }

  public getShort() {
    return this.short;
  }

  public getLong() {
    return this.long;
  }

  public getName() {
    return this.long || this.short;
  }

  public isMandatory() {
    return this.mandatory;
  }

  public doesAcceptMultipleValues() {
    return !!(this.parameter && this.parameter.isVariadic());
  }

  public async validate(otherArgumentValues?: any) {
    if (this.parameter) {
      return this.parameter.validate(otherArgumentValues, this.getUsage(), this.setWithoutParameter);
    }
    return true;
  }

  public getUsage() {
    let usage = "";
    if (this.short) {
      usage += `-${this.short}`;
      if (this.long) {
        usage += ", ";
      }
    }
    if (this.long) {
      usage += `--${this.long}`
    }
    if (this.parameter) {
      usage += ` ${this.parameter.getUsage()}`;
    }
    return usage;
  }

  public getHelpParts() {
    return { usage: this.getUsage(), description: this.description };
  }

  public toString() {
    return `Option ${this.getUsage()}`;
  }
}

export default Option;
export { Option, OptionArg };
