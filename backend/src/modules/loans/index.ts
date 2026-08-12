import { LoansRepository } from './repositories/loans.repository';
import { LoansService } from './services/loans.service';
import { LoansController } from './controllers/loans.controller';
import { createLoansRoutes } from './routes/loans.routes';

const loansRepository = new LoansRepository();
const loansService = new LoansService(loansRepository);
const loansController = new LoansController(loansService);

export const loansRoutes = createLoansRoutes(loansController);
