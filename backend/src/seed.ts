import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting clean database seed (Core System & Product Configs only)...');

  // Clean sample data from applications & CMS content tables
  console.log('🧹 Cleaning sample application and CMS content records...');
  await prisma.document.deleteMany();
  await prisma.applicationNote.deleteMany();
  await prisma.workflowHistory.deleteMany();
  await prisma.membershipApplication.deleteMany();
  await prisma.loanApplication.deleteMany();
  await prisma.applicant.deleteMany();
  await prisma.downloadFile.deleteMany();
  await prisma.downloadCategory.deleteMany();
  await prisma.cmsService.deleteMany();
  await prisma.cmsSaving.deleteMany();
  await prisma.cmsLoanProduct.deleteMany();
  await prisma.cmsAnnouncement.deleteMany();
  await prisma.cmsFaq.deleteMany();
  await prisma.news.deleteMany();
  await prisma.auditLog.deleteMany();

  // ==========================================
  // 1. SEED BRANCHES
  // ==========================================
  console.log('📍 Seeding Operational Branches...');
  const branchesData = [
    {
      code: 'BR-001',
      name: 'Addis Ababa HQ',
      location: 'Bole Medhanialem, Addis Ababa',
      manager: 'Aisha Hassan',
      status: 'OPERATIONAL',
      phonePrimary: '+251 11 661 2345',
      phoneSecondary: '+251 91 122 3344',
      officeHours: 'Mon - Fri: 8:00 AM - 5:00 PM, Sat: 8:00 AM - 12:00 PM',
      published: true,
    },
    {
      code: 'BR-002',
      name: 'Mekelle Head Office',
      location: 'Adi Hawesi, In front of IOM, Mekelle',
      manager: 'Dr. Silas Omari',
      status: 'OPERATIONAL',
      phonePrimary: '+251 34 440 5678',
      phoneSecondary: '+251 91 433 2211',
      officeHours: 'Mon - Fri: 8:00 AM - 5:00 PM, Sat: 8:00 AM - 12:00 PM',
      published: true,
    },
    {
      code: 'BR-003',
      name: 'Hawassa Main Branch',
      location: 'Piazza Square, Near Main Post Office, Hawassa',
      manager: 'Bethlehem Tadesse',
      status: 'OPERATIONAL',
      phonePrimary: '+251 46 220 9988',
      phoneSecondary: '+251 92 211 4455',
      officeHours: 'Mon - Fri: 8:00 AM - 5:00 PM',
      published: true,
    },
    {
      code: 'BR-004',
      name: 'Bahir Dar Branch',
      location: 'Kebele 04, Next to Grand Hotel, Bahir Dar',
      manager: 'Yonas Gebre',
      status: 'OPERATIONAL',
      phonePrimary: '+251 58 226 7711',
      phoneSecondary: '+251 91 877 6655',
      officeHours: 'Mon - Fri: 8:00 AM - 5:00 PM',
      published: true,
    },
    {
      code: 'BR-005',
      name: 'Dire Dawa Branch',
      location: 'Kezira Business District, Dire Dawa',
      manager: 'Mustafa Ahmed',
      status: 'OPERATIONAL',
      phonePrimary: '+251 25 111 4433',
      phoneSecondary: '+251 93 344 5566',
      officeHours: 'Mon - Fri: 8:00 AM - 5:00 PM',
      published: true,
    },
  ];

  const branches = [];
  for (const b of branchesData) {
    const branch = await prisma.branch.upsert({
      where: { code: b.code },
      update: { name: b.name, location: b.location, manager: b.manager, status: b.status, published: b.published },
      create: b,
    });
    branches.push(branch);
  }
  console.log(`✅ Seeded ${branches.length} operational branches`);

  // ==========================================
  // 2. SEED ADMIN USERS (ROLES & ACCOUNTS)
  // ==========================================
  console.log('👥 Seeding Admin Users & Staff Accounts...');
  const commonPassword = await bcrypt.hash('admin123', 10);
  const bmPassword = await bcrypt.hash('bm123456', 10);
  const officerPassword = await bcrypt.hash('officer123', 10);

  const usersData = [
    {
      name: 'System Administrator',
      email: 'admin@zemen.com',
      passwordHash: commonPassword,
      role: 'SUPER_ADMIN' as const,
      branchId: branches[0].id,
      isActive: true,
    },
    {
      name: 'Addis Branch Manager',
      email: 'bm.addis@zemen.com',
      passwordHash: bmPassword,
      role: 'BRANCH_MANAGER' as const,
      branchId: branches[0].id,
      isActive: true,
    },
    {
      name: 'Mekelle Branch Manager',
      email: 'bm.mekelle@zemen.com',
      passwordHash: bmPassword,
      role: 'BRANCH_MANAGER' as const,
      branchId: branches[1].id,
      isActive: true,
    },
    {
      name: 'Elena Aris (Senior Credit Officer)',
      email: 'officer@zemen.com',
      passwordHash: officerPassword,
      role: 'OFFICER' as const,
      branchId: branches[0].id,
      isActive: true,
    },
    {
      name: 'Tewodros Kassahun (Content Manager)',
      email: 'content@zemen.com',
      passwordHash: commonPassword,
      role: 'CONTENT_MANAGER' as const,
      branchId: branches[0].id,
      isActive: true,
    },
  ];

  const adminUsers = [];
  for (const u of usersData) {
    const user = await prisma.adminUser.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, branchId: u.branchId, isActive: u.isActive },
      create: u,
    });
    adminUsers.push(user);
  }
  console.log(`✅ Seeded ${adminUsers.length} admin & staff user accounts`);

  // ==========================================
  // 3. SEED SYSTEM SETTINGS & CONFIGS
  // ==========================================
  console.log('⚙️ Seeding System Settings & Product Configs...');
  const settingsData = [
    { key: 'organization_name', value: 'Zemen Savings & Credit Cooperative Society' },
    { key: 'contact_email', value: 'support@zemensacco.com' },
    { key: 'primary_phone', value: '+251 11 661 2345' },
    { key: 'default_currency', value: 'ETB' },
    { key: 'membership_fee_etb', value: '500' },
    { key: 'min_monthly_saving_etb', value: '300' },
    { key: 'max_loan_multiplier', value: '3' },
    { key: 'loan_interest_rate_annual', value: '9.5%' },
    { key: 'maintenance_mode', value: 'false' },
  ];

  for (const s of settingsData) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log(`✅ Seeded ${settingsData.length} system settings`);

  // ==========================================
  // 4. SEED SAVING TYPES CONFIG
  // ==========================================
  const savingTypesData = [
    { name: 'Regular Compulsory Saving', minAmount: 300, maxAmount: 1000000 },
    { name: "Children's Future Saving", minAmount: 50, maxAmount: 500000 },
    { name: 'Fixed Time Deposit', minAmount: 10000, maxAmount: 10000000 },
    { name: 'Non-Interest Bearing Saving', minAmount: 100, maxAmount: 5000000 },
    { name: 'Diaspora Foreign Currency Saving', minAmount: 500, maxAmount: 10000000 },
    { name: 'Housing & Vehicle Asset Saving', minAmount: 1000, maxAmount: 5000000 },
  ];

  for (const st of savingTypesData) {
    await prisma.savingTypeConfig.upsert({
      where: { name: st.name },
      update: { minAmount: st.minAmount, maxAmount: st.maxAmount },
      create: { name: st.name, minAmount: st.minAmount, maxAmount: st.maxAmount, isActive: true },
    });
  }
  console.log(`✅ Seeded ${savingTypesData.length} saving type configurations`);

  // ==========================================
  // 5. SEED LOAN TYPES CONFIG
  // ==========================================
  const loanTypesData = [
    { name: 'Personal Loan', minAmount: 5000, maxAmount: 500000, minTenure: 3, maxTenure: 36 },
    { name: 'Business Loan', minAmount: 50000, maxAmount: 5000000, minTenure: 6, maxTenure: 84 },
    { name: 'Agricultural Loan', minAmount: 10000, maxAmount: 1000000, minTenure: 6, maxTenure: 60 },
    { name: 'Housing Loan', minAmount: 100000, maxAmount: 10000000, minTenure: 12, maxTenure: 120 },
    { name: 'Emergency Loan', minAmount: 1000, maxAmount: 50000, minTenure: 1, maxTenure: 12 },
    { name: 'Vehicle Loan', minAmount: 50000, maxAmount: 2000000, minTenure: 6, maxTenure: 60 },
  ];

  for (const lt of loanTypesData) {
    await prisma.loanTypeConfig.upsert({
      where: { name: lt.name },
      update: { minAmount: lt.minAmount, maxAmount: lt.maxAmount, minTenure: lt.minTenure, maxTenure: lt.maxTenure },
      create: { name: lt.name, isActive: true, minAmount: lt.minAmount, maxAmount: lt.maxAmount, minTenure: lt.minTenure, maxTenure: lt.maxTenure },
    });
  }
  console.log(`✅ Seeded ${loanTypesData.length} loan product configurations`);

  console.log('\n🎉 Clean Core System Seed Completed Successfully!');
  console.log('----------------------------------------------------');
  console.log('🔑 Credentials to log in:');
  console.log('  • Super Admin: admin@zemen.com / admin123');
  console.log('  • Branch Manager (Addis): bm.addis@zemen.com / bm123456');
  console.log('  • Credit Officer: officer@zemen.com / officer123');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
