const fs = require('fs');
const path = require('path');

const sidebarFile = path.resolve('frontend/src/components/admin/AdminSidebar.tsx');
let sidebarContent = fs.readFileSync(sidebarFile, 'utf8');

// remove reports and notifications
sidebarContent = sidebarContent.replace(/\{ to\: \'\/admin\/reports\',.*\},\n\s*/g, '');
sidebarContent = sidebarContent.replace(/\{ to\: \'\/admin\/notifications\',.*\},\n\s*/g, '');

fs.writeFileSync(sidebarFile, sidebarContent, 'utf8');
console.log('Removed Reports and Notifications from AdminSidebar.tsx');
