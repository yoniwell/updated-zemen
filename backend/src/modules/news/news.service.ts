import { prisma } from '../../database/prisma';

export class NewsService {
  async getAll() {
    return prisma.news.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async getPublished() {
    return prisma.news.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
    });
  }

  async getById(id: string) {
    const item = await prisma.news.findUnique({ where: { id } });
    if (!item) throw new Error('News article not found');
    return item;
  }

  async create(data: { title: string; excerpt: string; content?: string | null; imageUrl?: string | null; category?: string; status?: string }) {
    const publishedAt = data.status === 'PUBLISHED' ? new Date() : null;
    return prisma.news.create({ data: { ...data, publishedAt } });
  }

  async update(id: string, data: Partial<{ title: string; excerpt: string; content: string | null; imageUrl: string | null; category: string; status: string }>) {
    const existing = await prisma.news.findUnique({ where: { id } });
    if (!existing) throw new Error('News article not found');
    const publishedAt =
      data.status === 'PUBLISHED' && existing.status !== 'PUBLISHED'
        ? new Date()
        : existing.publishedAt;
    return prisma.news.update({ where: { id }, data: { ...data, publishedAt } });
  }

  async updateImage(id: string, imageUrl: string) {
    const existing = await prisma.news.findUnique({ where: { id } });
    if (!existing) throw new Error('News article not found');
    return prisma.news.update({ where: { id }, data: { imageUrl } });
  }

  async remove(id: string) {
    const existing = await prisma.news.findUnique({ where: { id } });
    if (!existing) throw new Error('News article not found');
    return prisma.news.delete({ where: { id } });
  }
}
