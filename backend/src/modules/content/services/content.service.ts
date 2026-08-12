import { ContentRepository } from '../repositories/content.repository';
import { AppError } from '../../../common/errors/AppError';

export class ContentService {
  constructor(private readonly contentRepository: ContentRepository) {}

  private validateModel(modelName: string) {
    const validModels = [
      'faq', 'faqs', 'service', 'services', 'saving', 'savings',
      'announcement', 'announcements', 'loan-product', 'loan-products',
      'branch', 'branches',
    ];
    if (!validModels.includes(modelName.toLowerCase())) {
      throw new AppError('Invalid content type', 400);
    }
    return this.contentRepository.getModel(modelName);
  }

  async getItems(modelName: string, query: any) {
    const model = this.validateModel(modelName);
    const isBranch = modelName.toLowerCase() === 'branch' || modelName.toLowerCase() === 'branches';
    return this.contentRepository.findMany(model, {
      where: isBranch ? { status: 'OPERATIONAL', published: true } : (query.isActive !== undefined ? { isActive: query.isActive === 'true' } : undefined)
    });
  }

  async getItemById(modelName: string, id: string) {
    const model = this.validateModel(modelName);
    const item = await this.contentRepository.findById(model, id);
    if (!item) {
      throw new AppError(`${modelName} not found`, 404);
    }
    return item;
  }

  async createItem(modelName: string, data: any, executorId: string) {
    const model = this.validateModel(modelName);
    const item = await this.contentRepository.create(model, data);

    await this.contentRepository.createAuditLog({
      userId: executorId,
      action: 'CONTENT_CREATED',
      targetType: modelName,
      targetId: item.id,
      details: `Created new ${modelName}`,
    });

    return item;
  }

  async updateItem(modelName: string, id: string, data: any, executorId: string) {
    const model = this.validateModel(modelName);
    await this.getItemById(modelName, id); // check exists
    const item = await this.contentRepository.update(model, id, data);

    await this.contentRepository.createAuditLog({
      userId: executorId,
      action: 'CONTENT_UPDATED',
      targetType: modelName,
      targetId: item.id,
      details: `Updated ${modelName}`,
    });

    return item;
  }

  async deleteItem(modelName: string, id: string, executorId: string) {
    const model = this.validateModel(modelName);
    await this.getItemById(modelName, id); // check exists
    await this.contentRepository.delete(model, id);

    await this.contentRepository.createAuditLog({
      userId: executorId,
      action: 'CONTENT_DELETED',
      targetType: modelName,
      targetId: id,
      details: `Deleted ${modelName}`,
    });
  }
}
