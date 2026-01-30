'use client';

import { TeachersManagement } from '@/components/teaching/teachers-management';
import { VolunteeringProvider } from '@/contexts/volunteering-context';

export default function TeachersPage() {
  return (
    <VolunteeringProvider>
      <TeachersManagement />
    </VolunteeringProvider>
  );
}
