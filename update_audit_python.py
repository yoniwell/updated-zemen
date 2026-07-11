import re

with open('frontend/src/pages/admin/AuditLog.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# exact substring replacements instead of regex brackets that powershell parses
content = re.sub(r'<Select value=\{entityFilter\}(.*?)</Select>', '', content, flags=re.DOTALL)
content = re.sub(r'<th[^>]*>\{tAdmin\([^,]*,\s*\'Entity\'\)\}<\/th>', '', content)
content = re.sub(r'<th[^>]*>IP<\/th>', '', content)

content = content.replace('colSpan={6}', 'colSpan={4}')
content = content.replace('<td className="p-2 text-xs text-muted-foreground">{event.targetType}</td>', '')
content = content.replace('<td className="p-2 font-mono text-[11px] text-muted-foreground">{event.ipAddress || \'-\'}</td>', '')

# Make it beautiful
content = content.replace('className="w-full text-xs [&_th]:whitespace-nowrap [&_td]:whitespace-normal [&_td]:break-words"', 'className="w-full text-sm text-left border-collapse"')
content = content.replace('<th className="p-2 text-left text-[10px] font-medium text-muted-foreground"', '<th className="p-3 text-left text-xs font-semibold text-slate-700 bg-slate-50 border-b border-slate-200"')
content = content.replace('<td className="p-2"', '<td className="p-3 align-middle border-b border-slate-100"')
content = content.replace('<td className="p-2 ', '<td className="p-3 align-middle border-b border-slate-100 ')

with open('frontend/src/pages/admin/AuditLog.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('AuditLog updated successfully.')
