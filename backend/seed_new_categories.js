const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const oldCategories = ['Membership', 'Loan', 'General'];
  
  // Delete the old ones if they exist
  for (const name of oldCategories) {
    const existing = await prisma.cmsDownloadCategory.findFirst({ where: { name } });
    if (existing) {
      await prisma.cmsDownloadCategory.delete({ where: { id: existing.id } });
      console.log(`Deleted old category: ${name}`);
    }
  }

  const newCategories = [
    'Application Forms',
    'Policies & Guidelines',
    'Reports & Financials',
    'Compliance & Security'
  ];
  
  for (const name of newCategories) {
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
      console.log(`Created new category: ${name}`);
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
