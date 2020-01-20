import { HopliteError, ParameterValidationError } from "./errors";
import { Parameter, ParameterArg } from "./parameter";
import { HelpComponent } from "./utils";

interface OptionArg {
  short?: string;
  long?: string;
  parameter?: (Parameter|ParameterArg);
  mandatory?: boolean;
  description?: string;
}

class Option implements HelpComponent {
  public short?: string;
  public long?: string;
  public description?: string;
  public mandatory?: boolean;
  public parameter?: Parameter;
  public value: boolean;

  constructor({
    short,
    long,
    description,
    mandatory = false,
    parameter,
  }: OptionArg) {
    if (!short && !long) {
      throw new HopliteError("An option should have a least one short name or one long name.")
    }
    this.short = short;
    this.long = long;
    this.description = description;
    this.mandatory = mandatory;
    if (parameter) {
      this.parameter = parameter instanceof Parameter ? parameter : new Parameter(parameter);
    }
    this.value = false;
  }

  public async resolve(argv: string[], parseResult: any) {
    if (!this.parameter) {
      return true;
    }
    const parameterValue = argv.shift();
    if (await this.parameter.validate(parameterValue, this.getUsage(), parseResult)) {
      return parameterValue;
    } else {
      throw new ParameterValidationError(parameterValue, this.getUsage(true));
    }
  }

  public setValue(argv: string[]) {
    if (!this.parameter) {
      this.value = true;
    }
    this.parameter.setValue(argv.shift());
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

  public getUsage(trim: boolean= false) {
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
}

export default Option;
export { Option, OptionArg };
