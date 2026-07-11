import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultCmsServices = [
  {
    title: 'Savings',
    description: 'High-yield accounts with zero fees.',
    features: ['Zero Fees', 'Daily Interest', 'Instant Access'],
    ctaLabel: 'Learn More',
    ctaPath: '/savings',
    sortOrder: 1,
  },
  {
    title: 'Loan Products',
    description: 'Access flexible loan options with fair rates to support your personal, business, or emergency needs.',
    features: ['Fast Approval', 'No Hidden Charges', 'Expert Advisory'],
    ctaLabel: 'Apply Now',
    ctaPath: '/loans',
    sortOrder: 2,
  },
  {
    title: 'Membership Benefits',
    description: 'Enjoy exclusive benefits, including dividend shares and community support as a valued member.',
    features: ['Annual Dividends', 'Voting Rights', 'Community Events'],
    ctaLabel: 'See Benefits',
    ctaPath: '/membership',
    sortOrder: 3,
  },
  {
    title: 'Digital Services',
    description: 'Manage your accounts, apply for loans, and more through our modern digital platform.',
    features: ['Mobile Access', 'SMS Alerts', 'Secure Login'],
    ctaLabel: 'Go Digital',
    ctaPath: '/how-to-apply',
    sortOrder: 4,
  },
];

const defaultCmsSavings = [
  {
    title: 'Regular Compulsory Savings',
    description: 'The foundation of your SACCO membership. Build a strong financial base while unlocking access to our loan products.',
    features: ['Minimum ETB 500/month', 'Qualifies you for loans instantly', 'Earns annual dividends', 'Safe and secure'],
    ctaLabel: 'Learn More',
    ctaPath: '/savings',
    sortOrder: 1,
  },
  {
    title: 'Voluntary Savings',
    description: 'Flexible savings for your specific goals. Deposit and withdraw at your convenience while earning competitive interest.',
    features: ['No minimum balance required', 'Flexible deposits', 'Withdraw anytime', 'Competitive interest rate'],
    ctaLabel: 'Learn More',
    ctaPath: '/savings',
    sortOrder: 2,
  },
  {
    title: "Children's Savings Account",
    description: "Secure your child's future with an account that grows with them. Ideal for education, first car, or starting capital.",
    features: ['High-yield interest', 'Educational bonuses', 'Parent-controlled until 18', 'No monthly fees'],
    ctaLabel: 'Learn More',
    ctaPath: '/savings',
    sortOrder: 3,
  },
  {
    title: 'Fixed Deposit Account',
    description: 'Lock away a lump sum for a fixed period to guarantee our highest interest rates. Perfect for long-term investments.',
    features: ['Highest interest rates', '3, 6, 12, or 24-month terms', 'Guaranteed returns', 'Interest paid on maturity'],
    ctaLabel: 'Learn More',
    ctaPath: '/savings',
    sortOrder: 4,
  },
  {
    title: 'Target Savings',
    description: 'Save towards a specific goal-like a wedding, vacation, or down payment. Automatically lock funds until target date.',
    features: ['Goal-oriented', 'Automated transfers', 'Bonus interest on completion', 'Penalty for early withdrawal'],
    ctaLabel: 'Learn More',
    ctaPath: '/savings',
    sortOrder: 5,
  },
  {
    title: 'Retirement Savings Plan',
    description: 'Specialized long-term savings to ensure a comfortable future. Tax-efficient and highly secure growth.',
    features: ['Tax benefits', 'Compound interest', 'Retirement planning advice', 'Lump-sum or annuity payout'],
    ctaLabel: 'Learn More',
    ctaPath: '/savings',
    sortOrder: 6,
  },
];

async function main() {
  console.log('Seeding public CMS content...');

  for (const s of defaultCmsServices) {
    const existing = await prisma.cmsService.findFirst({ where: { title: s.title }, select: { id: true } });
    if (existing) {
      await prisma.cmsService.update({ where: { id: existing.id }, data: {
        description: s.description,
        features: s.features as any,
        ctaLabel: s.ctaLabel,
        ctaPath: s.ctaPath,
        sortOrder: s.sortOrder,
        status: 'PUBLISHED',
      } });
    } else {
      await prisma.cmsService.create({ data: {
        title: s.title,
        description: s.description,
        features: s.features as any,
        ctaLabel: s.ctaLabel,
        ctaPath: s.ctaPath,
        sortOrder: s.sortOrder,
        status: 'PUBLISHED',
      } });
    }
  }

  for (const s of defaultCmsSavings) {
    const existing = await prisma.cmsSaving.findFirst({ where: { title: s.title }, select: { id: true } });
    if (existing) {
      await prisma.cmsSaving.update({ where: { id: existing.id }, data: {
        description: s.description,
        features: s.features as any,
        ctaLabel: s.ctaLabel,
        ctaPath: s.ctaPath,
        sortOrder: s.sortOrder,
        status: 'PUBLISHED',
      } });
    } else {
      await prisma.cmsSaving.create({ data: {
        title: s.title,
        description: s.description,
        features: s.features as any,
        ctaLabel: s.ctaLabel,
        ctaPath: s.ctaPath,
        sortOrder: s.sortOrder,
        status: 'PUBLISHED',
      } });
    }
  }

  console.log('Public CMS content seeded.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
