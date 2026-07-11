import prisma from '../config/database';

type SecurityEndpoint = 'login' | 'upload' | 'public-inquiry' | 'status-lookup';

type SecurityEventType =
  | 'LOGIN_FAILED'
  | 'LOGIN_RATE_LIMITED'
  | 'LOGIN_ACCOUNT_RATE_LIMITED'
  | 'LOGIN_ACCOUNT_LOCKED'
  | 'UPLOAD_RATE_LIMITED'
  | 'UPLOAD_SIGNATURE_REJECTED'
  | 'UPLOAD_MALWARE_REJECTED'
  | 'INQUIRY_RATE_LIMITED'
  | 'INQUIRY_HONEYPOT_TRIGGERED'
  | 'STATUS_LOOKUP_INVALID_INPUT';

const LAST_HOUR_MS = 60 * 60 * 1000;
const LAST_24_HOURS_MS = 24 * 60 * 60 * 1000;
const RETENTION_DAYS = 30;

const endpointLabels: Record<SecurityEndpoint, string> = {
  login: 'Login Endpoint',
  upload: 'Upload Endpoint',
  'public-inquiry': 'Public Inquiry Endpoint',
  'status-lookup': 'Status Lookup Endpoint',
};

const eventLabels: Record<SecurityEventType, string> = {
  LOGIN_FAILED: 'Failed login attempt',
  LOGIN_RATE_LIMITED: 'Login request rate-limited',
  LOGIN_ACCOUNT_RATE_LIMITED: 'Login blocked by account-level rate limit',
  LOGIN_ACCOUNT_LOCKED: 'Login blocked due to temporary account lockout',
  UPLOAD_RATE_LIMITED: 'Upload request rate-limited',
  UPLOAD_SIGNATURE_REJECTED: 'Upload rejected due to invalid file signature',
  UPLOAD_MALWARE_REJECTED: 'Upload rejected by malware scan',
  INQUIRY_RATE_LIMITED: 'Public inquiry request rate-limited',
  INQUIRY_HONEYPOT_TRIGGERED: 'Public inquiry honeypot triggered',
  STATUS_LOOKUP_INVALID_INPUT: 'Status lookup blocked due to invalid input',
};

export async function recordSecurityEvent(input: {
  endpoint: SecurityEndpoint;
  eventType: SecurityEventType;
  ipAddress?: string;
  details?: string;
}): Promise<void> {
  await prisma.securityEventLog.create({
    data: {
      endpoint: input.endpoint,
      eventType: input.eventType,
      ipAddress: input.ipAddress,
      details: input.details,
    },
  });

  const retentionThreshold = new Date(Date.now() - RETENTION_DAYS * LAST_24_HOURS_MS);
  await prisma.securityEventLog.deleteMany({
    where: {
      createdAt: { lt: retentionThreshold },
    },
  });
}

export async function getSecurityAbuseMetrics(): Promise<{
  summary: { lastHour: number; last24Hours: number };
  endpointMetrics: Array<{ endpoint: SecurityEndpoint; label: string; lastHour: number; last24Hours: number }>;
  eventTypeMetrics: Array<{ eventType: SecurityEventType; label: string; last24Hours: number }>;
  recentEvents: Array<{ timestamp: string; endpoint: SecurityEndpoint; eventType: SecurityEventType; label: string; ipAddress: string | null; details: string | null }>;
}> {
  const now = Date.now();
  const oneHourAgo = new Date(now - LAST_HOUR_MS);
  const twentyFourHoursAgo = new Date(now - LAST_24_HOURS_MS);

  const [lastHourTotal, last24HoursTotal, recentEventsRows] = await Promise.all([
    prisma.securityEventLog.count({ where: { createdAt: { gte: oneHourAgo } } }),
    prisma.securityEventLog.count({ where: { createdAt: { gte: twentyFourHoursAgo } } }),
    prisma.securityEventLog.findMany({
      where: { createdAt: { gte: twentyFourHoursAgo } },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
  ]);

  const endpointMetrics = await Promise.all(
    (Object.keys(endpointLabels) as SecurityEndpoint[]).map(async (endpoint) => {
      const [lastHour, last24Hours] = await Promise.all([
        prisma.securityEventLog.count({
          where: { endpoint, createdAt: { gte: oneHourAgo } },
        }),
        prisma.securityEventLog.count({
          where: { endpoint, createdAt: { gte: twentyFourHoursAgo } },
        }),
      ]);

      return {
        endpoint,
        label: endpointLabels[endpoint],
        lastHour,
        last24Hours,
      };
    })
  );

  const eventTypeMetrics = await Promise.all(
    (Object.keys(eventLabels) as SecurityEventType[]).map(async (eventType) => ({
      eventType,
      label: eventLabels[eventType],
      last24Hours: await prisma.securityEventLog.count({
        where: { eventType, createdAt: { gte: twentyFourHoursAgo } },
      }),
    }))
  );

  const recentEvents = recentEventsRows.map((event) => ({
    timestamp: event.createdAt.toISOString(),
    endpoint: event.endpoint as SecurityEndpoint,
    eventType: event.eventType as SecurityEventType,
    label: eventLabels[event.eventType as SecurityEventType] || event.eventType,
    ipAddress: event.ipAddress || null,
    details: event.details || null,
  }));

  return {
    summary: {
      lastHour: lastHourTotal,
      last24Hours: last24HoursTotal,
    },
    endpointMetrics,
    eventTypeMetrics,
    recentEvents,
  };
}