const fs = require('fs');
const files = [
  'frontend/src/pages/admin/MembershipQueue.tsx',
  'frontend/src/pages/admin/MembersList.tsx',
  'frontend/src/pages/admin/LoanQueue.tsx',
  'frontend/src/pages/admin/LoansList.tsx'
];
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(/\bmiddleName\b/g, 'fathersName');
  content = content.replace(/\blastName\b/g, 'grandfathersName');
  
  content = content.replace(/\$\{([^}]*?)firstName\}\s*\$\{[^}]*?fathersName( \s*\|\|\s* \'\' )?\}\s*\$\{([^}]*?)grandfathersName\}/g, '${$1firstName} ${$1fathersName} ${$3grandfathersName}');
  
  content = content.replace(/const middle = [^;]+;[\s\S]+?return `\$\{([a-zA-Z.]+)\.firstName\}\$\{middle\} \`\.trim\(\);/g, 
    "return `${$1.firstName} ${$1.fathersName ? $1.fathersName + ' ' : ''}${$1.grandfathersName}`.trim();");

  // Re-write table elements instead of regexing them.
  // We'll replace the SLA and Officer columns
  content = content.replace(/<th[^>]*>\{tAdmin\([^,]+,\s*'(SLA|Officer)[^']*'\)\}<\/th>\s*/g, '');
  content = content.replace(/<td[^>]*>\{officerName\}<\/td>\s*/g, '');
  content = content.replace(/<td[^>]*>\s*<div[^>]*slaClass[^>]*>[\s\S]*?<\/div>\s*<\/td>\s*/g, '');
  content = content.replace(/<td[^>]*>\{metrics[^\}]*\}<\/td>\s*/g, '');

  content = content.replace(/className=\{`w-full table-auto \$\{density === 'compact' \? 'text-\[11px\]' : 'text-xs'\} \[\&_th\]:whitespace-normal \[\&_td\]:whitespace-normal \[\&_td\]:break-words`\}/g, 'className="w-full text-sm text-left border-collapse"');

  // Replace Eye link
  content = content.replace(/(<td[^>]*>)\s*<div className="flex gap-1">[\s\S]*?(<Link to=\{`\/admin\/[^/]+\/\$\{[^}]+\}[^\}]+`\})[^>]*>[\s\S]*?<\/div>\s*(<\/td>)/g, 
    '$1 $2 className="text-blue-600 font-medium hover:underline">{tAdmin("edit", "Edit")}</Link> $3'
  );

  fs.writeFileSync(file, content, 'utf8');
});
console.log('Safe edits done');
