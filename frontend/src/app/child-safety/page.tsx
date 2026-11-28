'use client';

import Link from 'next/link';
import LegalPage, { LegalSection } from '@/components/LegalPage';
import { LEGAL } from '@/lib/legal';

// Published standards against child sexual abuse and exploitation (CSAE), linked from Google Play.
// Keep this in line with what the app and team actually do.
const sections: LegalSection[] = [
  {
    id: 'zero-tolerance',
    title: 'Zero tolerance',
    body: (
      <>
        <p>
          {LEGAL.appName} has zero tolerance for child sexual abuse and exploitation (CSAE) and child sexual abuse
          material (CSAM). This includes any content, message or behaviour that sexualises, grooms, exploits or endangers
          a child, or attempts to.
        </p>
        <p>It is strictly prohibited to use {LEGAL.appName} to:</p>
        <ul>
          <li>Share, request, create or link to sexual or sexualised images, videos or text involving anyone under 18.</li>
          <li>Contact, groom, solicit or arrange to meet anyone under 18.</li>
          <li>Post photos of children on their own, or in any sexualised way.</li>
          <li>Promote, normalise or trade in any form of child sexual exploitation.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'adults-only',
    title: 'Adults only',
    body: (
      <ul>
        <li>{LEGAL.appName} is only for people aged 18 and over.</li>
        <li>Everyone must give their date of birth when signing up. We work out their age from it and refuse to create an account for anyone under 18.</li>
        <li>Anyone can report a person they believe is under 18. We remove accounts that belong to minors.</li>
      </ul>
    ),
  },
  {
    id: 'reporting',
    title: 'How to report a concern',
    body: (
      <>
        <p>
          In the app, open the person&apos;s profile (or the ⋮ menu in your chat with them), tap <strong>Report</strong>,
          and choose <strong>Child safety concern</strong> or <strong>Might be under 18</strong>. Reporting also blocks the
          person straight away, and they aren&apos;t told who reported them. Reports keep a copy of recent messages, so
          evidence isn&apos;t lost.
        </p>
        <p>
          You can also email us at{' '}
          <a href={`mailto:${LEGAL.contactEmail}`} className="underline underline-offset-2">{LEGAL.contactEmail}</a>.
        </p>
        <p>
          <strong>If a child is in immediate danger, contact your local emergency services or police first.</strong>
        </p>
      </>
    ),
  },
  {
    id: 'response',
    title: 'What we do',
    body: (
      <ul>
        <li>We review child safety reports as a priority.</li>
        <li>We remove violating content and permanently ban the accounts involved.</li>
        <li>We preserve relevant information so it can be provided to the authorities.</li>
        <li>
          We report apparent child sexual abuse material and exploitation to the relevant regional and national
          authorities, including law enforcement in the Philippines and, where applicable, the National Center for Missing
          &amp; Exploited Children (NCMEC).
        </li>
        <li>We cooperate with law enforcement investigations as required by law.</li>
      </ul>
    ),
  },
  {
    id: 'contact',
    title: 'Child safety contact',
    body: (
      <p>
        Our designated contact for child safety and CSAM prevention is {LEGAL.owner}, reachable at{' '}
        <a href={`mailto:${LEGAL.contactEmail}`} className="underline underline-offset-2">{LEGAL.contactEmail}</a>. See
        also our <Link href="/guidelines" className="underline underline-offset-2">Community guidelines</Link> and{' '}
        <Link href="/terms" className="underline underline-offset-2">Terms of Service</Link>.
      </p>
    ),
  },
];

export default function ChildSafetyPage() {
  return (
    <LegalPage
      logo="logo2"
      title="Child Safety Standards"
      intro={
        <p>
          These standards explain how {LEGAL.appName} prevents and responds to child sexual abuse and exploitation. They
          apply to everyone who uses the app, and to every profile, photo and message.
        </p>
      }
      sections={sections}
      other={{ href: '/guidelines', label: 'Guidelines' }}
    />
  );
}
