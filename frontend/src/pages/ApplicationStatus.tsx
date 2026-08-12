import { FormEvent, useMemo, useState } from 'react';
import { Search, BadgeCheck, CircleX, Clock3, FileClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getApiBaseUrl } from '@/lib/apiBaseUrl';
import { useLanguage } from '@/context/LanguageContext';
import { usePublicUiI18n } from '@/lib/uiI18n';
import { Input } from '@/components/ui/input';

type StatusResponse = {
  applicationType: 'membership' | 'loan';
  application: {
    id: string;
    referenceNo: string;
    status: string;
    submittedAt?: string | null;
    reviewedAt?: string | null;
    updatedAt: string;
  };
};

const baseUrl = getApiBaseUrl();

function statusTone(status: string) {
  const upper = status.toUpperCase();

  if (upper === 'APPROVED' || upper === 'ACTIVATED') {
    return {
      icon: BadgeCheck,
      className: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    };
  }

  if (upper === 'REJECTED') {
    return {
      icon: CircleX,
      className: 'text-rose-700 bg-rose-50 border-rose-200',
    };
  }



  return {
    icon: Clock3,
    className: 'text-blue-700 bg-blue-50 border-blue-200',
  };
}

function labelizeStatus(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function ApplicationStatus() {
  const tPublic = usePublicUiI18n();
  const { lang } = useLanguage();
  const localeByLang: Record<string, string> = {
    en: 'en-US',
    am: 'am-ET',
    ti: 'ti-ET',
  };
  const locale = localeByLang[lang] ?? 'en-US';

  const [referenceNo, setReferenceNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StatusResponse | null>(null);

  const trimmedReference = useMemo(() => referenceNo.trim().toUpperCase(), [referenceNo]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!trimmedReference) {
      setError(tPublic('statusErrorEnterReference', 'Please enter your application reference number.'));
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/api/applications/status/${encodeURIComponent(trimmedReference)}`);
      const payload = (await response.json()) as StatusResponse | { error?: string };

      if (!response.ok) {
        setResult(null);
        setError(payload && 'error' in payload && payload.error ? payload.error : tPublic('statusErrorFetchNow', 'Unable to fetch status right now.'));
        return;
      }

      setResult(payload as StatusResponse);
    } catch {
      setResult(null);
      setError(tPublic('statusErrorTryAgain', 'Unable to fetch status right now. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const tone = result ? statusTone(result.application.status) : null;
  const StatusIcon = tone?.icon;

  return (
    <div className="min-h-screen bg-white pb-24 pt-20">
      <div className="container mx-auto max-w-4xl px-6">
        <div className="mb-10 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-blue-600">{tPublic('statusSelfService', 'Self Service')}</p>
          <h1 className="mt-3 text-4xl font-black uppercase italic tracking-tight text-blue-950 lg:text-5xl">
            {tPublic('trackApplication', 'Track Application')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold text-slate-500">
            {tPublic('statusHeroDescription', 'Enter your reference number to check the latest status of your membership or loan application.')}
          </p>
        </div>

        <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <label htmlFor="referenceNo" className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            {tPublic('statusReferenceNumberLabel', 'Reference Number')}
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              id="referenceNo"
              value={referenceNo}
              onChange={(event) => setReferenceNo(event.target.value)}
              placeholder={tPublic('statusReferencePlaceholder', 'Example: ZM-MEM-2026-0001')}
              className="h-12 font-semibold uppercase"
            />
            <Button type="submit" disabled={loading} className="h-12 min-w-40 bg-blue-700 hover:bg-blue-800">
              <Search className="mr-2 h-4 w-4" />
              {loading ? tPublic('statusChecking', 'Checking...') : tPublic('statusCheckButton', 'Check Status')}
            </Button>
          </div>
          {error ? <p className="mt-3 text-sm font-semibold text-rose-700">{error}</p> : null}
        </form>

        {result && tone && StatusIcon ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{tPublic('statusApplicationLabel', 'Application')}</p>
                <p className="mt-1 text-lg font-black uppercase tracking-tight text-blue-950">{result.application.referenceNo}</p>
                <p className="text-sm font-semibold text-slate-500">
                  {result.applicationType === 'loan' ? tPublic('statusLoanApplicationType', 'Loan Application') : tPublic('statusMembershipApplicationType', 'Membership Application')}
                </p>
              </div>

              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wider ${tone.className}`}>
                <StatusIcon className="h-4 w-4" />
                {labelizeStatus(result.application.status)}
              </div>
            </div>

            <div className="mt-5 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{tPublic('statusSubmittedLabel', 'Submitted')}</p>
                <p className="mt-1 font-semibold">
                  {result.application.submittedAt ? new Date(result.application.submittedAt).toLocaleString(locale) : tPublic('statusNotSubmittedYet', 'Not submitted yet')}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{tPublic('statusReviewedLabel', 'Reviewed')}</p>
                <p className="mt-1 font-semibold">
                  {result.application.reviewedAt ? new Date(result.application.reviewedAt).toLocaleString(locale) : tPublic('statusPendingReview', 'Pending review')}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{tPublic('statusLastUpdatedLabel', 'Last Updated')}</p>
                <p className="mt-1 font-semibold">{new Date(result.application.updatedAt).toLocaleString(locale)}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
