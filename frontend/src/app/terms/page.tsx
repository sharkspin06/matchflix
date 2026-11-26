'use client';

import Link from 'next/link';
import LegalPage, { LegalSection } from '@/components/LegalPage';
import { LEGAL } from '@/lib/legal';

const sections: LegalSection[] = [
  {
    id: 'acceptance',
    title: 'Accepting these terms',
    body: (
      <p>
        By creating an account or using {LEGAL.appName} (the &ldquo;Service&rdquo;), you agree to these Terms of Service and to our{' '}
        <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>. If you don&apos;t agree, please don&apos;t use
        the Service. The Service is provided by {LEGAL.owner} (&ldquo;we&rdquo;, &ldquo;us&rdquo;).
      </p>
    ),
  },
  {
    id: 'eligibility',
    title: 'Who can use Cinephile',
    body: (
      <ul>
        <li>You must be <strong>at least 18 years old</strong>. We ask for your date of birth when you sign up and won&apos;t create an account for anyone younger.</li>
        <li>You must be legally able to agree to these terms where you live.</li>
        <li>You may only have one account, and it must be your own.</li>
        <li>You can&apos;t use the Service if we have previously removed you from it.</li>
      </ul>
    ),
  },
  {
    id: 'account',
    title: 'Your account',
    body: (
      <>
        <p>You&apos;re responsible for keeping your login details private and for everything that happens under your account. Tell us straight away if you think someone else has accessed it.</p>
        <p>The information on your profile — your name, birthday, gender, photos, films and other details — must be true and about you.</p>
      </>
    ),
  },
  {
    id: 'conduct',
    title: 'How to behave',
    body: (
      <>
        <p>{LEGAL.appName} is for people who want to connect over a shared love of film. Treat everyone with kindness and respect. You agree not to:</p>
        <ul>
          <li>Harass, threaten, bully, stalk or intimidate anyone.</li>
          <li>Post content that is hateful or discriminatory based on race, religion, nationality, ethnicity, skin colour, ability, size, sex, gender identity or sexual orientation.</li>
          <li>Share nudity, sexually explicit or violent content, or anything involving minors.</li>
          <li>Pretend to be someone else, or use photos of another person.</li>
          <li>Ask other users for money, run scams, or advertise or sell anything.</li>
          <li>Share someone else&apos;s private information without their permission.</li>
          <li>Use bots, scrapers or other automated tools, or try to break, overload or get around the Service&apos;s security.</li>
          <li>Use the Service for anything illegal.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'content',
    title: 'Your content',
    body: (
      <>
        <p>You own the photos, text and other content you add (&ldquo;your content&rdquo;). By adding it, you give us a non-exclusive, worldwide, royalty-free licence to store, display and process it only so we can run the Service — for example, to show your profile to other users.</p>
        <p>You promise you have the right to share your content and that it follows these terms. We may remove content that breaks these terms.</p>
      </>
    ),
  },
  {
    id: 'matching',
    title: 'Likes, matches and messages',
    body: (
      <>
        <p>When you like someone and they like you back, it&apos;s a match and you can message each other. You can unmatch at any time, which ends the conversation for both of you.</p>
        <p>We can&apos;t promise you&apos;ll find a match, and we don&apos;t run background checks on users. <strong>You are responsible for your interactions with other people</strong>, online and in person. If you meet someone, meet in a public place, tell a friend where you&apos;ll be, and never send money to someone you&apos;ve met online.</p>
      </>
    ),
  },
  {
    id: 'films',
    title: 'Film information',
    body: (
      <p>Film titles, posters and search results come from The Movie Database (TMDB). {LEGAL.appName} uses the TMDB API but is not endorsed or certified by TMDB. Posters and film artwork belong to their respective owners.</p>
    ),
  },
  {
    id: 'safety',
    title: 'Reporting and removal',
    body: (
      <>
        <p>If someone breaks these terms or makes you feel unsafe, use <strong>Report</strong> or <strong>Block</strong> on their profile or in your chat with them, or contact us at {LEGAL.contactEmail}. Reporting also blocks them, and they aren&apos;t told who reported them. If you are in danger, contact your local emergency services first.</p>
        <p>We may warn, suspend or remove any account that breaks these terms or puts other users at risk, with or without notice.</p>
      </>
    ),
  },
  {
    id: 'ending',
    title: 'Ending your account',
    body: (
      <p>You can stop using the Service and delete your account at any time, in the app (Home → Edit profile → Delete account) or at <Link href="/delete-account" className="underline underline-offset-2">our account deletion page</Link>. If you can&apos;t sign in, email us at {LEGAL.contactEmail} from the address you signed up with. We may also close accounts that have been inactive for a long time.</p>
    ),
  },
  {
    id: 'disclaimers',
    title: 'Disclaimers',
    body: (
      <p>The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the extent the law allows, we don&apos;t guarantee that it will always be available, secure or free of errors, and we aren&apos;t responsible for how other users behave.</p>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    body: (
      <p>To the extent the law allows, we aren&apos;t liable for any indirect, incidental or consequential loss, or for any loss arising from your interactions with other users. Nothing in these terms limits liability that cannot be limited by law.</p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    body: (
      <p>We may update these terms from time to time. When we do, we&apos;ll change the effective date above, and for important changes we&apos;ll let you know in the app. If you keep using the Service after a change, you accept the updated terms.</p>
    ),
  },
  {
    id: 'law',
    title: 'Governing law',
    body: <p>These terms are governed by the laws of {LEGAL.governingLaw}, except where the law of the place you live says otherwise.</p>,
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <p>
          These terms explain the rules for using {LEGAL.appName}. We&apos;ve tried to keep them short and in plain language — please read
          them before you start swiping.
        </p>
      }
      sections={sections}
      other={{ href: '/privacy', label: 'Privacy Policy' }}
    />
  );
}
