import { randomInt } from 'crypto';

const baseUrl = 'http://localhost:5000/api';

async function main() {
  console.log('--- CMS TEST: Admin Post -> Public Read ---\n');

  // 1. Admin Login
  console.log('[1] Logging in as admin...');
  let res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@zemen.com', password: 'admin123' })
  });
  if (!res.ok) throw new Error(`Failed to login admin: ${await res.text()}`);
  const authRes = await res.json() as any;
  const adminToken = authRes.data?.token || authRes.token;
  console.log('✓ Admin logged in successfully\n');

  // 2. Create Announcement
  const uniqueId = randomInt(1000, 9999);
  const announcementTitle = `Test Announcement ${uniqueId}`;
  console.log(`[2] Creating announcement: "${announcementTitle}"...`);
  
  res = await fetch(`${baseUrl}/content/announcement`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      title: announcementTitle,
      content: 'This is a test announcement content.',
      type: 'INFO',
      status: 'Scheduled',
      startDate: new Date().toISOString(),
      placement: 'Banner'
    })
  });
  
  if (!res.ok) throw new Error(`Failed to create announcement: ${await res.text()}`);
  const createRes = await res.json() as any;
  console.log('Create Response:', JSON.stringify(createRes, null, 2));
  const createdAnn = createRes.data?.item || createRes.data || createRes;
  console.log(`✓ Announcement created. ID: ${createdAnn.id}\n`);

  // 3. Fetch Public Announcements
  console.log('[3] Fetching public announcements...');
  res = await fetch(`${baseUrl}/content/announcements`);
  if (!res.ok) throw new Error(`Failed to fetch public announcements: ${await res.text()}`);
  const listRes = await res.json() as any;
  console.log('List Response:', JSON.stringify(listRes, null, 2));
  const announcements = listRes.data?.items || listRes.data || listRes;
  
  const found = Array.isArray(announcements) ? announcements.find((a: any) => a.id === createdAnn.id) : null;
  if (found) {
    console.log(`✓ Successfully found newly created announcement in the public API!`);
    console.log(JSON.stringify(found, null, 2));
  } else {
    throw new Error('New announcement NOT FOUND in the public API.');
  }

  console.log('\n🎉 CMS TEST PASSED SUCCESSFULLY! 🎉');
}

main().catch(console.error);
