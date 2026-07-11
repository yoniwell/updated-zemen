import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { recordSecurityEvent } from './services/security-monitor.service';
import authRoutes from './routes/auth.routes';
import membershipRoutes from './routes/membership.routes';
import loanRoutes from './routes/loan.routes';
import applicationRoutes from './routes/applications.routes';
import adminRoutes from './routes/admin.routes';
import settingsRoutes from './routes/settings.routes';
import contentRoutes from './routes/content.routes';
import publicContentRoutes from './routes/public-content.routes';


import auditRoutes from './routes/audit.routes';
import { ensureCsrfCookie, csrfProtection } from './middleware/csrf';
import { startAuditIntegrityVerificationJob } from './services/audit-integrity-job.service';
import { requestContextMiddleware } from './middleware/request-context';
import { captureOperationalAlert } from './services/operational-alert.service';
import { startDataRetentionJob } from './services/data-retention-job.service';
import { startBackgroundJobWorker } from './services/background-job-queue.service';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  app.set('trust proxy', 1);
}

const defaultDevOrigins = ['http://localhost:3000', 'http://localhost:5173'];
const configuredOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : [];
const allowedOrigins = Array.from(new Set([...configuredOrigins, ...defaultDevOrigins]));

const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
    return forwarded.split(',')[0].trim();
  }

  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]);
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
};

const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.API_RATE_LIMIT_MAX || 1200),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => req.method === 'OPTIONS' || req.path === '/health',
  message: { error: 'Too many requests. Please try again later.' },
});

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    void recordSecurityEvent({
      endpoint: 'login',
      eventType: 'LOGIN_RATE_LIMITED',
      ipAddress: getClientIp(req),
    });
    res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
  },
});

const inquiryRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    void recordSecurityEvent({
      endpoint: 'public-inquiry',
      eventType: 'INQUIRY_RATE_LIMITED',
      ipAddress: getClientIp(req),
    });
    res.status(429).json({ error: 'Too many inquiry submissions. Please try again later.' });
  },
});

const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    void recordSecurityEvent({
      endpoint: 'upload',
      eventType: 'UPLOAD_RATE_LIMITED',
      ipAddress: getClientIp(req),
    });
    res.status(429).json({ error: 'Too many upload attempts. Please try again later.' });
  },
});

// Middleware
app.use(requestContextMiddleware);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", ...allowedOrigins],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestOrigin = req.headers.origin;
  const originToAllow = requestOrigin || 'http://localhost:3000';

  if (allowedOrigins.includes(originToAllow)) {
    res.header('Access-Control-Allow-Origin', originToAllow);
    res.header('Vary', 'Origin');
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use('/api', globalRateLimiter);
app.use('/api/auth/login', authRateLimiter);
app.use('/api/content/inquiries', inquiryRateLimiter);
app.use('/api/applications/:id/upload', uploadRateLimiter);
app.use(ensureCsrfCookie);
app.use('/api/auth/logout', csrfProtection);
app.use('/api/auth/refresh', csrfProtection);
app.use('/api/admin', csrfProtection);

app.use(express.json());
app.use(
  '/uploads',
  express.static(process.env.UPLOAD_DIR || './uploads', {
    setHeaders: (res: Response) => {
      // CMS assets are requested by the frontend app on a different origin/port in dev.
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  })
);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/membership', membershipRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/settings', settingsRoutes);
app.use('/api/admin/content', contentRoutes);
app.use('/api/content', publicContentRoutes);


app.use('/api/admin/audit-logs', auditRoutes);

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), requestId: res.locals.requestId || null });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
  void next;
  logger.errorWithException('unhandled_error', err, {
    requestId: _req.requestId || null,
    path: _req.originalUrl,
    method: _req.method,
  });
  void captureOperationalAlert({
    severity: 'CRITICAL',
    source: 'api.global_error_handler',
    message: err.message || 'Unhandled server error',
    requestId: _req.requestId || null,
    details: {
      path: _req.originalUrl,
      method: _req.method,
    },
  });
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  logger.info('server_started', { port, environment: process.env.NODE_ENV || 'development' });
  startAuditIntegrityVerificationJob();
  startDataRetentionJob();
  startBackgroundJobWorker();
});

export default app;
