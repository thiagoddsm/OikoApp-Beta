
'use client';

import { WaveMusicSchoolPage } from '@/components/teaching/wave/wave-page';
import { VolunteeringProvider } from '@/contexts/volunteering-context';

export default function WavePage() {
  return (
    <VolunteeringProvider>
      <WaveMusicSchoolPage />
    </VolunteeringProvider>
  );
}
