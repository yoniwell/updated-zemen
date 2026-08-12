const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cat = await prisma.cmsDownloadCategory.findFirst();
  if (!cat) throw new Error("No category found");
  
  const payload = {
    categoryId: cat.id,
    name: 'test',
    size: '0 KB',
    type: 'PDF',
    link: '#',
    sortOrder: 0,
    published: true,
  };
  
  const created = await prisma.cmsDownloadFile.create({ data: payload });
  console.log('Created!', created);
}

main().finally(() => prisma.$disconnect());
