const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting status migration...');

  const mappings = {
    'DRAFT': 'SUBMITTED',
    'KYC_VERIFICATION': 'UNDER_REVIEW',
    'PENDING_DOCUMENTS': 'UNDER_REVIEW',
    'PENDING_CLARIFICATION': 'UNDER_REVIEW',
    'ACTIVATED': 'APPROVED',
  };

  for (const [oldStatus, newStatus] of Object.entries(mappings)) {
    // Note: since enum types are strict in Prisma, we have to execute raw SQL to bypass enum constraints if we want to change them before pushing the schema.
    
    // Update Membership Applications
    await prisma.$executeRawUnsafe(`
      UPDATE membership_applications 
      SET status = '${newStatus}' 
      WHERE status = '${oldStatus}'
    `);
    
    // Update Loan Applications
    await prisma.$executeRawUnsafe(`
      UPDATE loan_applications 
      SET status = '${newStatus}' 
      WHERE status = '${oldStatus}'
    `);
    
    // Update Workflow History (fromStatus, toStatus)
    await prisma.$executeRawUnsafe(`
      UPDATE workflow_history 
      SET "fromStatus" = '${newStatus}' 
      WHERE "fromStatus" = '${oldStatus}'
    `);
    await prisma.$executeRawUnsafe(`
      UPDATE workflow_history 
      SET "toStatus" = '${newStatus}' 
      WHERE "toStatus" = '${oldStatus}'
    `);
    
    console.log(`Mapped ${oldStatus} to ${newStatus}`);
  }

  console.log('Status migration complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
