import { useState } from 'react';
import { toast } from 'sonner';
import StatusBadge from '@/components/admin/StatusBadge';
import { useAdminI18n } from '@/lib/uiI18n';

export default function SystemSettings() {
  const { tAdmin } = useAdminI18n();
  const [organizationName, setOrganizationName] = useState('Zemen Saving and Credit Cooperative');
  const [contactEmail, setContactEmail] = useState('info@zemensacco.com');
  const [primaryPhone, setPrimaryPhone] = useState('0953444411');
  const [threshold, setThreshold] = useState('5000000');
  const [assignment, setAssignment] = useState('Round Robin');
  const [complianceLock, setComplianceLock] = useState(true);
  const [autoAssign, setAutoAssign] = useState(true);
  const [kycRequired, setKycRequired] = useState(true);
  const [allowResubmission, setAllowResubmission] = useState(false);

  const statusDefinitions = [
    [tAdmin('draft', 'Draft'), tAdmin('statusDefinitionDraft', 'Application started but not submitted')],
    [tAdmin('submitted', 'Submitted'), tAdmin('statusDefinitionSubmitted', 'Application received and awaiting assignment')],
    [tAdmin('underReview', 'Under Review'), tAdmin('statusDefinitionUnderReview', 'Assigned officer reviewing application')],
    [tAdmin('kycVerification', 'KYC Verification'), tAdmin('statusDefinitionKycVerification', 'Documents being verified')],
    [tAdmin('pendingClarification', 'Pending Clarification'), tAdmin('statusDefinitionPendingClarification', 'Additional info requested from applicant')],
    [tAdmin('pendingDocuments', 'Pending Documents'), tAdmin('statusDefinitionPendingDocuments', 'Missing documents requested')],
    [tAdmin('approved', 'Approved'), tAdmin('statusDefinitionApproved', 'Application approved')],
    [tAdmin('rejected', 'Rejected'), tAdmin('statusDefinitionRejected', 'Application denied')],
  ];

  const handleSaveSettings = () => {
    toast.success(tAdmin('systemSettingsSavedSuccessfully', 'System settings saved successfully.'));
  };

  const handleRuleToggle = (ruleName: string, enabled: boolean) => {
    toast.success(tAdmin('ruleToggleStatus', '{{ruleName}} {{status}}.', { ruleName, status: enabled ? tAdmin('enabled', 'enabled') : tAdmin('disabled', 'disabled') }));
  };

  return (
    <section className="space-y-4">
      <article className="space-y-4 rounded-lg bg-white p-4">
        <h1 className="font-serif text-2xl text-foreground">{tAdmin('systemSettings', 'System Settings')}</h1>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            {tAdmin('organizationName', 'Organization Name')}
            <input className="h-10 w-full rounded border border-slate-300 px-3 placeholder:text-slate-400/70" placeholder="e.g. Zemen Saving and Credit Cooperative" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} />
          </label>

          <label className="space-y-1 text-sm font-semibold text-slate-700">
            {tAdmin('contactEmail', 'Contact Email')}
            <input className="h-10 w-full rounded border border-slate-300 px-3 placeholder:text-slate-400/70" placeholder="e.g. info@zemensacco.com" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} />
          </label>

          <label className="space-y-1 text-sm font-semibold text-slate-700">
            {tAdmin('primaryPhone', 'Primary Phone')}
            <input className="h-10 w-full rounded border border-slate-300 px-3 placeholder:text-slate-400/70" placeholder="e.g. +251953444411" value={primaryPhone} onChange={(event) => setPrimaryPhone(event.target.value)} />
          </label>

          <label className="space-y-1 text-sm font-semibold text-slate-700">
            {tAdmin('loanApprovalThresholdEtb', 'Loan Approval Threshold (ETB)')}
            <input className="h-10 w-full rounded border border-slate-300 px-3 placeholder:text-slate-400/70" placeholder="e.g. 5000000" value={threshold} onChange={(event) => setThreshold(event.target.value)} />
          </label>

          <label className="space-y-1 text-sm font-semibold text-slate-700 md:col-span-2">
            {tAdmin('automatedAssignment', 'Automated Assignment')}
            <select className="h-10 w-full rounded border border-slate-300 px-3" value={assignment} onChange={(event) => setAssignment(event.target.value)}>
              <option>{tAdmin('roundRobin', 'Round Robin')}</option>
              <option>{tAdmin('branchPool', 'Branch Pool')}</option>
              <option>{tAdmin('manual', 'Manual')}</option>
            </select>
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={complianceLock}
            onChange={(event) => {
              setComplianceLock(event.target.checked);
              handleRuleToggle(tAdmin('complianceLock', 'Compliance lock'), event.target.checked);
            }}
          />
          {tAdmin('complianceLockEnabled', 'Compliance Lock Enabled')}
        </label>

        <button className="rounded bg-blue-700 px-4 py-2 text-xs font-black uppercase text-white" onClick={handleSaveSettings}>{tAdmin('saveSettings', 'Save Settings')}</button>
      </article>

      <article className="space-y-2 rounded-lg bg-white p-4">
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">{tAdmin('statusDefinitions', 'Status Definitions')}</p>
        {statusDefinitions.map(([status, description]) => (
          <div key={status} className="rounded p-3">
            <StatusBadge status={status.replace(/\s+/g, '_').toLowerCase()} />
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        ))}
      </article>

      <article className="space-y-3 rounded-lg bg-white p-4">
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">{tAdmin('workflowRules', 'Workflow Rules')}</p>
        <label className="flex items-center justify-between gap-2 text-sm text-slate-700">
          <span>{tAdmin('autoAssignToBranchOfficer', 'Auto-assign to branch officer')}</span>
          <input
            type="checkbox"
            checked={autoAssign}
            onChange={(event) => {
              setAutoAssign(event.target.checked);
              handleRuleToggle(tAdmin('autoAssignToBranchOfficer', 'Auto-assign to branch officer'), event.target.checked);
            }}
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-sm text-slate-700">
          <span>{tAdmin('requireKycBeforeApproval', 'Require KYC before approval')}</span>
          <input
            type="checkbox"
            checked={kycRequired}
            onChange={(event) => {
              setKycRequired(event.target.checked);
              handleRuleToggle(tAdmin('requireKycBeforeApproval', 'Require KYC before approval'), event.target.checked);
            }}
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-sm text-slate-700">
          <span>{tAdmin('allowResubmissionAfterRejection', 'Allow re-submission after rejection')}</span>
          <input
            type="checkbox"
            checked={allowResubmission}
            onChange={(event) => {
              setAllowResubmission(event.target.checked);
              handleRuleToggle(tAdmin('allowResubmissionAfterRejection', 'Allow re-submission after rejection'), event.target.checked);
            }}
          />
        </label>
      </article>
    </section>
  );
}
