import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface PublicServiceNoticeProps {
  message: string;
}

export default function PublicServiceNotice({ message }: PublicServiceNoticeProps) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-sm font-semibold">{message}</p>
      </div>
    </div>
  );
}
