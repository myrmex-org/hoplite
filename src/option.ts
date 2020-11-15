import { Parameter, ParameterArg } from './parameter';
import { BaseComponent, HelpParts } from './base-component';
import { MandatoryOptionError, ValidationError } from './validation';

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

  constructor({
    short,
    long,
    description,
    mandatory = false,
    parameter,
  }: OptionArg) {
    if (!short && !long) {
      throw new Error('An option should have a least one short name or one long name.');
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
    this.value = undefined;
  }

  public setValue(argv: string[]): void {
    if (this.parameter && argv.length !== 0) {
      this.parameter.setValue(argv.shift());
    }
    this.value = true;
  }

  public getValue(): boolean|string|string[] {
    if (this.parameter) {
      return this.parameter.getValue();
    }
    return this.value;
  }

  public isSet(): boolean {
    return this.value !== undefined;
  }

  public hasParameter(): boolean {
    return this.parameter instanceof Parameter;
  }

  public getShort(): string {
    return this.short;
  }

  public getLong(): string {
    return this.long;
  }

  public getName(): string {
    return this.long || this.short;
  }

  public isMandatory(): boolean {
    return this.mandatory;
  }

  public doesAcceptMultipleValues(): boolean {
    return !!(this.parameter && this.parameter.isVariadic());
  }

  public async validate(
    otherArgumentValues?: Record<string, unknown>,
  ): Promise<true|ValidationError> {
    if (!this.isSet() && this.isMandatory()) {
      return new MandatoryOptionError(this.getUsage());
    }
    if (this.isSet() && this.parameter) {
      return this.parameter.validate(
        otherArgumentValues,
        this.getUsage(),
      );
    }
    return true;
  }

  public getUsage(): string {
    let usage = '';
    if (this.short) {
      usage += `-${this.short}`;
      if (this.long) {
        usage += ', ';
      }
    }
    if (this.long) {
      usage += `--${this.long}`;
    }
    if (this.parameter) {
      usage += ` ${this.parameter.getUsage()}`;
    }
    return usage;
  }

  public getHelpParts(): HelpParts {
    return { usage: this.getUsage(), description: this.description };
  }

  public toString(): string {
    return `Option ${this.getUsage()}`;
  }
}

export default Option;
export { Option, OptionArg };
