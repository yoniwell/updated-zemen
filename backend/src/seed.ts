import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seed...');

  // 1. Create default branches
  const branches = await Promise.all([
    prisma.branch.upsert({
      where: { code: 'BR-001' },
      update: {},
      create: {
        name: 'Addis Ababa HQ',
        code: 'BR-001',
        location: 'Bole Medhanialem, Addis Ababa',
        manager: 'Aisha Hassan',
        status: 'OPERATIONAL',
      },
    }),
    prisma.branch.upsert({
      where: { code: 'BR-002' },
      update: {},
      create: {
        name: 'Mekelle Head Office',
        code: 'BR-002',
        location: 'Adi Hawesi, In front of IOM',
        manager: 'Dr. Silas Omari',
        status: 'OPERATIONAL',
      },
    }),
  ]);
  console.log(`✅ Seeded ${branches.length} branches`);

  // 2. Create Super Admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@zemen.com' },
    update: {},
    create: {
      name: 'System Administrator',
      email: 'admin@zemen.com',
      passwordHash: adminPassword,
      role: 'SUPER_ADMIN',
      isActive: true,
      branchId: branches[0].id,
    },
  });

  const officerPassword = await bcrypt.hash('officer123', 10);
  const loanOfficer = await prisma.adminUser.upsert({
    where: { email: 'officer@zemen.com' },
    update: {},
    create: {
      name: 'Elena Aris',
      email: 'officer@zemen.com',
      passwordHash: officerPassword,
      role: 'OFFICER',
      isActive: true,
      branchId: branches[1].id,
    },
  });

  console.log(`✅ Seeded Admin users (${admin.email}, ${loanOfficer.email})`);

  // 3. Seed Saving Types Config
  const savingTypes = [
    { name: 'Regular Saving', minAmount: 100, maxAmount: 1000000 },
    { name: "Children's Saving", minAmount: 50, maxAmount: 500000 },
    { name: 'Time Deposit Saving', minAmount: 5000, maxAmount: 10000000 },
    { name: 'Non-Interest Bearing Saving', minAmount: 100, maxAmount: 5000000 },
    { name: 'Diaspora Saving', minAmount: 500, maxAmount: 10000000 },
    { name: 'Vehicle & House Saving', minAmount: 1000, maxAmount: 5000000 },
    { name: 'Choice Saving', minAmount: 100, maxAmount: 2000000 },
    { name: 'Youth Saving', minAmount: 50, maxAmount: 300000 },
    { name: 'Senior Saving', minAmount: 100, maxAmount: 1000000 },
  ];

  for (const st of savingTypes) {
    await prisma.savingTypeConfig.upsert({
      where: { name: st.name },
      update: { minAmount: st.minAmount, maxAmount: st.maxAmount },
      create: { name: st.name, minAmount: st.minAmount, maxAmount: st.maxAmount, isActive: true },
    });
  }
  console.log(`✅ Seeded ${savingTypes.length} saving types`);

  // 4. Seed Loan Types Config
  const loanTypes = [
    { name: 'Personal Loan', minAmount: 5000, maxAmount: 500000, minTenure: 3, maxTenure: 36 },
    { name: 'Business Loan', minAmount: 50000, maxAmount: 5000000, minTenure: 6, maxTenure: 84 },
    { name: 'Agricultural Loan', minAmount: 10000, maxAmount: 1000000, minTenure: 6, maxTenure: 60 },
    { name: 'Housing Loan', minAmount: 100000, maxAmount: 10000000, minTenure: 12, maxTenure: 120 },
    { name: 'Emergency Loan', minAmount: 1000, maxAmount: 50000, minTenure: 1, maxTenure: 12 },
    { name: 'Education Loan', minAmount: 5000, maxAmount: 200000, minTenure: 3, maxTenure: 48 },
    { name: 'Vehicle Loan', minAmount: 50000, maxAmount: 2000000, minTenure: 6, maxTenure: 60 },
    { name: 'Salary Advance', minAmount: 1000, maxAmount: 30000, minTenure: 1, maxTenure: 6 },
  ];

  for (const lt of loanTypes) {
    await prisma.loanTypeConfig.upsert({
      where: { name: lt.name },
      update: { minAmount: lt.minAmount, maxAmount: lt.maxAmount, minTenure: lt.minTenure, maxTenure: lt.maxTenure },
      create: { name: lt.name, isActive: true, minAmount: lt.minAmount, maxAmount: lt.maxAmount, minTenure: lt.minTenure, maxTenure: lt.maxTenure },
    });
  }
  console.log(`✅ Seeded ${loanTypes.length} loan types`);

  // 5. Seed Download Categories & Sample Files
  const downloadCategories = [
    { name: 'Application Forms', sortOrder: 0 },
    { name: 'Policies & Guidelines', sortOrder: 1 },
    { name: 'Reports & Financials', sortOrder: 2 },
    { name: 'Compliance & Security', sortOrder: 3 },
  ];

  for (const dc of downloadCategories) {
    let cat = await prisma.downloadCategory.findFirst({ where: { name: dc.name } });
    if (!cat) {
      cat = await prisma.downloadCategory.create({
        data: { name: dc.name, sortOrder: dc.sortOrder, published: true },
      });
    }

    // Seed sample files if category has no files
    const fileCount = await prisma.downloadFile.count({ where: { categoryId: cat.id } });
    if (fileCount === 0) {
      if (dc.name === 'Application Forms') {
        await prisma.downloadFile.createMany({
          data: [
            { categoryId: cat.id, name: 'Membership Application Form.pdf', fileSize: '245 KB', fileType: 'PDF', fileUrl: '/uploads/sample_membership_form.pdf', published: true, sortOrder: 0 },
            { categoryId: cat.id, name: 'Loan Request Application Form.pdf', fileSize: '320 KB', fileType: 'PDF', fileUrl: '/uploads/sample_loan_form.pdf', published: true, sortOrder: 1 },
          ],
        });
      } else if (dc.name === 'Policies & Guidelines') {
        await prisma.downloadFile.createMany({
          data: [
            { categoryId: cat.id, name: 'SACCO Credit Policy Manual 2026.pdf', fileSize: '1.4 MB', fileType: 'PDF', fileUrl: '/uploads/sample_credit_policy.pdf', published: true, sortOrder: 0 },
            { categoryId: cat.id, name: 'Savings & Interest Rate Terms.pdf', fileSize: '180 KB', fileType: 'PDF', fileUrl: '/uploads/sample_savings_terms.pdf', published: true, sortOrder: 1 },
          ],
        });
      }
    }
  }
  console.log(`✅ Seeded ${downloadCategories.length} download categories with initial sample files`);

  // 6. Seed Sample News Articles
  const newsCount = await prisma.news.count();
  if (newsCount === 0) {
    await prisma.news.createMany({
      data: [
        {
          title: 'Zemen SACCO Annual General Meeting 2026 Announced',
          excerpt: 'Join us for our annual members conference discussing performance, dividend declarations, and future expansion plans.',
          content: 'Zemen SACCO is pleased to invite all active members to the 2026 Annual General Meeting. Key agenda items include financial performance reports, dividend distributions, and board member elections.',
          category: 'Announcements',
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
        {
          title: 'New Digital Loan Portal Launched',
          excerpt: 'Apply for personal and business loans online with instant branch routing and real-time application tracking.',
          content: 'Our new digital loan portal allows members to complete applications, submit required documents, and track approval status directly from their mobile phones or laptops.',
          category: 'Digital Banking',
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      ],
    });
    console.log('✅ Seeded sample news articles');
  }

  console.log('🎉 Comprehensive database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
