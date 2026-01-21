'use client';

import { DisSchoolPage } from '@/components/teaching/dis/dis-page';
import { VolunteeringProvider } from '@/contexts/volunteering-context';

export default function DisPage() {
  return (
    <VolunteeringProvider>
      <DisSchoolPage />
    </VolunteeringProvider>
  );
}
