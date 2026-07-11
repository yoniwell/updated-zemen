import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const keepTitles = new Set([
  'Savings',
  'Loan Products',
  'Membership Benefits',
  'Digital Services',
]);

async function main() {
  const removed = await prisma.cmsService.deleteMany({
    where: {
      title: {
        notIn: Array.from(keepTitles),
      },
    },
  });

  console.log(JSON.stringify({ deleted: removed.count }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
