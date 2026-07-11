import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [services, savings] = await Promise.all([
    prisma.cmsService.count(),
    prisma.cmsSaving.count(),
  ]);

  console.log(JSON.stringify({ services, savings }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
