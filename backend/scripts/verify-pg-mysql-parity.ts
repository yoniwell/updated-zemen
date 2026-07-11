import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Client as PgClient } from 'pg';
import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';

type SourceCountRow = { count: string };

type MysqlCountRow = RowDataPacket & { count: number | string };

type MysqlExistsRow = RowDataPacket & { c: number };

type BoolEnv = 'true' | 'false';

const resolveBackendRoot = (): string => {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), 'backend'),
    path.resolve(__dirname, '..'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'package.json')) && fs.existsSync(path.join(candidate, 'prisma'))) {
      return candidate;
    }
  }

  return path.resolve(__dirname, '..');
};

const BACKEND_ROOT = resolveBackendRoot();

const loadEnv = (): void => {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'backend', '.env'),
    path.resolve(BACKEND_ROOT, '.env'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
      return;
    }
  }
};

loadEnv();

const SOURCE_URL = process.env.POSTGRES_MIGRATION_URL || '';
const TARGET_URL = process.env.MYSQL_MIGRATION_URL || process.env.DATABASE_URL || '';
const TABLE_FILTER = process.env.MIGRATION_TABLES || '';
const EXCLUDED_TABLES = new Set((process.env.MIGRATION_EXCLUDE_TABLES || '_prisma_migrations').split(',').map((item) => item.trim()).filter(Boolean));
const FAIL_ON_MISMATCH = ((process.env.MIGRATION_FAIL_ON_MISMATCH || 'true') as BoolEnv) === 'true';

const parseFilter = (value: string): Set<string> => {
  return new Set(value.split(',').map((item) => item.trim()).filter(Boolean));
};

const selectedTables = parseFilter(TABLE_FILTER);

const pgQuote = (identifier: string): string => `"${identifier.replace(/"/g, '""')}"`;
const mysqlQuote = (identifier: string): string => `\`${identifier.replace(/`/g, '``')}\``;

const parseCount = (value: unknown): number => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return Number.parseInt(value, 10);
  }
  return 0;
};

const describeTarget = (url: string): string => {
  try {
    const parsed = new URL(url);
    const database = parsed.pathname.replace(/^\//, '') || '(default)';
    const defaultPort = parsed.protocol.startsWith('postgres') ? '5432' : '3306';
    const port = parsed.port || defaultPort;
    return `${parsed.protocol}//${parsed.hostname}:${port}/${database}`;
  } catch {
    return 'configured database target';
  }
};

const formatError = (error: unknown): string => {
  if (!error || typeof error !== 'object') {
    return String(error);
  }

  const value = error as { message?: string; code?: string; errno?: number; sqlState?: string };
  const base = value.message || 'Unknown database error';
  const details = [
    value.code ? `code=${value.code}` : '',
    typeof value.errno === 'number' ? `errno=${value.errno}` : '',
    value.sqlState ? `sqlState=${value.sqlState}` : '',
  ].filter((item) => item.length > 0);

  return details.length > 0 ? `${base} (${details.join(', ')})` : base;
};

const assertPostgresUrl = (url: string): void => {
  const normalized = url.toLowerCase();
  if (!normalized.startsWith('postgres://') && !normalized.startsWith('postgresql://')) {
    throw new Error('POSTGRES_MIGRATION_URL must be a postgres:// or postgresql:// URL.');
  }
};

const assertMySqlUrl = (url: string): void => {
  const normalized = url.toLowerCase();
  if (!normalized.startsWith('mysql://') && !normalized.startsWith('mysqls://')) {
    throw new Error('MYSQL_MIGRATION_URL (or DATABASE_URL) must be a mysql:// URL.');
  }
};

const assertRequiredEnv = (): void => {
  if (!SOURCE_URL) {
    throw new Error('Missing POSTGRES_MIGRATION_URL.');
  }
  if (!TARGET_URL) {
    throw new Error('Missing MYSQL_MIGRATION_URL (or DATABASE_URL).');
  }

  assertPostgresUrl(SOURCE_URL);
  assertMySqlUrl(TARGET_URL);
};

const getSourceTables = async (pg: PgClient): Promise<string[]> => {
  const rows = await pg.query<{ table_name: string }>(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC`
  );

  return rows.rows
    .map((row) => row.table_name)
    .filter((table) => !EXCLUDED_TABLES.has(table))
    .filter((table) => selectedTables.size === 0 || selectedTables.has(table));
};

const sourceCount = async (pg: PgClient, table: string): Promise<number> => {
  const result = await pg.query<SourceCountRow>(`SELECT COUNT(*)::text AS count FROM ${pgQuote(table)}`);
  return parseCount(result.rows[0]?.count || '0');
};

const targetCount = async (mysqlConn: mysql.Connection, table: string): Promise<number> => {
  const [rows] = await mysqlConn.query<MysqlCountRow[]>(`SELECT COUNT(*) AS count FROM ${mysqlQuote(table)}`);
  return parseCount(rows[0]?.count || 0);
};

const hasTargetTable = async (mysqlConn: mysql.Connection, table: string): Promise<boolean> => {
  const [rows] = await mysqlConn.query<MysqlExistsRow[]>(
    `SELECT COUNT(*) AS c
       FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?`,
    [table]
  );

  return Number(rows[0]?.c || 0) > 0;
};

const run = async (): Promise<void> => {
  assertRequiredEnv();

  const pg = new PgClient({ connectionString: SOURCE_URL });
  let mysqlConn: mysql.Connection | null = null;

  try {
    try {
      mysqlConn = await mysql.createConnection(TARGET_URL);
    } catch (error) {
      throw new Error(`Unable to connect to ${describeTarget(TARGET_URL)}: ${formatError(error)}`);
    }

    try {
      await pg.connect();
    } catch (error) {
      throw new Error(`Unable to connect to ${describeTarget(SOURCE_URL)}: ${formatError(error)}`);
    }

    if (!mysqlConn) {
      throw new Error('MySQL connection is not initialized.');
    }

    const mysqlConnection = mysqlConn;

    const tables = await getSourceTables(pg);
    if (tables.length === 0) {
      console.log('No tables matched verification filters.');
      return;
    }

    const mismatches: Array<{ table: string; source: number; target: number; note?: string }> = [];

    for (const table of tables) {
      const exists = await hasTargetTable(mysqlConnection, table);
      if (!exists) {
        mismatches.push({ table, source: 0, target: 0, note: 'Missing target table' });
        console.log(`- ${table}: missing in target database`);
        continue;
      }

      const [source, target] = await Promise.all([
        sourceCount(pg, table),
        targetCount(mysqlConnection, table),
      ]);

      const status = source === target ? 'OK' : 'MISMATCH';
      console.log(`- ${table}: ${status} source=${source} target=${target}`);

      if (source !== target) {
        mismatches.push({ table, source, target });
      }
    }

    if (mismatches.length > 0) {
      console.log('');
      console.log('Parity check mismatches:');
      for (const item of mismatches) {
        const note = item.note ? ` note=${item.note}` : '';
        console.log(`  ${item.table}: source=${item.source} target=${item.target}${note}`);
      }

      if (FAIL_ON_MISMATCH) {
        throw new Error(`Parity verification failed for ${mismatches.length} table(s).`);
      }
    }

    console.log('PostgreSQL/MySQL parity verification completed.');
  } finally {
    await pg.end().catch(() => undefined);

    if (mysqlConn) {
      await mysqlConn.end().catch(() => undefined);
    }
  }
};

run().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  process.exit(1);
});
