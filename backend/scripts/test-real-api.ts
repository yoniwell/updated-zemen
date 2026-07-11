import jwt from 'jsonwebtoken';

const JWT_SECRET = 'zemen-sacco-jwt-secret-change-in-production';

const adminToken = jwt.sign(
  {
    id: '92936f34-1566-45b8-bea7-58badf48a7b9', // admin@zemen.com
    email: 'admin@zemen.com',
    role: 'SUPER_ADMIN',
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

async function run() {
  const url = 'http://localhost:5000';
  try {
    console.log('Checking health of local backend...');
    const healthRes = await fetch(`${url}/api/health`);
    console.log('Health Status:', healthRes.status);
    const healthBody = await healthRes.json();
    console.log('Health Body:', healthBody);

    // Get CSRF cookie / token first
    console.log('Fetching CSRF token...');
    const csrfRes = await fetch(`${url}/api/auth/csrf-token`);
    const cookies = csrfRes.headers.get('set-cookie');
    console.log('Set-Cookie:', cookies);
    const csrfBody = (await csrfRes.json()) as any;
    console.log('CSRF token:', csrfBody.csrfToken);

    // Let's do a POST to create a branch
    console.log('Creating branch...');
    const createRes = await fetch(`${url}/api/admin/settings/branches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'X-CSRF-Token': csrfBody.csrfToken || '',
        'Cookie': cookies || '',
      },
      body: JSON.stringify({
        name: 'Fetch Test Branch',
        code: 'FTB-111',
        location: 'Fetch Location',
      }),
    });
    console.log('Create Status:', createRes.status);
    const createBody = (await createRes.json()) as any;
    console.log('Create Body:', createBody);

    if (createRes.status !== 201) return;

    const branchId = createBody.branch.id;

    // PATCH
    console.log(`Updating branch ${branchId}...`);
    const updateRes = await fetch(`${url}/api/admin/settings/branches/${branchId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'X-CSRF-Token': csrfBody.csrfToken || '',
        'Cookie': cookies || '',
      },
      body: JSON.stringify({
        name: 'Fetch Test Branch Updated',
        code: 'FTB-222',
        location: 'Updated Fetch Location',
        manager: 'Fetch Manager',
        status: 'OPERATIONAL',
      }),
    });
    console.log('Update Status:', updateRes.status);
    const updateBody = (await updateRes.json()) as any;
    console.log('Update Body:', updateBody);

    // DELETE
    console.log(`Deleting branch ${branchId}...`);
    const deleteRes = await fetch(`${url}/api/admin/settings/branches/${branchId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'X-CSRF-Token': csrfBody.csrfToken || '',
        'Cookie': cookies || '',
      },
    });
    console.log('Delete Status:', deleteRes.status);
    const deleteBody = (await deleteRes.json()) as any;
    console.log('Delete Body:', deleteBody);

  } catch (error) {
    console.error('Fetch error:', error);
  }
}

run();
