const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const news = await prisma.cmsNews.findMany();
  console.log('News:', JSON.stringify(news, null, 2));
}

main().finally(() => prisma.$disconnect());
