import { CircleHelp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ContextHelpProps {
  title: string;
  detail: string;
}

export default function ContextHelp({ title, detail }: ContextHelpProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={title}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-700"
        >
          <CircleHelp className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent sideOffset={8} className="max-w-xs text-left">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-xs opacity-90">{detail}</p>
      </TooltipContent>
    </Tooltip>
  );
}
