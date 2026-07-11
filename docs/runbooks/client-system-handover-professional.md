# Client System Handover Certificate and Operations Transfer

## 1. Document Metadata
- Document Title: Client System Handover Certificate and Operations Transfer
- Project Name: Zemen Digital Trust Platform
- Document ID: ZDT-HO-2026-001
- Version: 1.1
- Date Issued: 2026-04-18
- Classification: Client Confidential
- Prepared By: Handover and Delivery Team
- Reviewed By: Project Technical Lead
- Approved By: Program Owner

## 2. Confidentiality Notice
This document contains project implementation and operational information intended only for authorized client representatives and approved service personnel. Unauthorized disclosure, copying, or distribution is prohibited.

## 3. Handover Statement
The implementation team confirms that the delivered system components listed in this document have been transferred to the client for operational ownership, subject to the acceptance criteria and responsibilities defined herein.

## 4. Delivery Scope

### 4.1 Business Scope Delivered
- public website and information pages
- digital membership application journey
- digital loan application journey
- application status tracking
- administrative operations dashboard
- content management workflow
- reporting and monitoring workflow
- notification and communication workflow
- audit and compliance visibility workflow

### 4.2 Technical Scope Delivered
- frontend web application
- backend API services
- database schema and migration assets
- operational scripts and deployment artifacts
- runbooks and training documentation

## 5. Roles and Access Transfer
Configured administrative roles:
- SUPER_ADMIN
- BRANCH_MANAGER
- MEMBERSHIP_OFFICER
- LOAN_OFFICER
- KYC_OFFICER
- CONTENT_ADMIN

Access model:
- role-based access control (RBAC)
- module-level authorization
- branch-scoped access where applicable

Client confirms responsibility to maintain least-privilege role assignment and periodic access review.

## 6. Operational Capability Transfer
The client can now perform the following through the delivered platform:
- process membership and loan applications end-to-end
- review and verify uploaded documents
- approve or reject applications with audit traceability
- assign and reassign operational workload
- manage users, branches, and role permissions
- update public-facing content
- review performance reports and operational health indicators
- investigate activity through audit logs

## 7. Security and Control Baseline
Delivered controls include:
- authenticated admin access
- role and module authorization checks
- audit event recording
- operational abuse/security monitoring views
- workflow and status traceability

Client-owned controls after handover:
- credential and secret management
- access governance and review cadence
- backup policy and restore validation
- incident response coordination

## 8. Environment and Configuration Ownership
Client assumes responsibility for:
- production environment configuration values
- secret rotation and storage policy
- infrastructure and hosting settings
- deployment timing and release approvals

## 9. Data Ownership and Continuity
Client responsibilities include:
- routine database backups
- backup retention policy
- periodic restore testing
- data governance and compliance retention policies

Recommended minimum:
- daily backup schedule
- documented restore procedure
- monthly restore drill

## 10. Documentation Pack Delivered
Core handover documents include:
- full master handover
- branded client handover template
- executive summary
- non-technical admin guides (general, branch, super admin)
- bilingual guide (English + Amharic)
- trainer pack and assessment checklist

## 11. Support and Escalation Framework
Suggested support tiers:
- L1: branch operations/support desk
- L2: client platform administrator
- L3: technical implementation/vendor support

Escalation payload standard:
- timestamp
- role and branch
- affected module
- reference/case identifier
- error message
- evidence (screenshot/log)

## 12. Acceptance Criteria
Handover is considered accepted when all items below are confirmed:
- [ ] user accounts provisioned and validated
- [ ] role permissions approved by client governance owner
- [ ] branch setup validated
- [ ] core workflows tested (membership and loan)
- [ ] reporting and export validated
- [ ] notifications and routing controls validated
- [ ] audit logs reviewed and accepted
- [ ] CMS publishing workflow validated
- [ ] backup and restore responsibilities accepted
- [ ] support matrix and contacts finalized

## 13. Residual Risks and Assumptions
Assumptions:
- client maintains secure hosting and secret management practices
- client enforces role governance policy
- client performs scheduled backup and restore testing

Residual risks if not maintained:
- access misconfiguration
- delayed detection of operational issues
- reduced recovery readiness after incidents

## 14. Warranty and Service Boundaries (Template Section)
- Warranty Period: As per signed service agreement
- Covered Defect Types: Deployment defects, configuration defects, workflow defects introduced in delivered scope
- Excluded Items: Third-party outages, client-side unauthorized changes, infrastructure changes outside agreed scope
- Response SLA: As per support matrix in client agreement
- Resolution SLA: As per severity and support tier in client agreement

## 15. Ownership Transfer Effective Date
Operational ownership transfer date: 2026-04-18 (or client-approved effective date on sign-off)

From this date onward, the client becomes the primary operational owner under the agreed support model.

## 16. Sign-Off and Acceptance

### 16.1 Implementation Team Sign-Off
- Name: Handover and Delivery Team Representative
- Title: Implementation Lead
- Signature:
- Date:

### 16.2 Client Technical Sign-Off
- Name: Client Technical Owner
- Title: Technical Operations Lead
- Signature:
- Date:

### 16.3 Client Business Sign-Off
- Name: Client Business Owner
- Title: Operations/Business Sponsor
- Signature:
- Date:

## 17. Annex A - Reference Documents
- docs/runbooks/client-system-handover-master.md
- docs/runbooks/client-system-handover-branded-template.md
- docs/runbooks/client-system-handover-executive-summary.md
- docs/runbooks/admin-dashboard-user-guide-nontechnical.md
- docs/runbooks/admin-dashboard-guide-branch-staff.md
- docs/runbooks/admin-dashboard-guide-super-admin.md
- docs/runbooks/admin-dashboard-guide-bilingual-en-am.md
- docs/runbooks/training/admin-dashboard-trainer-pack-en-am.md
- docs/runbooks/training/admin-dashboard-quick-reference-en-am.md
- docs/runbooks/training/admin-dashboard-training-attendance-checklist.md

---
Prepared for formal client handover. Populate blank legal and operational fields before execution.
