import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';

import { SCHEMA_SQL, SCHEMA_VERSION } from './schema.js';

type SqliteDatabase = InstanceType<typeof Database>;

export interface DbClient {
  sqlite: SqliteDatabase;
}

export function createDb(path: string): DbClient {
  mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  const currentVersion = sqlite.pragma('user_version', { simple: true }) as number;

  if (currentVersion > SCHEMA_VERSION) {
    sqlite.close();
    throw new Error(
      `Unsupported Xerg database schema version ${currentVersion}. This build supports up to ${SCHEMA_VERSION}.`,
    );
  }

  sqlite.exec(SCHEMA_SQL);
  if (currentVersion < SCHEMA_VERSION) {
    sqlite.pragma(`user_version = ${SCHEMA_VERSION}`);
  }

  return { sqlite };
}
