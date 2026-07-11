CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS cms_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  description TEXT NOT NULL,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  "ctaLabel" TEXT,
  "ctaPath" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_services_status ON cms_services(status);
CREATE INDEX IF NOT EXISTS idx_cms_services_order ON cms_services("sortOrder");

CREATE TABLE IF NOT EXISTS cms_loan_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  suited TEXT NOT NULL,
  docs TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  "maxAmount" TEXT NOT NULL,
  "interestRate" TEXT NOT NULL,
  "maxTerm" TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'border-l-primary',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_loan_products_status ON cms_loan_products(status);
CREATE INDEX IF NOT EXISTS idx_cms_loan_products_order ON cms_loan_products("sortOrder");

CREATE TABLE IF NOT EXISTS cms_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Info',
  status TEXT NOT NULL DEFAULT 'Scheduled',
  "startDate" TIMESTAMPTZ NOT NULL,
  "endDate" TIMESTAMPTZ,
  placement TEXT NOT NULL DEFAULT 'Banner',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_announcements_status ON cms_announcements(status);
CREATE INDEX IF NOT EXISTS idx_cms_announcements_window ON cms_announcements("startDate", "endDate");
