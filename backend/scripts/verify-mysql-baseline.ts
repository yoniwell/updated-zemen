import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';

type TableRow = RowDataPacket & { tableName: string };
type CountRow = RowDataPacket & { count: number | string };

type TableCount = {
  table: string;
  count: number;
};

const loadEnv = (): void => {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'backend', '.env'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
      return;
    }
  }
};

loadEnv();

const TARGET_URL = process.env.MYSQL_MIGRATION_URL || process.env.DATABASE_URL || '';

const REQUIRED_TABLES = [
  'branches',
  'applicants',
  'membership_applications',
  'loan_applications',
  'documents',
  'admin_users',
  'audit_logs',
  'export_audit_records',
  'system_settings',
  'notification_events',
] as const;

const mysqlQuote = (identifier: string): string => `\`${identifier.replace(/`/g, '``')}\``;

const parseCount = (value: number | string | undefined): number => {
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
    const port = parsed.port || '3306';
    return `${parsed.protocol}//${parsed.hostname}:${port}/${database}`;
  } catch {
    return 'configured MySQL target';
  }
};

const formatError = (error: unknown): string => {
  if (!error || typeof error !== 'object') {
    return String(error);
  }

  const value = error as { message?: string; code?: string; errno?: number; sqlState?: string };
  const base = value.message || 'Unknown MySQL error';
  const details = [
    value.code ? `code=${value.code}` : '',
    typeof value.errno === 'number' ? `errno=${value.errno}` : '',
    value.sqlState ? `sqlState=${value.sqlState}` : '',
  ].filter((item) => item.length > 0);

  return details.length > 0 ? `${base} (${details.join(', ')})` : base;
};

const assertMySqlUrl = (url: string): void => {
  const normalized = url.toLowerCase();
  if (!normalized.startsWith('mysql://') && !normalized.startsWith('mysqls://')) {
    throw new Error('MYSQL_MIGRATION_URL (or DATABASE_URL) must be a mysql:// URL for baseline verification.');
  }
};

const getExistingRequiredTables = async (connection: mysql.Connection): Promise<Set<string>> => {
  const placeholders = REQUIRED_TABLES.map(() => '?').join(', ');

  const [rows] = await connection.query<TableRow[]>(
    `SELECT TABLE_NAME AS tableName
       FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN (${placeholders})`,
    [...REQUIRED_TABLES]
  );

  return new Set(rows.map((row) => row.tableName));
};

const getTableCount = async (connection: mysql.Connection, table: string): Promise<number> => {
  const [rows] = await connection.query<CountRow[]>(`SELECT COUNT(*) AS count FROM ${mysqlQuote(table)}`);
  return parseCount(rows[0]?.count);
};

const run = async (): Promise<void> => {
  if (!TARGET_URL) {
    throw new Error('Missing MYSQL_MIGRATION_URL (or DATABASE_URL).');
  }

  assertMySqlUrl(TARGET_URL);

  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection(TARGET_URL);
  } catch (error) {
    throw new Error(`Unable to connect to ${describeTarget(TARGET_URL)}: ${formatError(error)}`);
  }

  try {
    const existing = await getExistingRequiredTables(connection);
    const missing = REQUIRED_TABLES.filter((table) => !existing.has(table));

    if (missing.length > 0) {
      throw new Error(`Missing required baseline table(s): ${missing.join(', ')}`);
    }

    const tableCounts: TableCount[] = [];
    for (const table of REQUIRED_TABLES) {
      const count = await getTableCount(connection, table);
      tableCounts.push({ table, count });
    }

    console.log('MySQL baseline verification passed. Required tables are present.');
    for (const item of tableCounts) {
      console.log(`- ${item.table}: ${item.count} row(s)`);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

run().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  process.exit(1);
});
