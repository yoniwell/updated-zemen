-- Public CMS tables for Downloads and Contact Branches

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS cms_download_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cms_download_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "categoryId" UUID NOT NULL,
  name TEXT NOT NULL,
  size TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'PDF',
  link TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT cms_download_files_category_fk FOREIGN KEY ("categoryId") REFERENCES cms_download_categories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS cms_download_categories_sort_idx ON cms_download_categories ("sortOrder", name);
CREATE INDEX IF NOT EXISTS cms_download_files_category_sort_idx ON cms_download_files ("categoryId", "sortOrder", name);

CREATE TABLE IF NOT EXISTS cms_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  "officeHours" TEXT NOT NULL,
  "mapUrl" TEXT NOT NULL,
  "phonePrimary" TEXT,
  "phoneSecondary" TEXT,
  published BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cms_branches_name_idx ON cms_branches (name);
CREATE INDEX IF NOT EXISTS cms_branches_published_idx ON cms_branches (published);
