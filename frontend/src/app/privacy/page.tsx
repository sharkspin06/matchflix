'use client';

import Link from 'next/link';
import LegalPage, { LegalSection } from '@/components/LegalPage';
import { LEGAL } from '@/lib/legal';

const sections: LegalSection[] = [
  {
    id: 'collect',
    title: 'Information we collect',
    body: (
      <>
        <p><strong>Information you give us</strong></p>
        <ul>
          <li><strong>Account:</strong> your email address and password. Passwords are stored only in hashed (scrambled) form; we never see the original.</li>
          <li><strong>Profile:</strong> your name, date of birth (we show your age, not your birthday), gender identity, sexual orientation, photos, bio, top 4 films, favourite genres, relationship goals, and optional basics such as zodiac sign, education, pets, drinking and smoking.</li>
          <li><strong>Preferences:</strong> who you&apos;re interested in, your preferred age range and distance.</li>
          <li><strong>Location:</strong> if you allow it, your device&apos;s approximate location (latitude and longitude) and the city you enter.</li>
          <li><strong>Messages:</strong> the messages you send to your matches.</li>
        </ul>
        <p><strong>Information created when you use the Service</strong></p>
        <ul>
          <li>Who you like and pass on, your matches, and whether messages have been read.</li>
          <li>Basic technical information needed to run the Service, such as your browser type and requests made to our servers.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'use',
    title: 'How we use it',
    body: (
      <ul>
        <li>To create and run your account and show your profile to other users.</li>
        <li>To suggest people on Discover, using your preferences and, if you allow it, your location.</li>
        <li>To create matches and deliver messages between you and your matches.</li>
        <li>To send in-app and browser notifications about new matches and messages, if you allow them.</li>
        <li>To keep the Service safe: checking that users are 18 or over, preventing abuse and enforcing our <Link href="/terms" className="underline underline-offset-2">Terms of Service</Link>.</li>
        <li>To fix problems and improve the Service.</li>
      </ul>
    ),
  },
  {
    id: 'see',
    title: 'What other users can see',
    body: (
      <>
        <p>People using {LEGAL.appName} can see your profile: your name, age, photos, bio, top films, genres, relationship goals, basics, and your city or approximate distance. They can&apos;t see your email address, password, exact location, exact date of birth, gender identity, sexual orientation or who you&apos;re interested in — those are used only for matching.</p>
        <p>Only you and your match can see the messages between you. On the Likes page, people who liked you are shown blurred until you like them back.</p>
      </>
    ),
  },
  {
    id: 'share',
    title: 'Who we share it with',
    body: (
      <>
        <p>We don&apos;t sell your personal information. We share it only with:</p>
        <ul>
          <li><strong>Supabase</strong>, which hosts our database and stores your photos.</li>
          <li><strong>The Movie Database (TMDB)</strong>: when you search for a film, your search text is sent from your browser to TMDB, and film posters are loaded from TMDB&apos;s servers.</li>
          <li><strong>Other services that load content in the app</strong>, such as Google Fonts for text styling. These may receive your IP address when your browser loads from them.</li>
          <li><strong>Authorities</strong>, if the law requires it or it&apos;s needed to protect someone&apos;s safety.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'device',
    title: 'Storage on your device',
    body: (
      <p>We store a few items in your browser so the app works: a login token so you stay signed in, your light or dark mode choice, and the profiles you&apos;ve already seen on Discover. Logging out removes the login token. We don&apos;t use advertising or tracking cookies.</p>
    ),
  },
  {
    id: 'keep',
    title: 'How long we keep it',
    body: (
      <p>We keep your information while your account exists. When your account is deleted, we delete your profile, photos, likes, matches and messages, except where the law requires us to keep something for longer.</p>
    ),
  },
  {
    id: 'choices',
    title: 'Your choices and rights',
    body: (
      <>
        <ul>
          <li><strong>Edit your profile</strong> at any time from your profile page.</li>
          <li><strong>Location and notifications</strong> are optional; you can turn them off in your browser or device settings.</li>
          <li><strong>Unmatch, block or report</strong> anyone. Blocking removes your match and messages, and you won&apos;t see each other again. Reports are reviewed by us, and the person isn&apos;t told who reported them.</li>
          <li><strong>Delete your account</strong> at any time in the app (Home → Edit profile → Delete account) or at <Link href="/delete-account" className="underline underline-offset-2">our account deletion page</Link>.</li>
          <li><strong>Get a copy of your data:</strong> email {LEGAL.contactEmail} from the address you signed up with.</li>
        </ul>
        <p>Depending on where you live, you may have other rights, such as to correct your data or to complain to your local data protection authority.</p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    body: (
      <p>We protect your information with measures such as hashed passwords, encrypted connections and access controls on our database. No online service is perfectly secure, so please use a strong password that you don&apos;t use anywhere else.</p>
    ),
  },
  {
    id: 'age',
    title: 'Age limit',
    body: (
      <p>{LEGAL.appName} is only for adults aged 18 and over. We don&apos;t knowingly collect information from anyone younger. If you believe someone under 18 has an account, tell us at {LEGAL.contactEmail} and we&apos;ll remove it.</p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>We may update this policy as {LEGAL.appName} changes. We&apos;ll update the effective date above, and for important changes we&apos;ll let you know in the app.</p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          This policy explains what information {LEGAL.appName} collects, how we use it, and the choices you have. We only collect what we
          need to help you find people who share your taste in film.
        </p>
      }
      sections={sections}
      other={{ href: '/terms', label: 'Terms of Service' }}
    />
  );
}
