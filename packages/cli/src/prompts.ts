import { confirm, select } from '@inquirer/prompts';

export interface PromptChoice<T> {
  name: string;
  value: T;
  description?: string;
}

export function hasPromptTty(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

export async function promptConfirm(message: string, defaultValue = true): Promise<boolean> {
  return confirm({
    message,
    default: defaultValue,
  });
}

export async function promptSelect<T>(message: string, choices: PromptChoice<T>[]): Promise<T> {
  return select({
    message,
    choices,
  });
}
