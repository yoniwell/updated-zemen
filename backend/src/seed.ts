import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding real website data (Branches, Staff Accounts, Product Configs & FAQs)...');

  // ==========================================
  // 1. SEED REAL OPERATIONAL BRANCHES (9 Real Branches from Website)
  // ==========================================
  console.log('📍 Seeding 9 Real Operational Branches from Frontend...');
  
  // Clear any old sample branch records first
  await prisma.adminUser.updateMany({ data: { branchId: null } });
  await prisma.branch.deleteMany();

  const branchesData = [
    {
      code: 'BR-001',
      name: 'Mekelle Head Office',
      location: 'Adi Hawesi, In front of IOM',
      manager: 'Dr. Silas Omari',
      status: 'OPERATIONAL',
      phonePrimary: '0953444411',
      phoneSecondary: '+251 34 440 5678',
      officeHours: 'Mon-Fri 8:30 AM - 5:30 PM',
      mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3902.1!2d39.47!3d13.49!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sMekelle!5e0!3m2!1sen!2set!4v1710000000000',
      published: true,
    },
    {
      code: 'BR-002',
      name: 'Mekelle Branch',
      location: 'Kedamay Weyane, Marturs St.',
      manager: 'Atsbeha Gebre',
      status: 'OPERATIONAL',
      phonePrimary: '0997344200',
      officeHours: 'Mon-Fri 8:30 AM - 5:30 PM',
      mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3902.1!2d39.46!3d13.48!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sKedamay%20Weyane!5e0!3m2!1sen!2set!4v1710000000000',
      published: true,
    },
    {
      code: 'BR-003',
      name: 'Addis Abeba',
      location: 'Bole Medhanialem, Addis Ababa',
      manager: 'Aisha Hassan',
      status: 'OPERATIONAL',
      phonePrimary: '+251 11 661 2345',
      phoneSecondary: '+251 91 122 3344',
      officeHours: 'Mon-Fri 8:30 AM - 5:30 PM',
      mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3940.6128!2d38.7831!3d8.9953!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x164b850f9689f5c1%3A0x6a1c8b3f8e5c2d3a!2sBole%20Medhanialem%20Church!5e0!3m2!1sen!2set!4v1710000000000',
      published: true,
    },
    {
      code: 'BR-004',
      name: 'Adigrat',
      location: 'Main Road, Near Market Center',
      manager: 'Girmay Berhe',
      status: 'OPERATIONAL',
      phonePrimary: '0997346200',
      officeHours: 'Mon-Fri 8:30 AM - 5:30 PM',
      mapUrl: 'https://www.google.com/maps?q=Adigrat,Ethiopia&output=embed',
      published: true,
    },
    {
      code: 'BR-005',
      name: 'Adwa',
      location: 'Central Avenue, Near Municipality',
      manager: 'Teklehaimanot Kassa',
      status: 'OPERATIONAL',
      phonePrimary: '0997339200',
      officeHours: 'Mon-Fri 8:30 AM - 5:30 PM',
      mapUrl: 'https://www.google.com/maps?q=Adwa,Ethiopia&output=embed',
      published: true,
    },
    {
      code: 'BR-006',
      name: 'Shire',
      location: 'Downtown Service Zone',
      manager: 'Haileselassie Kahsay',
      status: 'OPERATIONAL',
      phonePrimary: '0997343200',
      officeHours: 'Mon-Fri 8:30 AM - 5:30 PM',
      mapUrl: 'https://www.google.com/maps?q=Shire,Ethiopia&output=embed',
      published: true,
    },
    {
      code: 'BR-007',
      name: 'AbiAdi',
      location: 'Town Center, Service Corridor',
      manager: 'Gebremeskel Tadesse',
      status: 'OPERATIONAL',
      phonePrimary: '0903212300',
      officeHours: 'Mon-Fri 8:30 AM - 5:30 PM',
      mapUrl: 'https://www.google.com/maps?q=Abi%20Adi,Ethiopia&output=embed',
      published: true,
    },
    {
      code: 'BR-008',
      name: 'Rama',
      location: 'Main Border Corridor',
      manager: 'Solomon Welde',
      status: 'OPERATIONAL',
      phonePrimary: '0903351300',
      officeHours: 'Mon-Fri 8:30 AM - 5:30 PM',
      mapUrl: 'https://www.google.com/maps?q=Rama,Ethiopia&output=embed',
      published: true,
    },
    {
      code: 'BR-009',
      name: 'Maychow',
      location: 'Commercial District, Main Street',
      manager: 'Mulugeta Abraha',
      status: 'OPERATIONAL',
      phonePrimary: '0903047300',
      officeHours: 'Mon-Fri 8:30 AM - 5:30 PM',
      mapUrl: 'https://www.google.com/maps?q=Maychew,Ethiopia&output=embed',
      published: true,
    },
  ];

  const branches = [];
  for (const b of branchesData) {
    const branch = await prisma.branch.create({ data: b });
    branches.push(branch);
  }
  console.log(`✅ Seeded ${branches.length} real operational branches`);

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
      name: 'Mekelle Head Office Manager',
      email: 'bm.mekelle@zemen.com',
      passwordHash: bmPassword,
      role: 'BRANCH_MANAGER' as const,
      branchId: branches[0].id,
      isActive: true,
    },
    {
      name: 'Addis Abeba Branch Manager',
      email: 'bm.addis@zemen.com',
      passwordHash: bmPassword,
      role: 'BRANCH_MANAGER' as const,
      branchId: branches[2].id,
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
    { key: 'primary_phone', value: '0953444411' },
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

  // ==========================================
  // 6. SEED REAL FAQS FROM WEBSITE
  // ==========================================
  console.log('❓ Seeding Real FAQs from Website...');
  const faqs = [
    { question: 'Who can become a member of Zemen Cooperative?', answer: 'Any Ethiopian resident or community group above the age of 18 with a stable source of income or interest in saving can become a member. We welcome individuals, NGOs, and businesses who share our vision of mutual growth.', category: 'Membership' },
    { question: 'What documents are required for membership?', answer: 'You will need a valid National Identity Card or Passport, two recent passport-sized photographs, and proof of your residential address (such as a utility bill or local government letter).', category: 'Membership' },
    { question: 'How long does the membership approval take?', answer: 'Typically, the review and approval process for a new membership application takes between 2 to 3 business days once all required documents are submitted and verified.', category: 'Membership' },
    { question: 'What KYC documents are mandatory for online applications?', answer: 'At minimum, applicants must provide a valid national ID or passport, a recent applicant photo, and proof of address when requested. For some loan products, additional documents such as bank statements, payslips, or business licenses are required.', category: 'KYC' },
    { question: 'Can I track my application after submission?', answer: 'Yes. After submission, you receive a reference number that can be used to track status updates such as Under Review, Pending Documents, Approved, or Rejected.', category: 'General' },
    { question: 'Can I apply for a loan immediately after joining?', answer: 'While some emergency products may be accessible sooner, most standard loan products require an active membership and a consistent savings history of at least 6 months to ensure financial stability and mutual trust.', category: 'Loans' },
    { question: 'Why was my application marked as pending documents?', answer: 'This status usually means one or more uploaded files are missing, expired, unclear, or do not match your submitted details. Re-uploading valid documents typically resumes the review quickly.', category: 'General' },
    { question: 'Can I apply for a loan or membership using my phone?', answer: 'Absolutely! Our website and digital application portal are fully optimized for mobile devices. You can complete forms, upload photos of your documents, and track your application status directly from your smartphone.', category: 'Digital Banking' },
    { question: 'What are the interest rates for loans and savings?', answer: 'Interest rates vary based on the specific product and market conditions. However, we pride ourselves on offering competitive savings dividends that outperform traditional banks and fair, transparent interest rates for our loan products. Please contact a branch for the latest specific rates.', category: 'General' },
    { question: 'Can I save my application and continue later?', answer: 'Yes, once you start an application, you can create a temporary account that allows you to save your progress. You will receive a link to your email to resume exactly where you left off.', category: 'Digital Banking' },
    { question: 'How are loan decisions made?', answer: 'Loan decisions are based on eligibility, repayment capacity, document verification, and product policy limits. Final approval is completed by authorized officers after internal review checks.', category: 'Loans' },
  ];

  for (const f of faqs) {
    const exists = await prisma.cmsFaq.findFirst({ where: { question: f.question } });
    if (!exists) {
      await prisma.cmsFaq.create({
        data: { question: f.question, answer: f.answer, category: f.category, published: true },
      });
    }
  }
  console.log(`✅ Seeded ${faqs.length} real FAQs from website`);

  console.log('\n🎉 Database Seed Completed Successfully with Real Website Branches & Content!');
  console.log('----------------------------------------------------');
  console.log('📍 Seeded Real Branches:');
  branchesData.forEach(b => console.log(`  • ${b.name} (${b.location})`));
  console.log('----------------------------------------------------');
  console.log('🔑 Credentials to log in:');
  console.log('  • Super Admin: admin@zemen.com / admin123');
  console.log('  • Mekelle Manager: bm.mekelle@zemen.com / bm123456');
  console.log('  • Addis Manager: bm.addis@zemen.com / bm123456');
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
