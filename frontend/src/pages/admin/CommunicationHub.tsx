import { useState } from 'react';
import { toast } from 'sonner';
import { useAdminI18n } from '@/lib/uiI18n';

export default function CommunicationHub() {
  const t = useAdminI18n();
  const [notifyOnSubmission, setNotifyOnSubmission] = useState(true);
  const [notifyOnStatusChange, setNotifyOnStatusChange] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(false);

  const emailTemplates = [
    t('adminEmailTemplateApplicationReceived', 'Application Received'),
    t('adminEmailTemplateApplicationApproved', 'Application Approved'),
    t('adminEmailTemplateApplicationRejected', 'Application Rejected'),
    t('adminEmailTemplateDocumentRequired', 'Document Required'),
    t('adminEmailTemplatePendingReviewReminder', 'Pending Review Reminder'),
  ];

  const smsTemplates = [
    t('adminSmsTemplateApplicationReceived', 'Application Received (SMS)'),
    t('adminSmsTemplateApprovalNotification', 'Approval Notification (SMS)'),
    t('adminSmsTemplateDocumentReminder', 'Document Reminder (SMS)'),
  ];

  return (
    <section className="space-y-4">

      <article className="rounded-lg bg-white p-4">
        <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">{t('adminEmailTemplatesLabel', 'Email Templates')}</p>
        <div className="space-y-2">
          {emailTemplates.map((template) => (
            <div key={template} className="flex items-center justify-between rounded bg-slate-50 p-2 text-sm text-slate-700">
              <span>{template}</span>
              <button className="text-xs font-bold text-blue-700" onClick={() => toast.info(`${t('adminEditTemplateToastPrefix', 'Edit template:')} ${template}`)}>{t('edit', 'Edit')}</button>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-lg bg-white p-4">
        <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">{t('adminSmsTemplatesLabel', 'SMS Templates')}</p>
        <div className="space-y-2">
          {smsTemplates.map((template) => (
            <div key={template} className="flex items-center justify-between rounded bg-slate-50 p-2 text-sm text-slate-700">
              <span>{template}</span>
              <button className="text-xs font-bold text-blue-700" onClick={() => toast.info(`${t('adminEditTemplateToastPrefix', 'Edit template:')} ${template}`)}>{t('edit', 'Edit')}</button>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-lg bg-white p-4">
        <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">{t('adminTriggerRulesLabel', 'Trigger Rules')}</p>
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-2 text-sm text-slate-700">
            <span>{t('adminNotifyOnNewSubmissionLabel', 'Notify on new submission')}</span>
            <input type="checkbox" checked={notifyOnSubmission} onChange={(event) => { setNotifyOnSubmission(event.target.checked); toast.success(event.target.checked ? t('adminNotifyOnSubmissionEnabled', 'Notify on submission enabled') : t('adminNotifyOnSubmissionDisabled', 'Notify on submission disabled')); }} />
          </label>
          <label className="flex items-center justify-between gap-2 text-sm text-slate-700">
            <span>{t('adminNotifyOnStatusChangeLabel', 'Notify applicant on status change')}</span>
            <input type="checkbox" checked={notifyOnStatusChange} onChange={(event) => { setNotifyOnStatusChange(event.target.checked); toast.success(event.target.checked ? t('adminStatusChangeNotificationEnabled', 'Status change notification enabled') : t('adminStatusChangeNotificationDisabled', 'Status change notification disabled')); }} />
          </label>
          <label className="flex items-center justify-between gap-2 text-sm text-slate-700">
            <span>{t('adminDailyPendingReviewDigestLabel', 'Daily pending review digest')}</span>
            <input type="checkbox" checked={dailyDigest} onChange={(event) => { setDailyDigest(event.target.checked); toast.success(event.target.checked ? t('adminDailyDigestEnabled', 'Daily digest enabled') : t('adminDailyDigestDisabled', 'Daily digest disabled')); }} />
          </label>
        </div>
      </article>
    </section>
  );
}
