import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

const branchesToSeed = [
  {
    name: 'Mekelle Head Office',
    code: 'MEK-HO',
    location: 'Hawezien Adebaby, Mekelle, Tigray, Ethiopia',
    status: 'OPERATIONAL',
    phonePrimary: '0953 44 44 11',
    officeHours: 'Mon-Fri 8:00 AM - 5:00 PM, Sat 8:00 AM - 12:00 PM',
    mapUrl: 'https://www.google.com/maps?q=Mekelle,Ethiopia&output=embed',
    published: true,
  },
  {
    name: 'Adigrat',
    code: 'ADI-01',
    location: 'Main Road, Adigrat',
    status: 'OPERATIONAL',
    phonePrimary: '0997 34 62 00',
    officeHours: 'Mon-Fri 8:00 AM - 5:00 PM, Sat 8:00 AM - 12:00 PM',
    mapUrl: 'https://www.google.com/maps?q=Adigrat,Ethiopia&output=embed',
    published: true,
  },
  {
    name: 'Adwa',
    code: 'ADW-01',
    location: 'Central Square, Adwa',
    status: 'OPERATIONAL',
    phonePrimary: '0997 33 92 00',
    officeHours: 'Mon-Fri 8:00 AM - 5:00 PM, Sat 8:00 AM - 12:00 PM',
    mapUrl: 'https://www.google.com/maps?q=Adwa,Ethiopia&output=embed',
    published: true,
  },
  {
    name: 'Shire',
    code: 'SHI-01',
    location: 'Market District, Shire',
    status: 'OPERATIONAL',
    phonePrimary: '0997 34 32 00',
    officeHours: 'Mon-Fri 8:00 AM - 5:00 PM, Sat 8:00 AM - 12:00 PM',
    mapUrl: 'https://www.google.com/maps?q=Shire,Ethiopia&output=embed',
    published: true,
  },
  {
    name: 'Mekelle',
    code: 'MEK-01',
    location: 'Romanat Square, Mekelle',
    status: 'OPERATIONAL',
    phonePrimary: '0997 34 42 00',
    officeHours: 'Mon-Fri 8:00 AM - 5:00 PM, Sat 8:00 AM - 12:00 PM',
    mapUrl: 'https://www.google.com/maps?q=Mekelle,Ethiopia&output=embed',
    published: true,
  },
  {
    name: 'AbiAdi',
    code: 'ABI-01',
    location: 'City Center, AbiAdi',
    status: 'OPERATIONAL',
    phonePrimary: '0903 21 23 00',
    officeHours: 'Mon-Fri 8:00 AM - 5:00 PM, Sat 8:00 AM - 12:00 PM',
    mapUrl: 'https://www.google.com/maps?q=AbiAdi,Ethiopia&output=embed',
    published: true,
  },
  {
    name: 'Rama',
    code: 'RAM-01',
    location: 'Main Border Corridor, Rama',
    status: 'OPERATIONAL',
    phonePrimary: '0903 35 13 00',
    officeHours: 'Mon-Fri 8:00 AM - 5:00 PM, Sat 8:00 AM - 12:00 PM',
    mapUrl: 'https://www.google.com/maps?q=Rama,Ethiopia&output=embed',
    published: true,
  },
  {
    name: 'Maychew',
    code: 'MAY-01',
    location: 'Downtown, Maychew',
    status: 'OPERATIONAL',
    phonePrimary: '0903 04 73 00',
    officeHours: 'Mon-Fri 8:00 AM - 5:00 PM, Sat 8:00 AM - 12:00 PM',
    mapUrl: 'https://www.google.com/maps?q=Maychew,Ethiopia&output=embed',
    published: true,
  },
];

async function seedBranches() {
  console.log('Starting to seed branches...');
  
  for (const branch of branchesToSeed) {
    const existing = await prisma.branch.findFirst({
      where: { name: branch.name }
    });

    if (!existing) {
      await prisma.branch.create({
        data: {
          id: uuidv4(),
          ...branch,
          // Make sure it matches Prisma schema Types
          status: branch.status as any,
        }
      });
      console.log(`Created branch: ${branch.name}`);
    } else {
      console.log(`Branch already exists: ${branch.name}`);
    }
  }

  console.log('Seeding completed.');
}

seedBranches()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
