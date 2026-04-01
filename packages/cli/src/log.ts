export interface CliLogger {
  info: (message: string) => void;
  verbose: (message: string) => void;
}

export function createCliLogger(options: { verbose?: boolean }): CliLogger {
  return {
    info(message: string) {
      process.stderr.write(`${message}\n`);
    },
    verbose(message: string) {
      if (!options.verbose) {
        return;
      }

      process.stderr.write(`[verbose] ${message}\n`);
    },
  };
}
