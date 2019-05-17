import { HopliteError } from "./errors";

interface HelpParts {
  usage: string
  description?: string
}
  
abstract class BaseComponent {
  
  protected errors: HopliteError[] = []

  public getErrors(): HopliteError[] {
    return this.errors;
  }

  public abstract getHelpParts(): HelpParts

  public abstract getName(): string

}

export default BaseComponent
export { BaseComponent }
