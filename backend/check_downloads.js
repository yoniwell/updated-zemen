const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const downloads = await prisma.cmsDownloadFile.findMany();
  console.log('Downloads:', JSON.stringify(downloads, null, 2));
}

main().finally(() => prisma.$disconnect());
