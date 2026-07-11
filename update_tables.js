const fs = require('fs');
const path = require('path');

const files = [
  'frontend/src/pages/admin/MembershipQueue.tsx',
  'frontend/src/pages/admin/MembersList.tsx',
  'frontend/src/pages/admin/LoanQueue.tsx',
  'frontend/src/pages/admin/LoansList.tsx'
];

files.forEach(file => {
  const fp = path.resolve(file);
  if (!fs.existsSync(fp)) return;
  let content = fs.readFileSync(fp, 'utf8');

  // Remove Colgroups
  content = content.replace(/<colgroup>[\s\S]*?<\/colgroup>/, '');

  content = content.replace(/<thead className="sticky top-0 z-10 bg-slate-50\/95 backdrop-blur supports-\[backdrop-filter\]:bg-slate-50\/90">/g, '<thead>');
  content = content.replace(/<th className="[^"]*"/g, '<th className="p-3 text-left text-xs font-semibold text-slate-700 bg-slate-50 border-b border-slate-200"');
  
  content = content.replace(/<th[^>]*>\{tAdmin\([^,]+,\s*'Officer'\)\}<\/th>\s*/g, '');
  content = content.replace(/<th[^>]*>\{tAdmin\([^,]+,\s*'SLA \/ Age'\)\}<\/th>\s*/g, '');
  content = content.replace(/<th[^>]*>\{tAdmin\([^,]+,\s*'SLA'\)\}<\/th>\s*/g, '');

  content = content.replace(/<td[^>]*>\{officerName\}<\/td>\s*/g, '');
  content = content.replace(/<td[^>]*>\s*<div[^>]*slaClass[^>]*>[\s\S]*?<\/div>\s*<\/td>\s*/g, '');

  content = content.replace(/<tr key=\{([^\}]+)\} className="[^"]*"/g, '<tr key={} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0"');

  content = content.replace(/<td className="p-2 /g, '<td className="p-3 align-middle ');
  content = content.replace(/<td className="p-2"/g, '<td className="p-3 align-middle"');
  
  content = content.replace(/(<td[^>]*>)\s*<div className="flex gap-1">(\s*<Link to=\{\/admin\/applications\/([^\/]+)\/\$\{application.id\}\}[^>]*>[\s\S]*?<\/Link>)+\s*<\/div>\s*(<\/td>)/g, 
    ' <Link to={/admin/applications//} className="text-blue-600 font-medium hover:underline px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors">{tAdmin("edit", "Edit")}</Link> '
  );

  content = content.replace(/(<td[^>]*>)\s*<div className="flex gap-1">(\s*<Link to=\{\/admin\/[^/]+\/\$\{[^}]+\.id\}\}[^>]*>[\s\S]*?<\/Link>)+\s*<\/div>\s*(<\/td>)/g, 
    (match, p1, p2, p3) => {
      let linkMatch = match.match(/([^]+)/);
      if(linkMatch) {
         return p1 + ' <Link to={' + linkMatch[1] + '} className="text-blue-600 font-medium hover:underline px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors">{tAdmin("edit", "Edit")}</Link> ' + p3;
      }
      return match;
    }
  );

  content = content.replace(/<table className=\{[^]+\}/g, '<table className="w-full text-sm text-left border-collapse"');

  fs.writeFileSync(fp, content, 'utf8');
});
console.log('Tables updated');
