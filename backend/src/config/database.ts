import { PrismaClient } from '@prisma/client';

const toPositiveInteger = (value: string | undefined, fallback: number): number => {
	const parsed = Number.parseInt(value || '', 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const withMysqlConnectionGuards = (url: string): string => {
	try {
		const parsed = new URL(url);
		const protocol = parsed.protocol.toLowerCase();
		if (protocol !== 'mysql:' && protocol !== 'mysqls:') {
			return url;
		}

		if (!parsed.searchParams.has('connection_limit')) {
			parsed.searchParams.set('connection_limit', String(toPositiveInteger(process.env.PRISMA_CONNECTION_LIMIT, 1)));
		}

		if (!parsed.searchParams.has('pool_timeout')) {
			parsed.searchParams.set('pool_timeout', String(toPositiveInteger(process.env.PRISMA_POOL_TIMEOUT_SECONDS, 30)));
		}

		return parsed.toString();
	} catch {
		return url;
	}
};

const configuredDatabaseUrl = process.env.DATABASE_URL || '';
const datasourceUrl = configuredDatabaseUrl ? withMysqlConnectionGuards(configuredDatabaseUrl) : undefined;

const prisma = datasourceUrl
	? new PrismaClient({
		datasources: {
			db: {
				url: datasourceUrl,
			},
		},
	})
	: new PrismaClient();

export default prisma;
