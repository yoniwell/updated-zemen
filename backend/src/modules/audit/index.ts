import { AuditRepository } from './repositories/audit.repository';
import { AuditService } from './services/audit.service';
import { AuditController } from './controllers/audit.controller';
import { createAuditRoutes } from './routes/audit.routes';

const auditRepository = new AuditRepository();
const auditService = new AuditService(auditRepository);
const auditController = new AuditController(auditService);

export const auditRoutes = createAuditRoutes(auditController);
