let indentation = '  ';
let colorEnabled = true;

/**
 * Set the patern used for indentation
 * It should be a number of spaces or of tabs
 */
function setIndentation(newIndentation: string): void {
  indentation = newIndentation;
}

/**
 * Get the patern used for indentation
 */
function getIndentation(): string {
  return indentation;
}

/**
 * Enable / disable colors in the console
 */
function enableColors(enabled = true): void {
  colorEnabled = enabled;
}

/**
 * Object providing helpers to apply color codes to strings displayed in the console
 */
const format = {
  cmd: (msg: string): string => format.custom(msg, '\x1b[33m'), // Yellow
  info: (msg: string): string => format.custom(msg, '\x1b[36m'), // Cyan
  error: (msg: string): string => format.custom(msg, '\x1b[31m'), // Red
  success: (msg: string): string => format.custom(msg, '\x1b[32m'), // Green
  custom: (msg: string, code: string): string => (colorEnabled ? `${code + msg}\x1b[0m` : msg),
  // aliases
  ko: (msg: string): string => format.error(msg),
  ok: (msg: string): string => format.success(msg),
};

/**
 * We wrap some NodeJS process methods because we want to be able to mock them
 * without mocking calls from other libraries
 */
const hProcess = {

  writeStdOut(s: string): boolean {
    return process.stdout.write(s);
  },

  writeStdErr(s: string): boolean {
    return process.stderr.write(s);
  },

  exit(code: number): never {
    return process.exit(code);
  },

};

export {
  setIndentation,
  getIndentation,
  enableColors,
  format,
  hProcess,
};
