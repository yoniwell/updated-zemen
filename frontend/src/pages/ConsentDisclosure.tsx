import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/translations';

export default function ConsentDisclosure() {
  const { lang } = useLanguage();
  const t = translations[lang];
  const localeByLang: Record<string, string> = {
    en: 'en-US',
    am: 'am-ET',
    ti: 'ti-ET',
  };
  const formattedLastUpdated = new Intl.DateTimeFormat(localeByLang[lang] ?? 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date('2026-03-27T00:00:00Z'));

  return (
    <div className="min-h-screen bg-white pb-20 pt-16">
      <div className="container mx-auto max-w-4xl px-6">
        <h1 className="mb-4 text-4xl font-black uppercase italic tracking-tight text-blue-950">{t.legal_consent_title}</h1>
        <p className="mb-10 text-sm font-semibold text-slate-500">{t.legal_lastUpdated}: {formattedLastUpdated}</p>

        <section className="space-y-8 text-slate-700">
          <div>
            <h2 className="mb-2 text-xl font-black text-blue-900">{t.legal_consent_1_title}</h2>
            <p>{t.legal_consent_1_body}</p>
          </div>

          <div>
            <h2 className="mb-2 text-xl font-black text-blue-900">{t.legal_consent_2_title}</h2>
            <p>{t.legal_consent_2_body}</p>
          </div>

          <div>
            <h2 className="mb-2 text-xl font-black text-blue-900">{t.legal_consent_3_title}</h2>
            <p>{t.legal_consent_3_body}</p>
          </div>

          <div>
            <h2 className="mb-2 text-xl font-black text-blue-900">{t.legal_consent_4_title}</h2>
            <p>{t.legal_consent_4_body}</p>
          </div>

          <div>
            <h2 className="mb-2 text-xl font-black text-blue-900">{t.legal_consent_5_title}</h2>
            <p>{t.legal_consent_5_body}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
