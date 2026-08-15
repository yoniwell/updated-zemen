import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Saving Types ────────────────────────────────────────────────────────────
  const savingTypes = [
    { name: 'Regular Saving' },
    { name: "Children's Saving" },
    { name: 'Time Deposit Saving' },
    { name: 'Non-Interest Bearing Saving' },
    { name: 'Diaspora Saving' },
    { name: 'Vehicle & House Saving' },
    { name: 'Choice Saving' },
    { name: 'Youth Saving' },
    { name: 'Senior Saving' },
  ];

  for (const st of savingTypes) {
    await prisma.savingTypeConfig.upsert({
      where: { name_category: { name: st.name, category: 'Standard' } },
      update: {},
      create: { name: st.name, category: 'Standard', isActive: true },
    });
  }
  console.log(`✅ Seeded ${savingTypes.length} saving types`);

  // ─── Loan Types ──────────────────────────────────────────────────────────────
  const loanTypes = [
    { name: 'Personal Loan',   minAmount: 5000,    maxAmount: 500000,    minTenure: 3,  maxTenure: 36  },
    { name: 'Business Loan',   minAmount: 50000,   maxAmount: 5000000,   minTenure: 6,  maxTenure: 84  },
    { name: 'Agricultural Loan', minAmount: 10000, maxAmount: 1000000,   minTenure: 6,  maxTenure: 60  },
    { name: 'Housing Loan',    minAmount: 100000,  maxAmount: 10000000,  minTenure: 12, maxTenure: 120 },
    { name: 'Emergency Loan',  minAmount: 1000,    maxAmount: 50000,     minTenure: 1,  maxTenure: 12  },
    { name: 'Education Loan',  minAmount: 5000,    maxAmount: 200000,    minTenure: 3,  maxTenure: 48  },
    { name: 'Vehicle Loan',    minAmount: 50000,   maxAmount: 2000000,   minTenure: 6,  maxTenure: 60  },
    { name: 'Salary Advance',  minAmount: 1000,    maxAmount: 30000,     minTenure: 1,  maxTenure: 6   },
  ];

  for (const lt of loanTypes) {
    await prisma.loanTypeConfig.upsert({
      where: { name_category: { name: lt.name, category: 'Standard' } },
      update: { minAmount: lt.minAmount, maxAmount: lt.maxAmount, minTenure: lt.minTenure, maxTenure: lt.maxTenure },
      create: { name: lt.name, category: 'Standard', isActive: true, minAmount: lt.minAmount, maxAmount: lt.maxAmount, minTenure: lt.minTenure, maxTenure: lt.maxTenure },
    });
  }
  console.log(`✅ Seeded ${loanTypes.length} loan types`);

  // ─── Download Categories ─────────────────────────────────────────────────────
  const downloadCategories = [
    { name: 'Application Forms',         sortOrder: 0 },
    { name: 'Policies & Guidelines',     sortOrder: 1 },
    { name: 'Reports & Financials',      sortOrder: 2 },
    { name: 'Compliance & Security',     sortOrder: 3 },
  ];

  for (const dc of downloadCategories) {
    const existing = await prisma.downloadCategory.findFirst({ where: { name: dc.name } });
    if (!existing) {
      await prisma.downloadCategory.create({ data: { name: dc.name, sortOrder: dc.sortOrder, published: true } });
    }
  }
  console.log(`✅ Seeded ${downloadCategories.length} download categories`);

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
