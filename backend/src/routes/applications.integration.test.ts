import test from 'node:test';
import assert from 'node:assert/strict';
import express, { Express } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import prisma from '../config/database';
import applicationRoutes from './applications.routes';

const createTestApp = (): Express => {
  const app = express();
  app.use(express.json());
  app.use('/api/applications', applicationRoutes);
  return app;
};

const original = {
  membershipFindUnique: prisma.membershipApplication.findUnique,
  loanFindUnique: prisma.loanApplication.findUnique,
  documentCreate: prisma.document.create,
};

const restorePrisma = () => {
  prisma.membershipApplication.findUnique = original.membershipFindUnique;
  prisma.loanApplication.findUnique = original.loanFindUnique;
  prisma.document.create = original.documentCreate;
};

test.afterEach(() => {
  restorePrisma();
});

test('integration: loan uploads accept loan document categories', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loan-upload-'));
  const filePath = path.join(tempDir, 'loan-application-letter.pdf');
  fs.writeFileSync(filePath, Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF'));

  prisma.membershipApplication.findUnique = (async () => null) as unknown as typeof prisma.membershipApplication.findUnique;
  prisma.loanApplication.findUnique = (async ({ where }: { where: { id: string } }) => {
    if (where.id === 'loan-1') {
      return { id: 'loan-1' };
    }

    return null;
  }) as unknown as typeof prisma.loanApplication.findUnique;

  prisma.document.create = (async ({ data }: { data: { category: string; originalName: string } }) => ({
    id: 'doc-1',
    category: data.category,
    originalName: data.originalName,
    storedName: 'stored.pdf',
    mimeType: 'application/pdf',
    size: 48,
  })) as unknown as typeof prisma.document.create;

  const app = createTestApp();
  const response = await request(app)
    .post('/api/applications/loan-1/upload')
    .field('category', 'LOAN_APPLICATION_LETTER')
    .attach('file', filePath, { filename: 'loan-application-letter.pdf', contentType: 'application/pdf' });

  assert.equal(response.status, 201);
  assert.equal(response.body.document.category, 'LOAN_APPLICATION_LETTER');
  assert.equal(response.body.document.originalName, 'loan-application-letter.pdf');
});

test('integration: loan image uploads are accepted when mime type is generic', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loan-upload-jpg-'));
  const filePath = path.join(tempDir, 'id-front-photo.jpg');
  fs.writeFileSync(filePath, Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06]));

  prisma.membershipApplication.findUnique = (async () => null) as unknown as typeof prisma.membershipApplication.findUnique;
  prisma.loanApplication.findUnique = (async ({ where }: { where: { id: string } }) => {
    if (where.id === 'loan-1') {
      return { id: 'loan-1' };
    }

    return null;
  }) as unknown as typeof prisma.loanApplication.findUnique;

  prisma.document.create = (async ({ data }: { data: { category: string; originalName: string; mimeType: string } }) => ({
    id: 'doc-2',
    category: data.category,
    originalName: data.originalName,
    storedName: 'stored.jpg',
    mimeType: data.mimeType,
    size: 12,
  })) as unknown as typeof prisma.document.create;

  const app = createTestApp();
  const response = await request(app)
    .post('/api/applications/loan-1/upload')
    .field('category', 'ID_FRONT_PHOTO')
    .attach('file', filePath, { filename: 'id-front-photo.jpg', contentType: 'application/octet-stream' });

  assert.equal(response.status, 201);
  assert.equal(response.body.document.category, 'ID_FRONT_PHOTO');
  assert.equal(response.body.document.originalName, 'id-front-photo.jpg');
});
