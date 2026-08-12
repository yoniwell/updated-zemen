import { prisma } from '../../database/prisma';

export class DownloadsService {
  async getAllCategories() {
    return prisma.downloadCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { files: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async getPublishedCategories() {
    return prisma.downloadCategory.findMany({
      where: { published: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        files: {
          where: { published: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async createCategory(data: { name: string; sortOrder?: number; published?: boolean }) {
    return prisma.downloadCategory.create({ data });
  }

  async updateCategory(id: string, data: Partial<{ name: string; sortOrder: number; published: boolean }>) {
    const existing = await prisma.downloadCategory.findUnique({ where: { id } });
    if (!existing) throw new Error('Category not found');
    return prisma.downloadCategory.update({ where: { id }, data });
  }

  async deleteCategory(id: string) {
    const existing = await prisma.downloadCategory.findUnique({ where: { id } });
    if (!existing) throw new Error('Category not found');
    return prisma.downloadCategory.delete({ where: { id } });
  }

  async createFile(data: { categoryId: string; name: string; fileSize: string; fileType: string; fileUrl: string; published?: boolean; sortOrder?: number }) {
    const category = await prisma.downloadCategory.findUnique({ where: { id: data.categoryId } });
    if (!category) throw new Error('Category not found');
    return prisma.downloadFile.create({ data });
  }

  async updateFile(id: string, data: Partial<{ name: string; fileSize: string; fileType: string; fileUrl: string; published: boolean; sortOrder: number; categoryId: string }>) {
    const existing = await prisma.downloadFile.findUnique({ where: { id } });
    if (!existing) throw new Error('File not found');
    return prisma.downloadFile.update({ where: { id }, data });
  }

  async deleteFile(id: string) {
    const existing = await prisma.downloadFile.findUnique({ where: { id } });
    if (!existing) throw new Error('File not found');
    return prisma.downloadFile.delete({ where: { id } });
  }
}
