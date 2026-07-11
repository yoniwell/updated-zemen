# Admin Dashboard One Complete Guide (Click-by-Click)

This is the only guide staff need.

It explains exactly where to click for all common tasks in the admin system.

## 1) Before You Start

### Login
1. Open the admin portal login page.
2. Enter email and password.
3. Click Login.

### Main Screen Layout
- Top bar: your name, role, branch, search, icons.
- Left menu: all modules you are allowed to open.
- Main panel: current page details.

### Logout
- Left menu (bottom) -> Log Out.

## 2) Quick Rule: If You Want X, Click Y

## 2.1 Cases and Queues
- If you want membership applications: Left menu -> Membership Queue.
- If you want loan applications: Left menu -> Loan Queue.
- If you want approved members: Left menu -> Members List.
- If you want approved loans: Left menu -> Loans List.

## 2.2 Open Application Details
- Membership Queue row -> Actions column -> Eye icon.
- Loan Queue row -> Actions column -> Eye icon.

This opens the full Application Detail page.

## 2.3 On Application Detail Page (Most Important)
Top action buttons:
- Request Info: asks applicant for missing items.
- Reassign: move case to another officer (authorized roles only).
- Approve: approve the case.
- Reject: reject the case.

Tabs:
- Application tab: applicant and case information.
- Documents tab: review each uploaded file.
- Notes tab: write internal notes.
- Timeline tab: history of all changes.

## 2.4 Documents Actions
On Application Detail -> Documents tab:
- To view file: Eye button.
- To download file: Download button.
- To approve document: Approve button (document row).
- To reject document: Reject button -> enter reason.

## 2.5 Notes
On Application Detail -> Notes tab:
1. Type note in Add Note box.
2. Click Add Note.

Use notes every time you make a decision.

## 2.6 Reports and Monitoring
- Left menu -> Reports.
- Filter with dropdowns (branch, role, product, timeframe).
- Click Refresh to reload.
- Click Export CSV to export report.
- To schedule reports: Reports page -> schedule section -> enter recipients and frequency -> save.

## 2.7 Notifications
- Left menu -> Notifications.
- Select notification in list.
- Right panel:
- Retry = retry delivery.
- Ack = acknowledge complete.
- Reopen = mark not complete.

Templates:
- Notifications page -> template area -> create/edit -> Preview -> Save Template.

## 2.8 Audit Log
- Left menu -> Audit Log.
- Use Search box.
- Use Action and Entity filters.
- Click Export to download CSV.

## 2.9 User Management
- Left menu -> User Management.

Common tasks:
- create user: click New/Add user button -> fill form -> save.
- edit user: select user -> edit -> save.
- deactivate user: user actions -> deactivate -> add reason.
- reset password: user actions -> reset password.
- invite user: user actions -> invite (copy links).
- bulk actions: select users -> choose bulk action -> run.

## 2.10 Settings
- Left menu -> Settings.

Inside Settings tabs:
- System tab: loan threshold, assignment mode, compliance lock.
- Branches tab: add/edit/delete branch.
- Access Matrix tab: turn module permissions on/off per role -> Save Role Permissions.

## 2.11 CMS (Content Management)
- Left menu -> CMS.

Use tabs/modules inside CMS to manage:
- pages
- services
- loan products
- branches (public info)
- downloads
- news
- FAQ
- announcements

Typical flow:
1. choose section/tab
2. click Add or Edit
3. update fields/files
4. save/publish

## 3) Full Daily Workflow (For Processing Staff)
1. Left menu -> Dashboard.
2. Check pending review and pending documents.
3. Open Membership Queue or Loan Queue.
4. Filter by branch/status.
5. Open first urgent/old case using Eye icon.
6. In Application Detail:
- review Application tab
- review Documents tab
- approve/reject docs
- if missing info -> Request Info
- if complete -> Approve
- if not acceptable -> Reject
7. Add Note with reason.
8. Go to next case.

## 4) Status Meanings (Simple)
- DRAFT: not fully submitted.
- SUBMITTED: received and waiting review.
- UNDER_REVIEW: being reviewed.
- KYC_VERIFICATION: compliance checks ongoing.
- PENDING_DOCUMENTS: waiting for files.
- PENDING_CLARIFICATION: waiting for explanation.
- APPROVED: accepted.
- REJECTED: declined.
- ACTIVATED: completed/finalized.

## 5) Role-by-Role: What They Usually Do

### SUPER_ADMIN
- everything in the system
- users, settings, access matrix, branch setup, all queues, reports, audit, CMS

### BRANCH_MANAGER
- dashboard, queues, reports, notifications, audit, settings
- reassign cases and supervise branch work

### MEMBERSHIP_OFFICER
- membership queue and members list
- review membership cases and documents

### LOAN_OFFICER
- loan queue and loans list
- review loan cases and documents

### KYC_OFFICER
- membership + loan review support
- compliance and document verification focus

### CONTENT_ADMIN
- CMS and notifications
- publish and maintain public content

## 6) Common "How Do I..." Tasks

### How do I open case details?
Queue page -> case row -> Eye icon.

### How do I request more documents?
Open case detail -> top button Request Info.

### How do I assign case to another officer?
Open case detail -> top button Reassign -> choose officer.

### How do I approve the case?
Open case detail -> verify all required docs first -> click Approve.

### How do I reject the case?
Open case detail -> click Reject -> add clear reason in notes/process.

### How do I change role permissions?
Settings -> Access Matrix -> toggle modules -> Save Role Permissions.

### How do I add a new branch?
Settings -> Branches -> fill Add Branch form -> Add Branch.

### How do I create admin user?
User Management -> create/add user -> fill name/email/password/role/branch -> save.

### How do I publish news/update website content?
CMS -> News (or relevant section) -> Add/Edit -> Save/Publish.

## 7) Non-Negotiable Safety Rules
1. Do not approve if required documents are not verified.
2. Every major action must have a clear note.
3. Reject only with explicit reason.
4. If unsure, Request Info or escalate to manager/super admin.

## 8) End-of-Shift Checklist
1. No escalated case left without note.
2. No rejection without clear reason.
3. High-age/SLA cases have next action.
4. Queue filters reset/confirmed for next user.

## 9) Troubleshooting (Fast)

### "I cannot see a menu item"
- you likely do not have permission for that module
- ask super admin/manager

### "Approve button fails"
- check documents are all verified
- refresh and try again

### "No records in queue"
- clear filters (status, branch, officer)
- refresh page

### "Page error"
- refresh once
- collect error text + reference number
- escalate to support/admin

## 10) Escalation Message Template
When reporting a problem, send:
- your name and role
- branch
- page/module
- case reference number
- exact error text
- screenshot
- time issue happened

---
Use this as the main operational guide for all roles.
