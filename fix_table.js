const fs = require('fs');
['frontend/src/pages/admin/MembershipQueue.tsx', 'frontend/src/pages/admin/MembersList.tsx', 'frontend/src/pages/admin/LoanQueue.tsx', 'frontend/src/pages/admin/LoansList.tsx'].forEach(p => {
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(/<table className=\"w-full text-sm text-left border-collapse\"(?!\s*>)/g, '<table className="w-full text-sm text-left border-collapse">');
  fs.writeFileSync(p, c);
});
console.log('Fixed >');