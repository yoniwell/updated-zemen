const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categories = ['Membership', 'Loan', 'General'];
  
  for (const name of categories) {
    const existing = await prisma.cmsDownloadCategory.findFirst({
      where: { name }
    });
    
    if (!existing) {
      await prisma.cmsDownloadCategory.create({
        data: {
          name,
          published: true,
          sortOrder: 0
        }
      });
      console.log(`Created category: ${name}`);
    } else {
      console.log(`Category already exists: ${name}`);
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
