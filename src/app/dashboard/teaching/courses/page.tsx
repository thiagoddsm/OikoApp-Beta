'use client';

import { CoursesManagement } from '@/components/teaching/courses-management';
import { VolunteeringProvider } from '@/contexts/volunteering-context';

export default function CoursesPage() {
  return (
    <VolunteeringProvider>
      <CoursesManagement />
    </VolunteeringProvider>
  );
}
