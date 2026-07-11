const fs = require('fs');
const path = require('path');

const fp = path.resolve('frontend/src/pages/admin/AuditLog.tsx');
let content = fs.readFileSync(fp, 'utf8');

// Remove Entity Filter in the UI
content = content.replace(/<Select value=\{entityFilter\}[\s\S]*?<\/Select>/g, '');

// Clean Table Classes
content = content.replace(/className="w-full text-xs \[\&_th\]:whitespace-nowrap \[\&_td\]:whitespace-normal \[\&_td\]:break-words"/g, 'className="w-full text-sm text-left border-collapse"');

// Header formatting and removals
// Replace the thead block manually to make it beautiful
const newThead = \<thead>
            <tr className="border-b border-slate-200">
              <th className="p-3 text-left text-xs font-semibold text-slate-700 bg-slate-50 border-b border-slate-200">{tAdmin('user', 'User')}</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-700 bg-slate-50 border-b border-slate-200">{tAdmin('action', 'Action')}</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-700 bg-slate-50 border-b border-slate-200">{tAdmin('details', 'Details')}</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-700 bg-slate-50 border-b border-slate-200">{tAdmin('timestamp', 'Timestamp')}</th>
            </tr>
          </thead>\;

content = content.replace(/<thead>[\s\S]*?<\/thead>/, newThead);

// Body replacements
content = content.replace(/<td className="p-2 text-xs text-muted-foreground">\{event\.targetType\}<\/td>/g, '');
content = content.replace(/<td className="p-2 font-mono text-\[11px\] text-muted-foreground">\{event\.ipAddress \|\| '-'\}<\/td>/g, '');

// Td class updates
content = content.replace(/<td className="p-2"/g, '<td className="p-3 align-middle border-b border-slate-100"');
content = content.replace(/<td className="p-2 /g, '<td className="p-3 align-middle border-b border-slate-100 ');

// Tr classes
content = content.replace(/<tr key=\{event\.id\} className="border-b transition-colors last:border-0 hover:bg-muted\/30">/g, '<tr key={event.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0">');
content = content.replace(/<tr className="border-b transition-colors last:border-0 hover:bg-muted\/30">/g, '<tr className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0">');
content = content.replace(/<td className="p-2">/g, '<td className="p-3 align-middle border-b border-slate-100">');

// colspan adjustment for loading/no data rows
content = content.replace(/colSpan=\{6\}/g, 'colSpan={4}');

fs.writeFileSync(fp, content, 'utf8');
console.log('AuditLog updated');
