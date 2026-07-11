const fs = require('fs');
const path = require('path');

const files = [
  'frontend/src/pages/admin/MembershipQueue.tsx',
  'frontend/src/pages/admin/MembersList.tsx',
  'frontend/src/pages/admin/ApplicationDetail.tsx',
  'frontend/src/pages/admin/LoanQueue.tsx',
  'frontend/src/pages/admin/LoansList.tsx',
  'frontend/src/pages/admin/CreateMemberPage.tsx',
  'frontend/src/pages/admin/CreateLoanPage.tsx'
];

files.forEach(file => {
  const fullPath = path.resolve(file);
  if (!fs.existsSync(fullPath)) return;
  let content = fs.readFileSync(fullPath, 'utf8');

  content = content.replace(/\bmiddleName\b/g, 'fathersName');
  content = content.replace(/\blastName\b/g, 'grandfathersName');
  
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('Updated ' + file);
});
