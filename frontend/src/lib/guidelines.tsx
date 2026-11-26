import type { LegalSection } from '@/components/LegalPage';
import { LEGAL } from '@/lib/legal';

// Shared by the /guidelines page and the guidelines modal shown during sign-up.
// Keep in line with the "How to behave" and "Reporting and removal" sections of the Terms.

export const guidelinesIntro = (
  <p>
    {LEGAL.appName} is a place to meet people over a shared love of film. These guidelines keep it safe, kind and
    welcoming for everyone. They apply to your profile, your photos and every message you send. Breaking them can
    get your account suspended or removed.
  </p>
);

export const guidelineSections: LegalSection[] = [
  {
    id: 'be-yourself',
    title: 'Be yourself',
    body: (
      <ul>
        <li>Use recent photos of you, and only you, as the main picture.</li>
        <li>Your name, age and details should be true. Don&apos;t pretend to be someone else, real or made up.</li>
        <li>One account per person, and it must be your own.</li>
      </ul>
    ),
  },
  {
    id: 'adults-only',
    title: 'Adults only',
    body: (
      <p>
        You must be at least 18 to use {LEGAL.appName}. Don&apos;t post photos of children on their own, and never share
        anything that sexualises a minor. We remove those accounts and may report them to the authorities.
      </p>
    ),
  },
  {
    id: 'be-kind',
    title: 'Be kind and respectful',
    body: (
      <>
        <p>
          Treat everyone the way you&apos;d want to be treated, whatever their race, religion, nationality, ethnicity,
          skin colour, ability, size, sex, gender identity or sexual orientation.
        </p>
        <ul>
          <li>No harassment, threats, bullying, stalking or hate speech.</li>
          <li>Respect a &ldquo;no&rdquo;. If someone stops replying or unmatches, let it go.</li>
          <li>Disagree about films all you like, but keep it about the films, not the person.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'keep-it-appropriate',
    title: 'Keep it appropriate',
    body: (
      <ul>
        <li>No nudity, sexually explicit or violent content in your photos, bio or messages.</li>
        <li>Never send sexual messages or images someone hasn&apos;t clearly asked for.</li>
        <li>No graphic, gory or shocking content, even if it&apos;s from a film.</li>
      </ul>
    ),
  },
  {
    id: 'no-scams',
    title: 'No scams, selling or spam',
    body: (
      <ul>
        <li>Never ask anyone for money, gifts, crypto or bank details, for any reason.</li>
        <li>Don&apos;t advertise, promote, sell or recruit for anything.</li>
        <li>No bots, fake accounts, mass messages or links to suspicious sites.</li>
      </ul>
    ),
  },
  {
    id: 'privacy',
    title: 'Protect your privacy and others’',
    body: (
      <ul>
        <li>
          Take your time before sharing your phone number, address, workplace or social media. Never share passwords
          or financial details.
        </li>
        <li>Don&apos;t share someone else&apos;s private information, photos or messages without their permission.</li>
      </ul>
    ),
  },
  {
    id: 'meeting-up',
    title: 'Meeting in person',
    body: (
      <ul>
        <li>Meet somewhere public for the first few dates. A busy café or a cinema works well.</li>
        <li>Tell a friend where you&apos;re going and who you&apos;re meeting.</li>
        <li>Arrange your own way there and back, and keep your phone charged.</li>
        <li>Trust your instincts. You can leave at any time, for any reason.</li>
      </ul>
    ),
  },
  {
    id: 'reporting',
    title: 'Reporting a problem',
    body: (
      <>
        <p>
          If someone breaks these guidelines or makes you feel unsafe, tell us at{' '}
          <a href={`mailto:${LEGAL.contactEmail}`} className="font-semibold underline underline-offset-2">
            {LEGAL.contactEmail}
          </a>
          . Include their name and what happened. Screenshots help.
        </p>
        <p>
          <strong>If you are in danger, contact your local emergency services first.</strong>
        </p>
        <p>
          We review every report. Depending on what happened, we may warn, suspend or permanently remove an account.
        </p>
      </>
    ),
  },
];
