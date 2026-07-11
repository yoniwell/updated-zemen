const fs = require('fs');
const path = require('path');

const appFile = path.resolve('frontend/src/App.tsx');
let appContent = fs.readFileSync(appFile, 'utf8');

appContent = appContent.replace(/<Route path="reports" element=\{<AdminReports \/>\} \/>\s*\n?/g, '');
appContent = appContent.replace(/<Route path="notifications" element=\{<AdminNotifications \/>\} \/>\s*\n?/g, '');
appContent = appContent.replace(/import AdminReports from '.\/pages\/admin\/Reports';\s*\n?/g, '');
appContent = appContent.replace(/import AdminNotifications from '.\/pages\/admin\/Notifications';\s*\n?/g, '');

fs.writeFileSync(appFile, appContent, 'utf8');
console.log('Removed from App.tsx');

const reportsFile = path.resolve('frontend/src/pages/admin/Reports.tsx');
const notifFile = path.resolve('frontend/src/pages/admin/Notifications.tsx');

if (fs.existsSync(reportsFile)) fs.unlinkSync(reportsFile);
if (fs.existsSync(notifFile)) fs.unlinkSync(notifFile);
console.log('Deleted pages');
