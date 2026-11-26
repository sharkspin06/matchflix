'use client';

import LegalPage from '@/components/LegalPage';
import { guidelineSections, guidelinesIntro } from '@/lib/guidelines';

export default function GuidelinesPage() {
  return (
    <LegalPage
      title="Community guidelines"
      intro={guidelinesIntro}
      sections={guidelineSections}
      other={{ href: '/terms', label: 'Terms' }}
    />
  );
}
