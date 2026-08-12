import { MembershipRepository } from './repositories/membership.repository';
import { MembershipService } from './services/membership.service';
import { MembershipController } from './controllers/membership.controller';
import { createMembershipRoutes } from './routes/membership.routes';

const membershipRepository = new MembershipRepository();
const membershipService = new MembershipService(membershipRepository);
const membershipController = new MembershipController(membershipService);

export const membershipRoutes = createMembershipRoutes(membershipController);
