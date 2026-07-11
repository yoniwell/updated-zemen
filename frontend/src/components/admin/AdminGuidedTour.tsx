import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { AdminRole } from '@/lib/adminRbac';
import { useAdminI18n } from '@/lib/uiI18n';

type TourStep = {
  title: string;
  detail: string;
  route: string;
};

interface AdminGuidedTourProps {
  role: string | undefined;
}

const tourVersion = 'v1';

const roleTour = (role: AdminRole | 'UNKNOWN'): TourStep[] => {
  if (role === 'CONTENT_ADMIN') {
    return [
      { title: 'Review Dashboard Signals', detail: 'Start with current platform health and abuse indicators.', route: '/admin/dashboard' },
      { title: 'Open CMS Queue', detail: 'Publish/download workflows and media quality checks.', route: '/admin/cms' },
      { title: 'Check Notifications', detail: 'Verify template delivery and acknowledgement ownership.', route: '/admin/notifications' },
    ];
  }

  return [
    { title: 'Start on Dashboard', detail: 'Get live workload, SLA risk, and security signal awareness.', route: '/admin/dashboard' },
    { title: 'Review Queues', detail: 'Process membership/loan/document tasks by priority and SLA.', route: '/admin/membership-queue' },
    { title: 'Audit Log', detail: 'Use audit analytics before high-risk decisions.', route: '/admin/audit-log' },
  ];
};

export default function AdminGuidedTour({ role }: AdminGuidedTourProps) {
  const navigate = useNavigate();
  const { tAdmin } = useAdminI18n();
  const normalizedRole = (role || 'UNKNOWN') as AdminRole | 'UNKNOWN';
  const key = `admin:tour:${normalizedRole}:${tourVersion}`;

  const completed = useMemo(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    return window.localStorage.getItem(key) === 'done';
  }, [key]);

  const [hidden, setHidden] = useState(completed);
  const [stepIndex, setStepIndex] = useState(0);
  const steps = roleTour(normalizedRole);

  if (hidden || steps.length === 0) {
    return null;
  }

  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLast = stepIndex >= steps.length - 1;

  return (
    <div className="fixed bottom-4 right-4 z-[70] w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-blue-200 bg-white p-4 shadow-lg">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">{tAdmin('quickTour', 'Quick Tour')}</p>
      <h3 className="mt-1 text-sm font-bold text-slate-900">{step.title}</h3>
      <p className="mt-1 text-xs text-slate-600">{step.detail}</p>
      <p className="mt-2 text-[11px] text-slate-500">{tAdmin('step', 'Step')} {stepIndex + 1} / {steps.length}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => navigate(step.route)}>{tAdmin('openStep', 'Open Step')}</Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (isLast) {
              window.localStorage.setItem(key, 'done');
              setHidden(true);
              return;
            }
            setStepIndex((index) => Math.min(index + 1, steps.length - 1));
          }}
        >
          {isLast ? tAdmin('finishTour', 'Finish Tour') : tAdmin('next', 'Next')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            window.localStorage.setItem(key, 'done');
            setHidden(true);
          }}
        >
          {tAdmin('skip', 'Skip')}
        </Button>
      </div>
    </div>
  );
}
