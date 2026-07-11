import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';

type CountRow = RowDataPacket & { count: number | string };

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

const TARGET_URL = process.env.MYSQL_MIGRATION_URL || process.env.DATABASE_URL || '';
const BASELINE_SQL_PATH = process.env.MYSQL_BASELINE_SQL_PATH || '';
const BASELINE_MIGRATION_ID = process.env.MYSQL_BASELINE_MIGRATION_ID || '';
const FORCE_APPLY = (process.env.MYSQL_BASELINE_FORCE || 'false').toLowerCase() === 'true';

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
    throw new Error('MYSQL_MIGRATION_URL (or DATABASE_URL) must be a mysql:// URL for baseline apply.');
  }
};

const resolveBaselineSqlPath = (): { migrationDir: string; sqlPath: string } => {
  const migrationsRoot = path.resolve(BACKEND_ROOT, 'prisma', 'migrations');

  if (BASELINE_SQL_PATH) {
    const sqlCandidates = path.isAbsolute(BASELINE_SQL_PATH)
      ? [BASELINE_SQL_PATH]
      : [
          path.resolve(process.cwd(), BASELINE_SQL_PATH),
          path.resolve(BACKEND_ROOT, BASELINE_SQL_PATH),
        ];
    const sqlPath = sqlCandidates.find((candidate) => fs.existsSync(candidate));

    if (!sqlPath) {
      throw new Error(
        `MYSQL_BASELINE_SQL_PATH does not exist. Checked: ${sqlCandidates.join(', ')}`
      );
    }

    const migrationDir = path.dirname(sqlPath);
    return { migrationDir, sqlPath };
  }

  if (!fs.existsSync(migrationsRoot)) {
    throw new Error(`Prisma migrations directory not found: ${migrationsRoot}`);
  }

  const baselineDirs = fs
    .readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.endsWith('_mysql_baseline'))
    .map((entry) => entry.name)
    .sort();

  if (baselineDirs.length === 0) {
    throw new Error('No *_mysql_baseline migration directory found under prisma/migrations.');
  }

  let selectedDirName = baselineDirs[baselineDirs.length - 1];
  if (BASELINE_MIGRATION_ID) {
    const matched = baselineDirs.find((name) => name === BASELINE_MIGRATION_ID);
    if (!matched) {
      throw new Error(`MYSQL_BASELINE_MIGRATION_ID not found: ${BASELINE_MIGRATION_ID}`);
    }
    selectedDirName = matched;
  }

  const migrationDir = path.join(migrationsRoot, selectedDirName);
  const sqlPath = path.join(migrationDir, 'migration.sql');

  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Baseline migration SQL not found: ${sqlPath}`);
  }

  return { migrationDir, sqlPath };
};

const splitSqlStatements = (sqlScript: string): string[] => {
  const statements: string[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = 0; index < sqlScript.length; index += 1) {
    const char = sqlScript[index];
    const next = index + 1 < sqlScript.length ? sqlScript[index + 1] : '';

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (!inSingle && !inDouble && !inBacktick) {
      if (char === '-' && next === '-') {
        inLineComment = true;
        index += 1;
        continue;
      }
      if (char === '/' && next === '*') {
        inBlockComment = true;
        index += 1;
        continue;
      }
    }

    if (char === "'" && !inDouble && !inBacktick) {
      if (inSingle && next === "'") {
        current += "''";
        index += 1;
        continue;
      }
      inSingle = !inSingle;
      current += char;
      continue;
    }

    if (char === '"' && !inSingle && !inBacktick) {
      inDouble = !inDouble;
      current += char;
      continue;
    }

    if (char === '`' && !inSingle && !inDouble) {
      inBacktick = !inBacktick;
      current += char;
      continue;
    }

    if (char === ';' && !inSingle && !inDouble && !inBacktick) {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      current = '';
      continue;
    }

    current += char;
  }

  const trailing = current.trim();
  if (trailing.length > 0) {
    statements.push(trailing);
  }

  return statements;
};

const schemaLooksInitialized = async (connection: mysql.Connection): Promise<boolean> => {
  const knownTables = ['branches', 'admin_users', 'audit_logs'];
  const placeholders = knownTables.map(() => '?').join(', ');

  const [rows] = await connection.query<CountRow[]>(
    `SELECT COUNT(*) AS count
       FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN (${placeholders})`,
    knownTables
  );

  return parseCount(rows[0]?.count) > 0;
};

const run = async (): Promise<void> => {
  if (!TARGET_URL) {
    throw new Error('Missing MYSQL_MIGRATION_URL (or DATABASE_URL).');
  }

  assertMySqlUrl(TARGET_URL);

  const { migrationDir, sqlPath } = resolveBaselineSqlPath();
  const sqlScript = fs.readFileSync(sqlPath, 'utf8');
  const statements = splitSqlStatements(sqlScript);

  if (statements.length === 0) {
    throw new Error(`No executable SQL statements found in ${sqlPath}`);
  }

  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection(TARGET_URL);
  } catch (error) {
    throw new Error(`Unable to connect to ${describeTarget(TARGET_URL)}: ${formatError(error)}`);
  }

  try {
    const initialized = await schemaLooksInitialized(connection);
    if (initialized && !FORCE_APPLY) {
      console.log('Detected existing application tables in target schema.');
      console.log('Skipping baseline apply. Set MYSQL_BASELINE_FORCE=true to force execution.');
      return;
    }

    console.log(`Applying baseline migration from: ${sqlPath}`);
    console.log(`Migration directory: ${migrationDir}`);
    console.log(`Statements to execute: ${statements.length}`);

    let executed = 0;
    for (const statement of statements) {
      await connection.query(statement);
      executed += 1;
      if (executed % 25 === 0 || executed === statements.length) {
        console.log(`Executed ${executed}/${statements.length} statements...`);
      }
    }

    const appliedAt = new Date().toISOString();
    const markerValue = JSON.stringify({ migrationDir: path.basename(migrationDir), appliedAt });
    await connection.query(
      `INSERT INTO ${mysqlQuote('system_settings')} (${mysqlQuote('key')}, ${mysqlQuote('value')}, ${mysqlQuote('createdAt')}, ${mysqlQuote('updatedAt')})
       VALUES (?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
       ON DUPLICATE KEY UPDATE ${mysqlQuote('value')} = VALUES(${mysqlQuote('value')}), ${mysqlQuote('updatedAt')} = CURRENT_TIMESTAMP(3)`,
      ['migration.mysqlBaseline', markerValue]
    );

    console.log('MySQL baseline apply completed successfully.');
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
