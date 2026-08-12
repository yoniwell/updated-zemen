import path from 'path';
import express, { Express, Request, Response } from 'express';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './common/utils/logger';
import { authRoutes } from './modules/auth';
import { usersRoutes } from './modules/users';
import { settingsRoutes } from './modules/settings';
import { membershipRoutes } from './modules/membership';
import { loansRoutes } from './modules/loans';
import { contentRoutes } from './modules/content';
import { auditRoutes } from './modules/audit';
import { applicationsRoutes } from './modules/applications';
import { newsRoutes } from './modules/news';
import { downloadsRoutes } from './modules/downloads';

const app: Express = express();

const uploadDir = process.env.UPLOAD_DIR || path.resolve(__dirname, '../uploads');
app.use('/uploads', express.static(uploadDir));
app.use('/uploads', express.static(path.resolve('./uploads')));

app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  logger.info({ method: req.method, url: req.url }, 'Incoming Request');
  next();
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/membership', membershipRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/downloads', downloadsRoutes);

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { message: 'Route not found' } });
});

// Global Error Handler
app.use(errorHandler);

export default app;
