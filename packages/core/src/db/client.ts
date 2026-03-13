import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';

import { SCHEMA_SQL } from './schema.js';

export function createDb(path: string) {
  mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  sqlite.exec(SCHEMA_SQL);

  return { sqlite };
}
