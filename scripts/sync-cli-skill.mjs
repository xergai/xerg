import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, 'skills', 'xerg', 'SKILL.md');
const destination = join(root, 'packages', 'cli', 'skills', 'xerg', 'SKILL.md');

if (!existsSync(source)) {
  throw new Error(`Cannot find canonical skill file at ${source}`);
}

mkdirSync(dirname(destination), { recursive: true });
copyFileSync(source, destination);

process.stdout.write(`Synced ${source} -> ${destination}\n`);
