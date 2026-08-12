import { PrismaClient } from '@prisma/client';
import { logger } from '../common/utils/logger';

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
  ],
});

prisma.$on('query', (e) => {
  if (process.env.NODE_ENV !== 'production') {
    logger.debug({ query: e.query, params: e.params, duration: e.duration }, 'Prisma Query');
  }
});

prisma.$on('error', (e) => {
  logger.error({ message: e.message, target: e.target }, 'Prisma Error');
});

prisma.$on('info', (e) => {
  logger.info({ message: e.message }, 'Prisma Info');
});

prisma.$on('warn', (e) => {
  logger.warn({ message: e.message }, 'Prisma Warn');
});
