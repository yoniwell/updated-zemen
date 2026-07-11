import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.cmsService.findMany({
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'asc' }],
    select: { id: true, title: true, sortOrder: true },
  });

  console.log(JSON.stringify(rows, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
