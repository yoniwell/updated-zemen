const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Migrating admin users to new roles...');
  
  const officerResult = await prisma.$executeRawUnsafe(
    "UPDATE admin_users SET role = 'OFFICER' WHERE role IN ('MEMBERSHIP_OFFICER', 'LOAN_OFFICER', 'KYC_OFFICER')"
  );
  console.log(`Updated ${officerResult} users to OFFICER`);

  const contentResult = await prisma.$executeRawUnsafe(
    "UPDATE admin_users SET role = 'CONTENT_MANAGER' WHERE role = 'CONTENT_ADMIN'"
  );
  console.log(`Updated ${contentResult} users to CONTENT_MANAGER`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
