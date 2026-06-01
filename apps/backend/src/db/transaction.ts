import postgres from 'postgres';

import { requireEnv } from '../config/env.js';

let _sql: postgres.Sql | undefined;

function getSql(): postgres.Sql {
  if (!_sql) {
    _sql = postgres(requireEnv('DATABASE_URL'));
  }
  return _sql;
}

export type TransactionSql = postgres.TransactionSql;

/**
 * Executes fn inside a single atomic BEGIN/COMMIT block.
 * If fn throws, the transaction is rolled back and the error is re-thrown unchanged.
 * Uses a module-level connection pool shared across the process lifetime.
 */
export async function withTransaction<T>(
  fn: (sql: TransactionSql) => Promise<T>,
): Promise<T> {
  // postgres.js wraps the return in its own UnwrapPromiseArray<T> type,
  // which is structurally identical to T for all practical result shapes.
  return getSql().begin(fn) as Promise<T>;
}
