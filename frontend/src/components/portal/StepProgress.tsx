import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
interface StepProgressProps {
  steps: string[];
  currentStep: number;
  title?: string;
}

export default function StepProgress({ steps, currentStep, title = 'Application Progress' }: StepProgressProps) {
  return (
    <aside
      className="sticky top-24 z-20 rounded-xl border border-blue-100 bg-blue-950 text-white shadow-sm lg:top-32"
      aria-label="Application progress panel"
    >
      <p id="step-progress-title" className="px-4 pb-2 pt-4 text-[10px] font-black uppercase tracking-[0.2em] text-blue-300 md:px-6 md:pb-3 md:pt-6 md:text-xs">
        {title}
      </p>
      <ul className="flex gap-2 overflow-x-auto px-3 pb-4 md:px-4 lg:block lg:space-y-3 lg:overflow-visible lg:px-6 lg:pb-6" role="list" aria-labelledby="step-progress-title">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isDone = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <li
              key={step}
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-md border border-blue-700/70 px-3 py-2 text-xs transition-colors lg:gap-3 lg:border-transparent lg:px-2 lg:text-sm',
                isCurrent ? 'border-blue-500 bg-blue-800 text-white' : 'text-blue-200'
              )}
            >
              {isDone ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              ) : (
                <Circle className={cn('h-4 w-4', isCurrent ? 'text-white' : 'text-blue-400')} />
              )}
              <span className="font-black text-[10px] text-blue-200/90 lg:hidden">{stepNumber}</span>
              <span className="max-w-[170px] truncate font-semibold lg:max-w-none">{step}</span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
