'use client';

import { StudentsManagement } from '@/components/teaching/students-management';
import { VolunteeringProvider } from '@/contexts/volunteering-context';

export default function StudentsPage() {
  return (
    <VolunteeringProvider>
      <StudentsManagement />
    </VolunteeringProvider>
  );
}
