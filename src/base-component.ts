import { ValidationError } from './validation';

/**
 * The "help" provided for an option, a parameter or a subcommand is composed
 * of its usage (left part) and its description (right part)
 */
interface HelpParts {
  usage: string;
  description?: string;
}

/**
 * Base contract and common methods for command line components
 * It must provide help parts and a validation method
 */
abstract class BaseComponent {
  protected description?: string;

  public abstract getHelpParts(): HelpParts;

  public abstract validate(
    otherArgumentValues: Record<string, unknown>,
    usageOverride?: string
  ): Promise<boolean|ValidationError>;

  public setDescription(description: string): BaseComponent {
    this.description = description;
    return this;
  }

  public getDescription(): string {
    return this.description;
  }
}

export {
  BaseComponent,
  HelpParts,
};
