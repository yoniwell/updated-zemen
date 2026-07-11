import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Client as PgClient } from 'pg';
import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';

type TableSummary = {
  table: string;
  sourceCount: number;
  targetCount: number;
  copiedRows: number;
  status: 'copied' | 'skipped' | 'failed';
  note?: string;
};

type SourceCountRow = { count: string };

type ColumnRow = { column_name: string };

type MysqlColumnRow = RowDataPacket & { COLUMN_NAME: string };

type MysqlCountRow = RowDataPacket & { count: number | string };

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
const CHUNK_SIZE = Number.parseInt(process.env.MIGRATION_CHUNK_SIZE || '1000', 10);
const TRUNCATE_TARGET = ((process.env.MIGRATION_TRUNCATE_TARGET || 'false') as BoolEnv) === 'true';
const UPSERT = ((process.env.MIGRATION_UPSERT || 'true') as BoolEnv) === 'true';
const STOP_ON_ERROR = ((process.env.MIGRATION_STOP_ON_ERROR || 'true') as BoolEnv) === 'true';
const DRY_RUN = ((process.env.MIGRATION_DRY_RUN || 'false') as BoolEnv) === 'true';
const ALLOW_DESTRUCTIVE = ((process.env.ALLOW_DESTRUCTIVE_MIGRATION || 'false') as BoolEnv) === 'true';

const parseFilter = (value: string): Set<string> => {
  return new Set(value.split(',').map((item) => item.trim()).filter(Boolean));
};

const selectedTables = parseFilter(TABLE_FILTER);

const mysqlQuote = (identifier: string): string => `\`${identifier.replace(/`/g, '``')}\``;

const pgQuote = (identifier: string): string => `"${identifier.replace(/"/g, '""')}"`;

const normalizeValue = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Buffer.isBuffer(value)) {
    return value;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return value;
};

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

const createInsertSql = (table: string, columns: string[], rowCount: number, upsertColumns: string[]): string => {
  const cols = columns.map(mysqlQuote).join(', ');
  const rowPlaceholders = new Array(rowCount).fill(`(${columns.map(() => '?').join(', ')})`).join(', ');
  let sql = `INSERT INTO ${mysqlQuote(table)} (${cols}) VALUES ${rowPlaceholders}`;

  if (UPSERT && upsertColumns.length > 0) {
    sql += ` ON DUPLICATE KEY UPDATE ${upsertColumns.map((col) => `${mysqlQuote(col)} = VALUES(${mysqlQuote(col)})`).join(', ')}`;
  }

  return sql;
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

  if (TRUNCATE_TARGET && !ALLOW_DESTRUCTIVE) {
    throw new Error('MIGRATION_TRUNCATE_TARGET=true requires ALLOW_DESTRUCTIVE_MIGRATION=true.');
  }

  if (!Number.isFinite(CHUNK_SIZE) || CHUNK_SIZE <= 0) {
    throw new Error(`Invalid MIGRATION_CHUNK_SIZE value: ${CHUNK_SIZE}`);
  }
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

const getSourceColumns = async (pg: PgClient, table: string): Promise<string[]> => {
  const rows = await pg.query<ColumnRow>(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position ASC`,
    [table]
  );

  return rows.rows.map((row) => row.column_name);
};

const getTargetColumns = async (mysqlConn: mysql.Connection, table: string): Promise<string[]> => {
  const [rows] = await mysqlConn.query<MysqlColumnRow[]>(
    `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION ASC`,
    [table]
  );

  return rows.map((row) => row.COLUMN_NAME);
};

const getTargetPrimaryKeys = async (mysqlConn: mysql.Connection, table: string): Promise<string[]> => {
  const [rows] = await mysqlConn.query<MysqlColumnRow[]>(
    `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = 'PRIMARY'
      ORDER BY ORDINAL_POSITION ASC`,
    [table]
  );

  return rows.map((row) => row.COLUMN_NAME);
};

const sourceCount = async (pg: PgClient, table: string): Promise<number> => {
  const result = await pg.query<SourceCountRow>(`SELECT COUNT(*)::text AS count FROM ${pgQuote(table)}`);
  return parseCount(result.rows[0]?.count || '0');
};

const targetCount = async (mysqlConn: mysql.Connection, table: string): Promise<number> => {
  const [rows] = await mysqlConn.query<MysqlCountRow[]>(`SELECT COUNT(*) AS count FROM ${mysqlQuote(table)}`);
  return parseCount(rows[0]?.count || 0);
};

const readSourceChunk = async (
  pg: PgClient,
  table: string,
  columns: string[],
  offset: number,
  limit: number
): Promise<Array<Record<string, unknown>>> => {
  const selectColumns = columns.map(pgQuote).join(', ');
  const query = `SELECT ${selectColumns} FROM ${pgQuote(table)} OFFSET $1 LIMIT $2`;
  const rows = await pg.query<Record<string, unknown>>(query, [offset, limit]);
  return rows.rows;
};

const copyTable = async (
  pg: PgClient,
  mysqlConn: mysql.Connection,
  table: string
): Promise<TableSummary> => {
  const sourceColumns = await getSourceColumns(pg, table);
  const mysqlColumns = await getTargetColumns(mysqlConn, table);

  if (mysqlColumns.length === 0) {
    return {
      table,
      sourceCount: 0,
      targetCount: 0,
      copiedRows: 0,
      status: 'skipped',
      note: 'Target table not found in MySQL.',
    };
  }

  const columns = sourceColumns.filter((column) => mysqlColumns.includes(column));
  if (columns.length === 0) {
    return {
      table,
      sourceCount: 0,
      targetCount: 0,
      copiedRows: 0,
      status: 'skipped',
      note: 'No common columns between source and target.',
    };
  }

  const sourceRows = await sourceCount(pg, table);

  if (TRUNCATE_TARGET && !DRY_RUN) {
    await mysqlConn.query(`DELETE FROM ${mysqlQuote(table)}`);
  }

  const primaryKeys = await getTargetPrimaryKeys(mysqlConn, table);
  const upsertColumns = columns.filter((column) => !primaryKeys.includes(column));

  let copiedRows = 0;
  let offset = 0;

  while (offset < sourceRows) {
    const chunk = await readSourceChunk(pg, table, columns, offset, CHUNK_SIZE);
    if (chunk.length === 0) {
      break;
    }

    const values = chunk.flatMap((row) => columns.map((column) => normalizeValue(row[column])));

    if (!DRY_RUN) {
      const sql = createInsertSql(table, columns, chunk.length, upsertColumns);
      await mysqlConn.query(sql, values);
    }

    copiedRows += chunk.length;
    offset += chunk.length;
  }

  const finalSourceCount = sourceRows;
  const finalTargetCount = DRY_RUN ? await targetCount(mysqlConn, table) : await targetCount(mysqlConn, table);

  return {
    table,
    sourceCount: finalSourceCount,
    targetCount: finalTargetCount,
    copiedRows,
    status: 'copied',
  };
};

const run = async (): Promise<void> => {
  assertRequiredEnv();

  const pg = new PgClient({ connectionString: SOURCE_URL });
  let mysqlConn: mysql.Connection | null = null;

  const summaries: TableSummary[] = [];

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
      console.log('No tables matched migration filters.');
      return;
    }

    console.log(`Preparing to migrate ${tables.length} table(s).`);
    console.log(`Chunk size: ${CHUNK_SIZE}. Dry run: ${DRY_RUN}. Truncate target: ${TRUNCATE_TARGET}.`);

    if (!DRY_RUN) {
      await mysqlConnection.query('SET FOREIGN_KEY_CHECKS = 0');
    }

    for (const table of tables) {
      try {
        console.log(`Migrating table: ${table}`);
        const summary = await copyTable(pg, mysqlConnection, table);
        summaries.push(summary);
        console.log(`Table ${table}: ${summary.status}. copied=${summary.copiedRows}, source=${summary.sourceCount}, target=${summary.targetCount}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown table migration error';
        summaries.push({
          table,
          sourceCount: 0,
          targetCount: 0,
          copiedRows: 0,
          status: 'failed',
          note: message,
        });
        console.error(`Table ${table} failed: ${message}`);
        if (STOP_ON_ERROR) {
          throw error;
        }
      }
    }
  } finally {
    if (!DRY_RUN && mysqlConn) {
      await mysqlConn.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => undefined);
    }

    await pg.end().catch(() => undefined);

    if (mysqlConn) {
      await mysqlConn.end().catch(() => undefined);
    }
  }

  const failed = summaries.filter((item) => item.status === 'failed');
  const mismatched = summaries.filter((item) => item.status === 'copied' && item.sourceCount !== item.targetCount);

  console.log('');
  console.log('Migration summary:');
  for (const summary of summaries) {
    const extras = summary.note ? ` note=${summary.note}` : '';
    console.log(`- ${summary.table}: ${summary.status} source=${summary.sourceCount} target=${summary.targetCount} copied=${summary.copiedRows}${extras}`);
  }

  if (failed.length > 0) {
    throw new Error(`Migration failed for ${failed.length} table(s).`);
  }

  if (!DRY_RUN && mismatched.length > 0) {
    throw new Error(`Row count mismatch detected in ${mismatched.length} table(s).`);
  }

  console.log('PostgreSQL to MySQL data migration completed.');
};

run().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  process.exit(1);
});
