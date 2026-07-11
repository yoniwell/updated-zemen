const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || 'admin@zemen.com';
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || 'admin123';

const VIEWPORTS = [
  { name: '320x800', width: 320, height: 800 },
  { name: '375x812', width: 375, height: 812 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1024x768', width: 1024, height: 768 },
];

const PUBLIC_ROUTES = [
  '/',
  '/membership',
  '/loans',
  '/services',
  '/about',
  '/news',
  '/contact',
  '/membership-apply',
  '/loan-apply',
  '/status',
];

const ADMIN_ROUTES = ['/admin', '/admin/membership-queue', '/admin/loan-queue'];

const timestamp = new Date().toISOString().replace(/[.:]/g, '-');
const outRoot = path.join(process.cwd(), 'qa-artifacts', 'phase2-responsive', timestamp);
const screenshotsRoot = path.join(outRoot, 'screenshots');

fs.mkdirSync(screenshotsRoot, { recursive: true });

function sanitizeRoute(route) {
  if (route === '/') return 'home';
  return route.replace(/^\//, '').replace(/\//g, '__').replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function safeGoto(page, route) {
  const target = `${BASE_URL}${route}`;
  await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(1200);
}

async function getNewsDetailRoute(browser) {
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const page = await context.newPage();

  try {
    await safeGoto(page, '/news');
    const href = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      for (const link of links) {
        const hrefValue = link.getAttribute('href') || '';
        if (hrefValue.startsWith('/news/') && hrefValue.length > '/news/'.length) {
          return hrefValue;
        }
      }
      return null;
    });

    return href;
  } catch {
    return null;
  } finally {
    await context.close();
  }
}

async function loginAdmin(page) {
  await safeGoto(page, '/admin/login');

  const emailInput = page.locator('#admin-email');
  if ((await emailInput.count()) === 0) {
    return { success: false, reason: 'Admin login form not found' };
  }

  await emailInput.fill(ADMIN_EMAIL);
  await page.locator('#admin-password').fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();

  try {
    await page.waitForURL(/\/admin(\/|$)/, { timeout: 10000 });
  } catch {
    return { success: false, reason: 'Admin login did not redirect to /admin' };
  }

  const loginStillVisible = (await page.locator('#admin-email').count()) > 0;
  if (loginStillVisible) {
    return { success: false, reason: 'Admin login remained on login page' };
  }

  return { success: true };
}

async function collectCommonChecks(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const hasHeaderOrNav = Boolean(document.querySelector('header, nav'));
    return {
      noHorizontalOverflow: doc.scrollWidth <= window.innerWidth + 1,
      hasHeaderOrNav,
      viewportWidth: window.innerWidth,
      pageScrollWidth: doc.scrollWidth,
    };
  });
}

async function collectHomeChecks(page) {
  return page.evaluate(() => {
    const clickables = Array.from(document.querySelectorAll('a, button'));
    const actionRegex = /(join|member|membership|loan|apply|track|status|become)/i;

    const conversionCandidates = clickables
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const text = (el.textContent || '').trim();
        const visibleInViewport = rect.bottom > 0 && rect.top < window.innerHeight;
        const wideEnough = rect.width >= 40;
        const tallEnough = rect.height >= 30;
        return {
          text,
          visibleInViewport,
          actionable: actionRegex.test(text),
          wideEnough,
          tallEnough,
        };
      })
      .filter((item) => item.visibleInViewport && item.actionable && item.wideEnough && item.tallEnough);

    const uniqueLabels = Array.from(new Set(conversionCandidates.map((item) => item.text).filter(Boolean)));

    return {
      conversionActionsInFirstViewport: uniqueLabels.length,
      sampleActions: uniqueLabels.slice(0, 8),
    };
  });
}

async function collectPortalChecks(page) {
  return page.evaluate(() => {
    const stickyBar = document.querySelector('div.fixed.inset-x-0.bottom-0');
    const progressPanel = document.querySelector('[aria-label="Application progress panel"]');

    let stickyBottomInsideViewport = null;
    if (stickyBar) {
      const rect = stickyBar.getBoundingClientRect();
      stickyBottomInsideViewport = rect.bottom <= window.innerHeight + 1;
    }

    return {
      hasProgressPanel: Boolean(progressPanel),
      hasMobileStickyActionBar: Boolean(stickyBar),
      stickyBottomInsideViewport,
    };
  });
}

async function collectAdminRouteChecks(page, route, viewportWidth) {
  const details = {};

  if (route === '/admin' && viewportWidth < 1024) {
    const toggleButton = page.locator('header button[aria-label]').first();
    if ((await toggleButton.count()) > 0) {
      await toggleButton.click();
      await page.waitForTimeout(300);
      const dialog = page.locator('[role="dialog"][aria-label="Admin navigation menu"]');
      const opened = (await dialog.count()) > 0;

      if (opened) {
        const closeBackdrop = page.locator('button[aria-label="Close sidebar"]');
        if ((await closeBackdrop.count()) > 0) {
          await closeBackdrop.click();
          await page.waitForTimeout(300);
        }
      }

      const closed = (await page.locator('[role="dialog"][aria-label="Admin navigation menu"]').count()) === 0;
      details.sidebarOpensAsModal = opened;
      details.sidebarClosesFromBackdrop = closed;
    } else {
      details.sidebarOpensAsModal = false;
      details.sidebarClosesFromBackdrop = false;
    }
  }

  if (route === '/admin/membership-queue' || route === '/admin/loan-queue') {
    const tableChecks = await page.evaluate(() => {
      const container = document.querySelector('div.overflow-x-auto');
      if (!container) {
        return {
          tableContainerFound: false,
          tableCanScrollHorizontally: false,
          containerClientWidth: null,
          containerScrollWidth: null,
        };
      }

      return {
        tableContainerFound: true,
        tableCanScrollHorizontally: container.scrollWidth >= container.clientWidth,
        containerClientWidth: container.clientWidth,
        containerScrollWidth: container.scrollWidth,
      };
    });

    Object.assign(details, tableChecks);
  }

  return details;
}

function evaluateRouteStatus(route, viewportWidth, checks) {
  const failures = [];

  if (checks.noHorizontalOverflow === false) {
    failures.push('Horizontal overflow detected');
  }

  if (route === '/') {
    if ((checks.conversionActionsInFirstViewport || 0) < 3) {
      failures.push('Fewer than 3 conversion actions visible in first viewport');
    }
  }

  if (route === '/membership-apply' || route === '/loan-apply') {
    if (!checks.hasProgressPanel) {
      failures.push('Step progress panel missing');
    }

    if (viewportWidth < 768 && !checks.hasMobileStickyActionBar) {
      failures.push('Mobile sticky action bar missing');
    }

    if (viewportWidth < 768 && checks.stickyBottomInsideViewport === false) {
      failures.push('Sticky action bar exceeds viewport bottom edge');
    }
  }

  if (route === '/admin' && viewportWidth < 1024) {
    if (checks.sidebarOpensAsModal === false) {
      failures.push('Admin sidebar did not open as modal on mobile');
    }
    if (checks.sidebarClosesFromBackdrop === false) {
      failures.push('Admin sidebar did not close from backdrop tap');
    }
  }

  if (route === '/admin/membership-queue' || route === '/admin/loan-queue') {
    if (checks.tableContainerFound === false) {
      failures.push('Queue table container not found');
    } else if (checks.tableCanScrollHorizontally === false) {
      failures.push('Queue table is not horizontally scrollable');
    }
  }

  return {
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    failures,
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    viewportCount: VIEWPORTS.length,
    summary: {
      totalChecks: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    },
    notes: [
      'Automated checks cover measurable layout and interaction signals only.',
      'Visual nuance checks (contrast over imagery, typography quality, motion preference behavior) still require manual validation.',
    ],
    viewports: [],
  };

  const newsDetailRoute = await getNewsDetailRoute(browser);
  const publicRoutes = [...PUBLIC_ROUTES];
  if (newsDetailRoute) {
    publicRoutes.push(newsDetailRoute);
  }

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();
    const viewportResult = {
      viewport,
      routes: [],
    };

    let adminAuth = { success: false, reason: 'Admin login not attempted' };

    for (const route of publicRoutes) {
      const routeResult = {
        route,
        category: route.startsWith('/news/') ? 'public-news-detail' : 'public',
        status: 'SKIP',
        checks: {},
        failures: [],
        screenshot: '',
      };

      try {
        await safeGoto(page, route);

        const checks = await collectCommonChecks(page);

        if (route === '/') {
          Object.assign(checks, await collectHomeChecks(page));
        }

        if (route === '/membership-apply' || route === '/loan-apply') {
          Object.assign(checks, await collectPortalChecks(page));
        }

        const filename = `${viewport.name}__${sanitizeRoute(route)}.png`;
        const screenshotPath = path.join(screenshotsRoot, filename);
        await page.screenshot({ path: screenshotPath, fullPage: true });

        const evaluation = evaluateRouteStatus(route, viewport.width, checks);
        routeResult.status = evaluation.status;
        routeResult.checks = checks;
        routeResult.failures = evaluation.failures;
        routeResult.screenshot = path.relative(outRoot, screenshotPath).replace(/\\/g, '/');
      } catch (error) {
        routeResult.status = 'FAIL';
        routeResult.failures = [error instanceof Error ? error.message : 'Unhandled route audit error'];
      }

      viewportResult.routes.push(routeResult);
      report.summary.totalChecks += 1;
      if (routeResult.status === 'PASS') report.summary.passed += 1;
      if (routeResult.status === 'FAIL') report.summary.failed += 1;
      if (routeResult.status === 'SKIP') report.summary.skipped += 1;
    }

    for (const route of ADMIN_ROUTES) {
      const routeResult = {
        route,
        category: 'admin',
        status: 'SKIP',
        checks: {},
        failures: [],
        screenshot: '',
      };

      try {
        if (!adminAuth.success) {
          adminAuth = await loginAdmin(page);
        }

        if (!adminAuth.success) {
          routeResult.status = 'SKIP';
          routeResult.failures = [adminAuth.reason || 'Admin authentication failed'];
        } else {
          await safeGoto(page, route);

          const checks = await collectCommonChecks(page);
          const adminChecks = await collectAdminRouteChecks(page, route, viewport.width);
          Object.assign(checks, adminChecks);

          const filename = `${viewport.name}__${sanitizeRoute(route)}.png`;
          const screenshotPath = path.join(screenshotsRoot, filename);
          await page.screenshot({ path: screenshotPath, fullPage: true });

          const evaluation = evaluateRouteStatus(route, viewport.width, checks);
          routeResult.status = evaluation.status;
          routeResult.checks = checks;
          routeResult.failures = evaluation.failures;
          routeResult.screenshot = path.relative(outRoot, screenshotPath).replace(/\\/g, '/');
        }
      } catch (error) {
        routeResult.status = 'FAIL';
        routeResult.failures = [error instanceof Error ? error.message : 'Unhandled admin route audit error'];
      }

      viewportResult.routes.push(routeResult);
      report.summary.totalChecks += 1;
      if (routeResult.status === 'PASS') report.summary.passed += 1;
      if (routeResult.status === 'FAIL') report.summary.failed += 1;
      if (routeResult.status === 'SKIP') report.summary.skipped += 1;
    }

    report.viewports.push(viewportResult);
    try {
      await context.close();
    } catch {
      // Context may already be disposed after browser-level errors/timeouts.
    }
  }

  try {
    await browser.close();
  } catch {
    // Browser may already be closed.
  }

  fs.writeFileSync(path.join(outRoot, 'automated-report.json'), JSON.stringify(report, null, 2), 'utf8');

  const lines = [];
  lines.push('# Phase 2 Responsive QA - Automated Run');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Base URL: ${report.baseUrl}`);
  lines.push(`Output folder: ${outRoot.replace(/\\/g, '/')}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Total route checks: ${report.summary.totalChecks}`);
  lines.push(`- Passed: ${report.summary.passed}`);
  lines.push(`- Failed: ${report.summary.failed}`);
  lines.push(`- Skipped: ${report.summary.skipped}`);
  lines.push('');
  lines.push('## Failures');
  lines.push('');

  for (const viewportResult of report.viewports) {
    const failedRoutes = viewportResult.routes.filter((route) => route.status === 'FAIL');
    if (failedRoutes.length === 0) {
      continue;
    }

    lines.push(`### ${viewportResult.viewport.name}`);
    lines.push('');

    for (const route of failedRoutes) {
      lines.push(`- Route: ${route.route}`);
      for (const failure of route.failures) {
        lines.push(`  - ${failure}`);
      }
      if (route.screenshot) {
        lines.push(`  - Screenshot: ${route.screenshot}`);
      }
    }

    lines.push('');
  }

  if (report.summary.failed === 0) {
    lines.push('- No automated failures detected.');
    lines.push('');
  }

  lines.push('## Notes');
  lines.push('');
  for (const note of report.notes) {
    lines.push(`- ${note}`);
  }

  fs.writeFileSync(path.join(outRoot, 'automated-report.md'), lines.join('\n'), 'utf8');

  console.log(`Responsive QA completed. Artifacts: ${outRoot.replace(/\\/g, '/')}`);
  console.log(`Summary => Passed: ${report.summary.passed}, Failed: ${report.summary.failed}, Skipped: ${report.summary.skipped}`);
})().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
