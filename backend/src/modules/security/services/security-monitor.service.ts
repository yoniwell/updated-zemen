import { securityMonitorRepository } from '../repositories/security-monitor.repository';

export type SecurityEndpoint = 'login' | 'upload' | 'public-inquiry' | 'status-lookup';

export type SecurityEventType =
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
  await securityMonitorRepository.recordEvent(
    input.endpoint,
    input.eventType,
    input.ipAddress,
    input.details
  );

  const retentionThreshold = new Date(Date.now() - RETENTION_DAYS * LAST_24_HOURS_MS);
  await securityMonitorRepository.cleanupEvents(retentionThreshold);
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
    securityMonitorRepository.countTotalEventsSince(oneHourAgo),
    securityMonitorRepository.countTotalEventsSince(twentyFourHoursAgo),
    securityMonitorRepository.listRecentEventsSince(twentyFourHoursAgo, 25),
  ]);

  const endpointMetrics = await Promise.all(
    (Object.keys(endpointLabels) as SecurityEndpoint[]).map(async (endpoint) => {
      const [lastHour, last24Hours] = await Promise.all([
        securityMonitorRepository.countEndpointEventsSince(endpoint, oneHourAgo),
        securityMonitorRepository.countEndpointEventsSince(endpoint, twentyFourHoursAgo),
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
    (Object.keys(eventLabels) as SecurityEventType[]).map(async (eventType) => {
      const last24Hours = await securityMonitorRepository.countTypeEventsSince(eventType, twentyFourHoursAgo);

      return {
        eventType,
        label: eventLabels[eventType],
        last24Hours,
      };
    })
  );

  return {
    summary: {
      lastHour: lastHourTotal,
      last24Hours: last24HoursTotal,
    },
    endpointMetrics,
    eventTypeMetrics,
    recentEvents: recentEventsRows.map((row) => ({
      timestamp: row.createdAt.toISOString(),
      endpoint: row.endpoint as SecurityEndpoint,
      eventType: row.eventType as SecurityEventType,
      label: eventLabels[row.eventType as SecurityEventType] || 'Unknown',
      ipAddress: row.ipAddress,
      details: row.details,
    })),
  };
}
