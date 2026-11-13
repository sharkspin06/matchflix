'use client';

import Link from 'next/link';
import BackButton from '@/components/BackButton';
import { LEGAL } from '@/lib/legal';

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

interface LegalPageProps {
  title: string;
  intro: React.ReactNode;
  sections: LegalSection[];
  other: { href: string; label: string };
}

/** Shared layout for the Terms of Service and Privacy Policy */
export default function LegalPage({ title, intro, sections, other }: LegalPageProps) {
  return (
    <div className="theme-surface min-h-screen bg-white">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-3xl mx-auto h-16 px-4 flex items-center justify-between">
          <BackButton href="/" label="Home" />
          <Link href={other.href} className="text-sm font-semibold text-gray-600 hover:text-gray-900">
            {other.label}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-10 pb-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">{LEGAL.appName}</p>
        <h1 className="mt-2 text-[34px] leading-tight font-extrabold tracking-tight text-gray-900">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">Effective {LEGAL.effectiveDate}</p>

        <div className="mt-6 text-[15px] leading-relaxed text-gray-700">{intro}</div>

        {/* Contents */}
        <nav aria-label="Contents" className="mt-8 rounded-2xl bg-gray-50 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500 mb-3">Contents</p>
          <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            {sections.map((section, index) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-gray-700 hover:text-gray-900 hover:underline underline-offset-2">
                  <span className="text-gray-400 tabular-nums mr-2">{String(index + 1).padStart(2, '0')}</span>
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          {sections.map((section, index) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="text-lg font-bold text-gray-900">
                <span className="text-gray-400 tabular-nums mr-2">{String(index + 1).padStart(2, '0')}</span>
                {section.title}
              </h2>
              <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-gray-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_strong]:text-gray-900">
                {section.body}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-14 border-t border-gray-100 pt-6 text-sm text-gray-500">
          Questions? Contact {LEGAL.owner} at{' '}
          <a href={`mailto:${LEGAL.contactEmail}`} className="font-semibold text-gray-900 underline underline-offset-2">
            {LEGAL.contactEmail}
          </a>
          .
        </div>
      </main>
    </div>
  );
}
