import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting database cleanup (removing test applications & sample data)...');

  // Delete records in order of foreign key dependency
  const docs = await prisma.document.deleteMany();
  console.log(`  • Deleted ${docs.count} document records`);

  const notes = await prisma.applicationNote.deleteMany();
  console.log(`  • Deleted ${notes.count} application notes`);

  const workflow = await prisma.workflowHistory.deleteMany();
  console.log(`  • Deleted ${workflow.count} workflow history entries`);

  const mems = await prisma.membershipApplication.deleteMany();
  console.log(`  • Deleted ${mems.count} membership applications`);

  const loans = await prisma.loanApplication.deleteMany();
  console.log(`  • Deleted ${loans.count} loan applications`);

  const applicants = await prisma.applicant.deleteMany();
  console.log(`  • Deleted ${applicants.count} applicant profiles`);

  const audit = await prisma.auditLog.deleteMany();
  console.log(`  • Deleted ${audit.count} audit logs`);

  const notifications = await prisma.notificationEvent.deleteMany();
  console.log(`  • Deleted ${notifications.count} notification logs`);

  const downloadFiles = await prisma.downloadFile.deleteMany();
  console.log(`  • Deleted ${downloadFiles.count} CMS download files`);

  const downloadCats = await prisma.downloadCategory.deleteMany();
  console.log(`  • Deleted ${downloadCats.count} CMS download categories`);

  const cmsServices = await prisma.cmsService.deleteMany();
  console.log(`  • Deleted ${cmsServices.count} CMS services`);

  const cmsSavings = await prisma.cmsSaving.deleteMany();
  console.log(`  • Deleted ${cmsSavings.count} CMS savings items`);

  const cmsLoans = await prisma.cmsLoanProduct.deleteMany();
  console.log(`  • Deleted ${cmsLoans.count} CMS loan products`);

  const cmsAnnouncements = await prisma.cmsAnnouncement.deleteMany();
  console.log(`  • Deleted ${cmsAnnouncements.count} CMS announcements`);

  const cmsFaqs = await prisma.cmsFaq.deleteMany();
  console.log(`  • Deleted ${cmsFaqs.count} CMS FAQs`);

  const news = await prisma.news.deleteMany();
  console.log(`  • Deleted ${news.count} CMS news items`);

  console.log('\n✨ Database Cleanup Completed!');
  console.log('----------------------------------------------------');
  console.log('✅ Retained core system data:');
  console.log('  • Operational Branches (Addis, Mekelle, Hawassa, etc.)');
  console.log('  • Admin Users & Branch Manager Accounts (Super Admin, BMs)');
  console.log('  • System Settings & Product Configurations');
  console.log('----------------------------------------------------');
  console.log('🚀 Your admin dashboard is now 100% clean and ready for real data!');
}

main()
  .catch((e) => {
    console.error('❌ Clear data error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
