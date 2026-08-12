import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white pb-24 pt-20">
      <div className="container mx-auto max-w-3xl px-6 text-center">
        <p className="text-sm font-black uppercase tracking-[0.35em] text-blue-600">Error 404</p>
        <h1 className="mt-4 text-6xl font-black uppercase italic tracking-tight text-blue-950">Page Not Found</h1>
        <p className="mx-auto mt-6 max-w-xl text-base font-semibold text-slate-500">
          The page you requested does not exist or may have been moved. Use the links below to continue.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/contact">Contact Support</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
