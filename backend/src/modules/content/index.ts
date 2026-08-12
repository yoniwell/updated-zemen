import { ContentRepository } from './repositories/content.repository';
import { ContentService } from './services/content.service';
import { ContentController } from './controllers/content.controller';
import { createContentRoutes } from './routes/content.routes';

const contentRepository = new ContentRepository();
const contentService = new ContentService(contentRepository);
const contentController = new ContentController(contentService);

export const contentRoutes = createContentRoutes(contentController);
