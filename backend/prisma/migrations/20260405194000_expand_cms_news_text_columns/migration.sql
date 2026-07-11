-- Expand CMS news text fields to avoid truncation on long article content
ALTER TABLE `cms_news`
  MODIFY COLUMN `excerpt` TEXT NOT NULL,
  MODIFY COLUMN `content` TEXT NULL,
  MODIFY COLUMN `imageUrl` TEXT NULL;
