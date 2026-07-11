import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { recordSecurityEvent } from '../services/security-monitor.service';

const router = Router();

const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
    return forwarded.split(',')[0].trim();
  }

  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]);
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const normalizeServiceFeatures = (features: unknown): string[] => {
  if (Array.isArray(features)) {
    return features.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof features === 'string') {
    return features
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const optionalTrimmedString = (maxLength: number) =>
  z.preprocess((value) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }, z.string().max(maxLength).optional());

const submitInquirySchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  message: z.string().trim().min(10).max(2000),
  email: z.preprocess((value) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }, z.string().email().max(160).optional()),
  phone: z.preprocess((value) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }, z.string().max(30).regex(/^[+()\-\.\s\d]{7,30}$/, 'Invalid phone number format').optional()),
  website: optionalTrimmedString(200),
}).refine((data) => Boolean(data.email || data.phone), {
  message: 'Either email or phone is required',
  path: ['email'],
});

const INQUIRY_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const INQUIRY_RATE_LIMIT_MAX = 5;
const inquiryAttemptsByIp = new Map<string, number[]>();
const advancedInquiryRoutingEnabled = process.env.ENABLE_INQUIRY_ROUTING === 'true';
let inquiryRoutingTablesEnsured = false;

const isMySqlDatabase = (): boolean => {
  const url = (process.env.DATABASE_URL || '').toLowerCase();
  return url.startsWith('mysql://') || url.startsWith('mysqls://');
};

const isMissingTableError = (error: unknown): boolean => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
    return true;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes('does not exist') || message.includes("doesn't exist");
};

const ensureInquiryRoutingTables = async (): Promise<void> => {
  if (inquiryRoutingTablesEnsured) {
    return;
  }

  if (isMySqlDatabase()) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS notification_noise_controls (
        id INT PRIMARY KEY,
        throttle_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        dedup_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        throttle_window_minutes INT NOT NULL DEFAULT 10,
        dedup_window_minutes INT NOT NULL DEFAULT 60,
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS inquiry_routing_rules (
        id CHAR(36) PRIMARY KEY,
        keyword VARCHAR(191) NULL,
        destination VARCHAR(191) NOT NULL,
        sla_minutes INT NOT NULL DEFAULT 240,
        escalation_destination VARCHAR(191) NULL,
        priority INT NOT NULL DEFAULT 100,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX inquiry_routing_rules_priority_updated_at_idx (priority, updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS inquiry_notification_meta (
        notification_id CHAR(36) PRIMARY KEY,
        routed_to VARCHAR(191) NOT NULL,
        sla_due_at DATETIME(3) NULL,
        escalation_destination VARCHAR(191) NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
        last_escalated_at DATETIME(3) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX inquiry_notification_meta_status_sla_due_at_idx (status, sla_due_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } else {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS notification_noise_controls (
        id INTEGER PRIMARY KEY,
        throttle_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        dedup_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        throttle_window_minutes INTEGER NOT NULL DEFAULT 10,
        dedup_window_minutes INTEGER NOT NULL DEFAULT 60,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS inquiry_routing_rules (
        id UUID PRIMARY KEY,
        keyword TEXT NULL,
        destination TEXT NOT NULL,
        sla_minutes INTEGER NOT NULL DEFAULT 240,
        escalation_destination TEXT NULL,
        priority INTEGER NOT NULL DEFAULT 100,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await prisma.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS inquiry_routing_rules_priority_updated_at_idx ON inquiry_routing_rules (priority, updated_at)'
    );

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS inquiry_notification_meta (
        notification_id UUID PRIMARY KEY,
        routed_to TEXT NOT NULL,
        sla_due_at TIMESTAMPTZ NULL,
        escalation_destination TEXT NULL,
        status TEXT NOT NULL DEFAULT 'OPEN',
        last_escalated_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await prisma.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS inquiry_notification_meta_status_sla_due_at_idx ON inquiry_notification_meta (status, sla_due_at)'
    );
  }

  await prisma.notificationNoiseControl.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      throttleEnabled: true,
      dedupEnabled: true,
      throttleWindowMinutes: 10,
      dedupWindowMinutes: 60,
    },
  });

  await prisma.inquiryRoutingRule.upsert({
    where: { id: '00000000-0000-4000-8000-000000000100' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000100',
      keyword: null,
      destination: 'admin@zemensacco.local',
      slaMinutes: 240,
      escalationDestination: 'superadmin@zemensacco.local',
      priority: 999,
      isActive: true,
    },
  });

  inquiryRoutingTablesEnsured = true;
};

const isInquiryRateLimited = (ipAddress: string, now: number): boolean => {
  const existing = inquiryAttemptsByIp.get(ipAddress) || [];
  const recent = existing.filter((timestamp) => now - timestamp <= INQUIRY_RATE_LIMIT_WINDOW_MS);

  if (recent.length >= INQUIRY_RATE_LIMIT_MAX) {
    inquiryAttemptsByIp.set(ipAddress, recent);
    return true;
  }

  recent.push(now);
  inquiryAttemptsByIp.set(ipAddress, recent);
  return false;
};

// POST /api/content/inquiries
router.post('/inquiries', async (req: Request, res: Response): Promise<void> => {
  try {
    const now = Date.now();
    const ipAddress = getClientIp(req);
    if (isInquiryRateLimited(ipAddress, now)) {
      await recordSecurityEvent({
        endpoint: 'public-inquiry',
        eventType: 'INQUIRY_RATE_LIMITED',
        ipAddress,
      });
      console.warn('Public inquiry rate limit exceeded', { ipAddress });
      res.status(429).json({ error: 'Too many inquiry submissions. Please try again later.' });
      return;
    }

    const parsed = submitInquirySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid inquiry payload', details: parsed.error.issues });
      return;
    }

    const { fullName, message, email, phone, website } = parsed.data;

    if (website && website.trim().length > 0) {
      await recordSecurityEvent({
        endpoint: 'public-inquiry',
        eventType: 'INQUIRY_HONEYPOT_TRIGGERED',
        ipAddress,
      });
      console.warn('Public inquiry honeypot triggered', { ipAddress });
      res.status(201).json({ success: true });
      return;
    }

    const recipient = [email, phone].filter((value): value is string => Boolean(value && value.trim())).join(' | ') || fullName;
    const messagePreview = message.length > 120 ? `${message.slice(0, 117)}...` : message;
    const title = `Public Inquiry from ${fullName}: ${messagePreview}`;

    if (!advancedInquiryRoutingEnabled || process.env.NODE_ENV === 'test') {
      await prisma.notificationEvent.create({
        data: {
          id: randomUUID(),
          status: 'INFO',
          title,
          recipient,
          type: 'PUBLIC_INQUIRY',
        },
      });
      res.status(201).json({ success: true });
      return;
    }

    try {
      await ensureInquiryRoutingTables();
    } catch (error) {
      console.warn('Inquiry routing tables unavailable, continuing with base notification flow', error);
    }

    let routedTo = recipient;
    let matchedEscalationDestination: string | null = null;
    let slaDueAt = new Date(Date.now() + 240 * 60 * 1000);

    try {
      const rules = await prisma.inquiryRoutingRule.findMany({
        where: { isActive: true },
        orderBy: [{ priority: 'asc' }, { updatedAt: 'desc' }],
        select: {
          id: true,
          keyword: true,
          destination: true,
          slaMinutes: true,
          escalationDestination: true,
          priority: true,
        },
      });

      const haystack = `${fullName} ${message}`.toLowerCase();
      const matchedRule =
        rules.find((rule) => rule.keyword && haystack.includes(rule.keyword.toLowerCase())) ||
        rules.find((rule) => !rule.keyword) ||
        null;

      routedTo = matchedRule?.destination || recipient;
      matchedEscalationDestination = matchedRule?.escalationDestination || null;
      const slaMinutes = matchedRule?.slaMinutes || 240;
      slaDueAt = new Date(Date.now() + slaMinutes * 60 * 1000);

      const dedup =
        (await prisma.notificationNoiseControl.findUnique({
          where: { id: 1 },
          select: { dedupEnabled: true, dedupWindowMinutes: true },
        })) || { dedupEnabled: true, dedupWindowMinutes: 60 };

      if (dedup.dedupEnabled) {
        const dedupWindowStart = new Date(Date.now() - dedup.dedupWindowMinutes * 60 * 1000);
        const existing = await prisma.notificationEvent.count({
          where: {
            type: 'PUBLIC_INQUIRY',
            recipient: routedTo,
            title,
            timestamp: {
              gte: dedupWindowStart,
            },
          },
        });

        if (existing > 0) {
          res.status(201).json({ success: true, deduplicated: true });
          return;
        }
      }
    } catch (error) {
      console.warn('Inquiry routing/noise controls unavailable, using base recipient fallback', error);
    }

    const createdNotification = await prisma.notificationEvent.create({
      data: {
        id: randomUUID(),
        status: 'INFO',
        title,
        recipient: routedTo,
        type: 'PUBLIC_INQUIRY',
      },
      select: { id: true },
    });

    try {
      await prisma.inquiryNotificationMeta.create({
        data: {
          notificationId: createdNotification.id,
          routedTo,
          slaDueAt,
          escalationDestination: matchedEscalationDestination,
          status: 'OPEN',
        },
      });
    } catch {
      // best-effort metadata for SLA monitoring
    }

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Submit public inquiry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/content/faqs
router.get('/faqs', async (_req, res: Response): Promise<void> => {
  try {
    const faqs = await prisma.cmsFaq.findMany({
      where: { published: true },
      orderBy: [{ category: 'asc' }, { updatedAt: 'desc' }],
    });
    res.json({ faqs });
  } catch (error) {
    console.error('Public content faqs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/content/news
router.get('/news', async (req, res: Response): Promise<void> => {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));

    const news = await prisma.cmsNews.findMany({
      where: {
        status: 'PUBLISHED',
        ...(category ? { category } : {}),
        ...(query
          ? {
              OR: [
                { title: { contains: query } },
                { excerpt: { contains: query } },
                { content: { contains: query } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        excerpt: true,
        content: true,
        imageUrl: true,
        category: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      news: news.map((item) => ({
        ...item,
        slug: slugify(item.title),
      })),
    });
  } catch (error) {
    console.error('Public content news error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/content/news/:slugOrId
router.get('/news/:slugOrId', async (req, res: Response): Promise<void> => {
  try {
    const slugOrId = Array.isArray(req.params.slugOrId) ? req.params.slugOrId[0] : req.params.slugOrId;

    const byId = await prisma.cmsNews.findFirst({
      where: {
        id: slugOrId,
        status: 'PUBLISHED',
      },
      select: {
        id: true,
        title: true,
        excerpt: true,
        content: true,
        imageUrl: true,
        category: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (byId) {
      res.json({
        article: {
          ...byId,
          slug: slugify(byId.title),
        },
      });
      return;
    }

    const allPublished = await prisma.cmsNews.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        excerpt: true,
        content: true,
        imageUrl: true,
        category: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const article = allPublished.find((item) => slugify(item.title) === slugOrId);

    if (!article) {
      res.status(404).json({ error: 'News article not found' });
      return;
    }

    res.json({
      article: {
        ...article,
        slug: slugify(article.title),
      },
    });
  } catch (error) {
    console.error('Public content news detail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Public pages endpoint removed — CMS no longer exposes standalone pages

// GET /api/content/downloads
router.get('/downloads', async (_req, res: Response): Promise<void> => {
  try {
    const categories = await prisma.cmsDownloadCategory.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
      },
    });

    const files = await prisma.cmsDownloadFile.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        categoryId: true,
        name: true,
        size: true,
        type: true,
        link: true,
      },
    });

    const groupedMap = new Map<string, { id: string; title: string; files: Array<{ id: string; name: string; size: string; type: string; link: string }> }>();

    for (const category of categories) {
      const normalizedTitle = category.name.trim();
      const key = normalizedTitle.toLowerCase();
      const existing = groupedMap.get(key) || { id: category.id, title: normalizedTitle, files: [] };

      const seen = new Set(existing.files.map((file) => file.id));
      for (const file of files.filter((entry) => entry.categoryId === category.id)) {
        if (seen.has(file.id)) continue;
        seen.add(file.id);
        existing.files.push({
          id: file.id,
          name: file.name,
          size: file.size,
          type: file.type,
          link: file.link,
        });
      }

      groupedMap.set(key, existing);
    }

    const grouped = Array.from(groupedMap.values());

    res.json({ categories: grouped });
  } catch (error) {
    if (isMissingTableError(error)) {
      res.json({ categories: [] });
      return;
    }
    console.error('Public content downloads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/content/branches
router.get('/branches', async (_req, res: Response): Promise<void> => {
  try {
    const cmsBranches = await prisma.cmsBranch.findMany({
      where: { published: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        location: true,
        officeHours: true,
        mapUrl: true,
        phonePrimary: true,
        phoneSecondary: true,
      },
    });

    const cmsBranchContacts = await prisma.cmsBranch.findMany({
      where: {
        OR: [{ phonePrimary: { not: null } }, { phoneSecondary: { not: null } }],
      },
      orderBy: { name: 'asc' },
      select: {
        name: true,
        phonePrimary: true,
        phoneSecondary: true,
      },
    });

    const branches = cmsBranches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      location: branch.location,
      officeHours: branch.officeHours,
      mapUrl: branch.mapUrl,
    }));

    const phoneContacts = cmsBranchContacts
      .flatMap((branch) => [
        { name: branch.name, number: branch.phonePrimary?.trim() || '' },
        { name: branch.name, number: branch.phoneSecondary?.trim() || '' },
      ])
      .filter((contact) => contact.number.length > 0);

    res.json({
      branches,
      phoneContacts,
      phoneNumbers: Array.from(
        new Set(
          cmsBranchContacts
            .flatMap((branch) => [branch.phonePrimary, branch.phoneSecondary])
            .filter((phone): phone is string => Boolean(phone && phone.trim()))
        )
      ),
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      res.json({ branches: [], phoneContacts: [], phoneNumbers: [] });
      return;
    }
    console.error('Public content branches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/content/services
router.get('/services', async (_req, res: Response): Promise<void> => {
  try {
    const services = await prisma.cmsService.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        title: true,
        description: true,
        features: true,
        ctaLabel: true,
        ctaPath: true,
        sortOrder: true,
        status: true,
      },
    });

    res.json({
      services: services.map((service) => ({
        ...service,
        features: normalizeServiceFeatures(service.features),
      })),
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      res.json({ services: [] });
      return;
    }
    console.error('Public content services error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/content/savings
router.get('/savings', async (_req, res: Response): Promise<void> => {
  try {
    const savings = await prisma.cmsSaving.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        title: true,
        description: true,
        features: true,
        ctaLabel: true,
        ctaPath: true,
        sortOrder: true,
        status: true,
      },
    });

    res.json({
      savings: savings.map((s) => ({ ...s, features: normalizeServiceFeatures(s.features) })),
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      res.json({ savings: [] });
      return;
    }
    console.error('Public content savings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/content/loan-products
router.get('/loan-products', async (_req, res: Response): Promise<void> => {
  try {
    const loanProducts = await prisma.cmsLoanProduct.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        purpose: true,
        suited: true,
        docs: true,
        status: true,
        maxAmount: true,
        interestRate: true,
        maxTerm: true,
        color: true,
        sortOrder: true,
      },
    });

    res.json({ loanProducts });
  } catch (error) {
    if (isMissingTableError(error)) {
      res.json({ loanProducts: [] });
      return;
    }
    console.error('Public content loan products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/content/announcements
router.get('/announcements', async (_req, res: Response): Promise<void> => {
  try {
    const announcements = await prisma.cmsAnnouncement.findMany({
      where: {
        status: {
          in: ['Active', 'Scheduled'],
        },
      },
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        title: true,
        content: true,
        type: true,
        status: true,
        startDate: true,
        endDate: true,
        placement: true,
      },
    });

    res.json({ announcements });
  } catch (error) {
    if (isMissingTableError(error)) {
      res.json({ announcements: [] });
      return;
    }
    console.error('Public content announcements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;