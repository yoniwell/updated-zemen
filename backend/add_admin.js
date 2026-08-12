const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.adminUser.findMany();
  console.log('Existing admins:', users.length);
    const hash = await bcrypt.hash('admin123', 10);
    await prisma.adminUser.updateMany({
      where: { email: 'admin@zemen.com' },
      data: {
        role: 'SUPER_ADMIN'
      }
    });
    console.log('Updated admin@zemen.com to SUPER_ADMIN');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
