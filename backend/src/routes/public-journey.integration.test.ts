import test from 'node:test';
import assert from 'node:assert/strict';
import express, { Express } from 'express';
import request from 'supertest';
import prisma from '../config/database';
import applicationRoutes from './applications.routes';
import publicContentRoutes from './public-content.routes';

const createTestApp = (): Express => {
  const app = express();
  app.use(express.json());
  app.use('/api/applications', applicationRoutes);
  app.use('/api/content', publicContentRoutes);
  return app;
};

const original = {
  membershipFindUnique: prisma.membershipApplication.findUnique,
  loanFindUnique: prisma.loanApplication.findUnique,
  notificationCreate: prisma.notificationEvent.create,
  cmsNewsFindMany: prisma.cmsNews.findMany,
  cmsBranchFindMany: prisma.cmsBranch.findMany,
  branchFindMany: prisma.branch.findMany,
  cmsDownloadCategoryFindMany: prisma.cmsDownloadCategory.findMany,
  cmsDownloadFileFindMany: prisma.cmsDownloadFile.findMany,
  executeRawUnsafe: prisma.$executeRawUnsafe,
  queryRawUnsafe: prisma.$queryRawUnsafe,
};

const restorePrisma = () => {
  prisma.membershipApplication.findUnique = original.membershipFindUnique;
  prisma.loanApplication.findUnique = original.loanFindUnique;
  prisma.notificationEvent.create = original.notificationCreate;
  prisma.cmsNews.findMany = original.cmsNewsFindMany;
  prisma.cmsBranch.findMany = original.cmsBranchFindMany;
  prisma.branch.findMany = original.branchFindMany;
  prisma.cmsDownloadCategory.findMany = original.cmsDownloadCategoryFindMany;
  prisma.cmsDownloadFile.findMany = original.cmsDownloadFileFindMany;
  prisma.$executeRawUnsafe = original.executeRawUnsafe;
  prisma.$queryRawUnsafe = original.queryRawUnsafe;
};

test.afterEach(() => {
  restorePrisma();
});

test('integration: public status tracking returns membership application by reference number', async () => {
  prisma.membershipApplication.findUnique = (async ({ where }: { where: { referenceNo: string } }) => {
    if (where.referenceNo === 'MEM-2026-0001') {
      return {
        id: 'm-1',
        referenceNo: 'MEM-2026-0001',
        status: 'UNDER_REVIEW',
        submittedAt: new Date('2026-03-01T10:00:00.000Z'),
        reviewedAt: null,
        updatedAt: new Date('2026-03-02T10:00:00.000Z'),
      };
    }

    return null;
  }) as unknown as typeof prisma.membershipApplication.findUnique;

  prisma.loanApplication.findUnique = (async () => null) as unknown as typeof prisma.loanApplication.findUnique;

  const app = createTestApp();
  const response = await request(app).get('/api/applications/status/MEM-2026-0001');

  assert.equal(response.status, 200);
  assert.equal(response.body.applicationType, 'membership');
  assert.equal(response.body.application.referenceNo, 'MEM-2026-0001');
});

test('integration: public contact inquiry is accepted and persisted to notification events', async () => {
  let createCallCount = 0;

  prisma.notificationEvent.create = (async () => {
    createCallCount += 1;
    return {
      id: 'notif-1',
      status: 'INFO',
      title: 'Public Inquiry',
      recipient: 'member@example.com | +251911000111',
      type: 'PUBLIC_INQUIRY',
      timestamp: new Date('2026-03-26T00:00:00.000Z'),
      createdAt: new Date('2026-03-26T00:00:00.000Z'),
    };
  }) as unknown as typeof prisma.notificationEvent.create;

  const app = createTestApp();
  const response = await request(app).post('/api/content/inquiries').send({
    fullName: 'Public Member',
    message: 'I need help with my membership application status.',
    email: 'member@example.com',
    phone: '+251911000111',
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(createCallCount, 1);
});

test('integration: public news and downloads flows return published content', async () => {
  prisma.cmsNews.findMany = (async () => {
    return [
      {
        id: 'news-1',
        title: 'Digital Portal Update',
        excerpt: 'New features are now live.',
        content: 'Detailed release notes.',
        imageUrl: null,
        category: 'Updates',
        status: 'PUBLISHED',
        createdAt: new Date('2026-03-26T00:00:00.000Z'),
        updatedAt: new Date('2026-03-27T00:00:00.000Z'),
      },
    ];
  }) as unknown as typeof prisma.cmsNews.findMany;

  prisma.cmsDownloadCategory.findMany = (async () => {
    return [
      {
        id: 'cat-1',
        name: 'Forms',
      },
    ];
  }) as unknown as typeof prisma.cmsDownloadCategory.findMany;

  prisma.cmsDownloadFile.findMany = (async () => {
    return [
      {
        id: 'file-1',
        categoryId: 'cat-1',
        name: 'Membership Form',
        size: '120KB',
        type: 'PDF',
        link: '/uploads/cms-downloads/membership-form.pdf',
      },
    ];
  }) as unknown as typeof prisma.cmsDownloadFile.findMany;

  const app = createTestApp();

  const [newsResponse, downloadsResponse] = await Promise.all([
    request(app).get('/api/content/news'),
    request(app).get('/api/content/downloads'),
  ]);

  assert.equal(newsResponse.status, 200);
  assert.equal(newsResponse.body.news.length, 1);
  assert.equal(newsResponse.body.news[0].title, 'Digital Portal Update');

  assert.equal(downloadsResponse.status, 200);
  assert.equal(downloadsResponse.body.categories.length, 1);
  assert.equal(downloadsResponse.body.categories[0].files.length, 1);
});

test('integration: public branches prefer operational branch ids when names overlap', async () => {
  prisma.cmsBranch.findMany = (async () => {
    return [
      {
        id: 'cms-branch-1',
        name: 'Mekelle Branch',
        location: 'CMS Mekelle Location',
        officeHours: 'Mon-Fri 8:30 AM - 5:30 PM',
        mapUrl: 'https://maps.example/cms-mekelle',
        phonePrimary: null,
        phoneSecondary: null,
        published: true,
        createdAt: new Date('2026-03-26T00:00:00.000Z'),
        updatedAt: new Date('2026-03-27T00:00:00.000Z'),
      },
    ];
  }) as unknown as typeof prisma.cmsBranch.findMany;

  prisma.branch.findMany = (async () => {
    return [
      {
        id: 'op-branch-1',
        name: 'Mekelle Branch',
        location: 'Operational Mekelle Location',
      },
    ];
  }) as unknown as typeof prisma.branch.findMany;

  const app = createTestApp();
  const response = await request(app).get('/api/content/branches');

  assert.equal(response.status, 200);
  assert.equal(response.body.branches.length, 1);
  assert.equal(response.body.branches[0].id, 'cms-branch-1');
  assert.equal(response.body.branches[0].name, 'Mekelle Branch');
  assert.equal(response.body.branches[0].location, 'CMS Mekelle Location');
});
