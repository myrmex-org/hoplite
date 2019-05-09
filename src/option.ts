import { ParameterValidationError } from "./errors";
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

  constructor({
    short,
    long,
    description,
    mandatory = false,
    parameter,
  }: OptionArg) {
    this.short = short;
    this.long = long;
    this.description = description;
    this.mandatory = mandatory;
    if (parameter) {
      this.parameter = parameter instanceof Parameter ? parameter : new Parameter(parameter);
    }
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

  public getName() {
    return this.long || this.short;
  }

  public isMandatory() {
    return this.mandatory;
  }

  public doesAcceptMultipleValues() {
    return this.parameter && this.parameter.isVariadic();
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
}

export default Option;
export { Option, OptionArg };
