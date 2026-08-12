import { PrismaClient } from '@prisma/client';
import { randomInt } from 'crypto';

const prisma = new PrismaClient();
const baseUrl = 'http://localhost:5000/api';

async function main() {
  console.log('--- E2E TEST: Portals -> Admin Dashboard ---\n');

  // 1. Fetch Branches
  console.log('[1] Fetching branches...');
  let res = await fetch(`${baseUrl}/settings/branches`);
  if (!res.ok) throw new Error(`Failed to fetch branches: ${await res.text()}`);
  const branchesBody = await res.json() as any;
  console.log('Branches response body:', JSON.stringify(branchesBody, null, 2));
  const branches = branchesBody.data?.branches || branchesBody.data || branchesBody;
  const branchId = branches[0]?.id;
  if (!branchId) throw new Error('No branches found!');
  console.log(`✓ Fetched branch: ${branches[0].name} (${branchId})\n`);

  const uniqueId = randomInt(10000, 99999);
  const memEmail = `mem_${uniqueId}@test.com`;
  const loanEmail = `loan_${uniqueId}@test.com`;

  // 2. Membership Portal Flow
  console.log('[2] Membership Portal: Sending OTP...');
  res = await fetch(`${baseUrl}/applications/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: memEmail, purpose: 'membership' })
  });
  if (!res.ok) throw new Error(`Failed to send membership OTP: ${await res.text()}`);
  let otpRes = await res.json() as any;
  console.log(`✓ OTP sent. Code: ${otpRes.code}`);

  console.log('[3] Membership Portal: Verifying OTP...');
  res = await fetch(`${baseUrl}/applications/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: memEmail, purpose: 'membership', code: otpRes.code })
  });
  if (!res.ok) throw new Error(`Failed to verify membership OTP: ${await res.text()}`);
  let verifyRes = await res.json() as any;
  const memToken = verifyRes.verificationToken;
  console.log(`✓ OTP verified. Token: ${memToken.substring(0, 15)}...\n`);

  console.log('[4] Membership Portal: Submitting Application...');
  res = await fetch(`${baseUrl}/membership`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      verificationToken: memToken,
      firstName: 'John',
      fathersName: 'Doe',
      grandfathersName: 'Smith',
      email: memEmail,
      phone: '+251911123456',
      gender: 'MALE',
      dateOfBirth: '1990-01-01',
      maritalStatus: 'SINGLE',
      preferredBranchId: branchId,
      idType: 'PASSPORT',
      idNumber: `PP${uniqueId}`,
      accountType: 'SAVINGS'
    })
  });
  if (!res.ok) throw new Error(`Failed to submit membership: ${await res.text()}`);
  const memApp = (await res.json() as any);
  console.log('Membership response:', JSON.stringify(memApp, null, 2));
  const memAppObj = memApp.data?.application || memApp.data || memApp;
  console.log(`✓ Membership App submitted. Tracking ID: ${memAppObj.referenceNo}\n`);


  // 3. Loan Portal Flow
  console.log('[5] Loan Portal: Sending OTP...');
  res = await fetch(`${baseUrl}/applications/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: loanEmail, purpose: 'loan' })
  });
  if (!res.ok) throw new Error(`Failed to send loan OTP: ${await res.text()}`);
  otpRes = await res.json() as any;
  console.log(`✓ OTP sent. Code: ${otpRes.code}`);

  console.log('[6] Loan Portal: Verifying OTP...');
  res = await fetch(`${baseUrl}/applications/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: loanEmail, purpose: 'loan', code: otpRes.code })
  });
  if (!res.ok) throw new Error(`Failed to verify loan OTP: ${await res.text()}`);
  verifyRes = await res.json() as any;
  const loanToken = verifyRes.verificationToken;
  console.log(`✓ OTP verified. Token: ${loanToken.substring(0, 15)}...\n`);

  console.log('[7] Loan Portal: Submitting Application...');
  res = await fetch(`${baseUrl}/loans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      verificationToken: loanToken,
      firstName: 'Jane',
      fathersName: 'Doe',
      grandfathersName: 'Smith',
      membershipNo: 'MEM-001',
      email: loanEmail,
      phone: '+251911123457',
      idType: 'NATIONAL_ID',
      idNumber: `NID${uniqueId}`,
      maritalStatus: 'MARRIED',
      loanType: 'REGULAR_LOAN',
      branchId: branchId,
      amount: 50000,
      tenure: 24
    })
  });
  if (!res.ok) {
    const errorText = await res.text();
    // Sometimes validation errors occur, let's catch and print
    throw new Error(`Failed to submit loan: ${errorText}`);
  }
  const loanAppRes = (await res.json() as any);
  console.log('Loan response:', JSON.stringify(loanAppRes, null, 2));
  const loanAppObj = loanAppRes.data?.application || loanAppRes.data || loanAppRes;
  console.log(`✓ Loan App submitted. Tracking ID: ${loanAppObj.referenceNo}\n`);


  // 4. Admin Dashboard Check
  console.log('[8] Admin Dashboard: Logging in...');
  res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@zemen.com', password: 'admin123' })
  });
  if (!res.ok) throw new Error(`Failed to login admin: ${await res.text()}`);
  const authRes = await res.json() as any;
  console.log('Admin login response:', JSON.stringify(authRes, null, 2));
  const adminToken = authRes.data?.token || authRes.token;
  console.log('✓ Admin logged in successfully\n');

  console.log('[9] Admin Dashboard: Fetching Membership Applications...');
  res = await fetch(`${baseUrl}/membership`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  if (!res.ok) throw new Error(`Failed to fetch memberships: ${await res.text()}`);
  const memListRes = (await res.json() as any);
  const memList = memListRes.data?.applications || memListRes.data?.items || memListRes.data || memListRes;
  const memFound = Array.isArray(memList) ? memList.find((m: any) => m.referenceNo === memAppObj.referenceNo) : null;
  if (memFound) {
    console.log(`✓ Found newly created membership app in Admin Dashboard (ID: ${memFound.id})`);
  } else {
    throw new Error(`New membership application NOT FOUND in admin dashboard (Tracking ID: ${memAppObj.referenceNo})`);
  }

  console.log('\n[10] Admin Dashboard: Fetching Loan Applications...');
  res = await fetch(`${baseUrl}/loans`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  if (!res.ok) throw new Error(`Failed to fetch loans: ${await res.text()}`);
  const loanListRes = (await res.json() as any);
  const loanList = loanListRes.data?.applications || loanListRes.data?.items || loanListRes.data || loanListRes;
  const loanFound = Array.isArray(loanList) ? loanList.find((l: any) => l.referenceNo === loanAppObj.referenceNo) : null;
  if (loanFound) {
    console.log(`✓ Found newly created loan app in Admin Dashboard (ID: ${loanFound.id})`);
  } else {
    throw new Error('New loan application NOT FOUND in admin dashboard');
  }

  console.log('\n🎉 ALL E2E TESTS PASSED SUCCESSFULLY! 🎉');
}

main().catch(e => {
  console.error('\n❌ TEST FAILED:');
  console.error(e.message);
}).finally(() => prisma.$disconnect());
