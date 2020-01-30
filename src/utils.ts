import { ValidationResult } from "./validation";

let indentation: string = `  `;
let colorEnabled: boolean = true;

function setIndentation(newIndentation: string) {
  indentation = newIndentation;
}

function getIndentation() {
  return indentation;
}

function enableColors(enabled: boolean = true) {
  colorEnabled = enabled;
}

const format = {
  cmd:     (msg: string) => format.custom(msg, "\x1b[33m"), // Yellow
  info:    (msg: string) => format.custom(msg, "\x1b[36m"), // Cyan
  error:   (msg: string) => format.custom(msg, "\x1b[31m"), // Red
  success: (msg: string) => format.custom(msg, "\x1b[32m"), // Green
  custom:  (msg: string, code: string) => {
    return colorEnabled ? code + msg + "\x1b[0m" : msg;
  },
  // aliases
  ko: (msg: string) => format.error(msg),
  ok: (msg: string) => format.success(msg),
};

interface HelpParts {
  usage: string;
  description?: string;
}

abstract class BaseComponent {
  public abstract getHelpParts(): HelpParts;
  public abstract validate(): Promise<ValidationResult>;
}

export { format, enableColors, setIndentation, getIndentation, BaseComponent };
