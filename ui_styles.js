const fs = require('fs');
const files = [
  'frontend/src/pages/admin/MembershipQueue.tsx',
  'frontend/src/pages/admin/MembersList.tsx',
  'frontend/src/pages/admin/LoanQueue.tsx',
  'frontend/src/pages/admin/LoansList.tsx'
];
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Strip colgroups
  content = content.replace(/<colgroup>[\s\S]*?<\/colgroup>/g, '');
  
  // Make thead beautiful
  content = content.replace(/<thead className="sticky top-0 z-10 bg-slate-50\/95 backdrop-blur supports-\[backdrop-filter\]:bg-slate-50\/90">/g, '<thead>');
  content = content.replace(/<th className="[^"]*"/g, '<th className="p-3 text-left text-xs font-semibold text-slate-700 bg-slate-50 border-b border-slate-200"');
  
  // Make body / cells beautiful
  content = content.replace(/<td className="p-2 /g, '<td className="p-3 align-middle ');
  content = content.replace(/<td className="p-2"/g, '<td className="p-3 align-middle"');
  
  content = content.replace(/<tr key=\{([^\}]+)\} className="border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50\/70">/g, '<tr key={$1} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0">');

  fs.writeFileSync(file, content, 'utf8');
});
console.log('UI styles updated');