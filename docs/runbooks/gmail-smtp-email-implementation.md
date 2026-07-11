# Gmail SMTP Email Integration Runbook

## Purpose

This document explains how to enable free Gmail SMTP email delivery for the backend and how it is wired into the current application workflow.

Implemented in this repo:
- SMTP transport in backend notification service
- Loan submission email
- Membership approval email
- Loan approval email

## 1. Google Account Setup

1. Sign in to the Gmail account you want to send from.
2. Open Google Account Security settings.
3. Enable 2-Step Verification.
4. Open App Passwords.
5. Create an app password for Mail.
6. Copy the generated 16-character app password.

Important:
- Use the app password, not your normal Gmail password.
- Keep the app password secret and never commit it to source control.

## 2. Backend Dependencies

Nodemailer is required and has been added to backend dependencies.

Install backend packages:

```bash
cd backend
npm install
```

## 3. Environment Variables

Configure these values in backend environment configuration (for example backend/.env):

```env
# Enable/disable email delivery
EMAIL_ENABLED=true

# Gmail SMTP credentials
EMAIL_USER=youraccount@gmail.com
EMAIL_PASS=your_16_char_app_password

# Optional SMTP overrides (defaults work for Gmail)
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=465

# Optional sender identity
EMAIL_FROM_NAME=Zemen SACCO
EMAIL_FROM_ADDRESS=youraccount@gmail.com
```

Behavior notes:
- If EMAIL_ENABLED is false, emails are skipped safely.
- If EMAIL_ENABLED is true but credentials are missing/invalid, delivery fails gracefully and the API response remains stable.

## 4. Where Email Is Triggered

### Loan submitted
- Event: New loan application created with SUBMITTED status
- Route: POST /api/loans
- Template: Loan Application Submitted

### Membership approved
- Event: Membership status changed to APPROVED
- Routes:
  - PATCH /api/membership/:id/status
  - PATCH /api/admin/applications/membership/:id/status
- Template: Membership Approved

### Loan approved
- Event: Loan status changed to APPROVED
- Routes:
  - PATCH /api/loans/:id/status
  - PATCH /api/admin/applications/loan/:id/status
- Template: Loan Approved

## 5. Message Templates Implemented

Implemented in backend notification service:

- Membership Approved
- Loan Application Submitted
- Loan Approved

Template style is plain text and includes personalized recipient name.

## 6. Validation and Smoke Test

1. Start backend:

```bash
cd backend
npm run dev
```

2. Submit a loan application with a valid applicant email.
3. Approve a membership application.
4. Approve a loan application.
5. Confirm delivery from backend logs and recipient inbox.

Optional admin endpoint test:
- POST /api/admin/notifications/send-test
- Channel: EMAIL
- Uses notification service transport

## 7. Troubleshooting

### Authentication failed
- Cause: Wrong EMAIL_PASS or 2FA not enabled.
- Fix: Regenerate App Password and update EMAIL_PASS.

### Connection timeout/refused
- Cause: SMTP host/port blocked or wrong values.
- Fix: Use Gmail defaults smtp.gmail.com and port 465.

### No email received but API succeeded
- Cause: EMAIL_ENABLED false or credentials missing.
- Fix: Verify EMAIL_ENABLED, EMAIL_USER, EMAIL_PASS values.

### Message in spam
- Cause: New sender reputation.
- Fix: Check spam folder and mark as not spam.

## 8. Production Recommendations

- Store secrets in secure secret management, not plain files.
- Use a dedicated sending account (not personal account).
- Add SPF, DKIM, and DMARC when moving to custom domain email.
- For higher volume/reliability, migrate from Gmail SMTP to a transactional provider (SendGrid, Mailgun, SES).
