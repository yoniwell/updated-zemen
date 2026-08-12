const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// 1. Rename middleName -> fathersName and lastName -> grandfathersName in Applicant
content = content.replace(/middleName\s+String\?/g, 'fathersName          String?');
content = content.replace(/lastName\s+String/g, 'grandfathersName       String');

// 2. Remove dead fields from Applicant
const applicantDeadFields = [
  'dob                    DateTime?',
  'gender                 Gender?',
  'nationality            String?                 @default("Ethiopian")',
  'region                 String?',
  'city                   String?',
  'subCity                String?',
  'woreda                 String?',
  'address                String?',
];

for (const field of applicantDeadFields) {
  content = content.replace(new RegExp(`\\s+${field.replace(/[.*+?^$\\{}()|[\\]\\\\]/g, '\\$&')}`, 'g'), '');
}

// 3. Remove privacyAccepted and signature from MembershipApplication
content = content.replace(/\s+privacyAccepted\s+Boolean\s+@default\(false\)/g, '');
content = content.replace(/\s+signature\s+String\?/g, '');

// 4. Remove unused models
const modelsToRemove = [
  'NotificationTemplate',
  'NotificationDeliveryTimeline',
  'NotificationAcknowledgement',
  'NotificationNoiseControl',
  'InquiryRoutingRule',
  'InquiryNotificationMeta',
  'AdminReportSchedule',
  'ExportAuditRecord',
];

for (const model of modelsToRemove) {
  const regex = new RegExp(`model ${model} \\{[^}]+\\}`, 'g');
  content = content.replace(regex, '');
}

// Remove Gender enum
content = content.replace(/enum Gender \{[^}]+\}/g, '');

fs.writeFileSync(schemaPath, content, 'utf8');
console.log('Schema updated successfully.');
