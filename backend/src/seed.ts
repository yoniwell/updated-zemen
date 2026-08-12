import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

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
        status: 'OPERATIONAL'
      }
    }),
    prisma.branch.upsert({
      where: { code: 'BR-002' },
      update: {},
      create: {
        name: 'Mekelle Head Office',
        code: 'BR-002',
        location: 'Adi Hawesi, In front of IOM',
        manager: 'Dr. Silas Omari',
        status: 'OPERATIONAL'
      }
    }),
  ]);
  console.log(`Created ${branches.length} branches`);

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
      branchId: branches[0].id
    }
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
      branchId: branches[1].id
    }
  });

  console.log('Created admin users:', admin.email, loanOfficer.email);
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
