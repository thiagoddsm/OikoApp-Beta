import { redirect } from 'next/navigation';

export default function TeachingDashboardRedirectPage() {
  redirect('/dashboard/teaching/courses');
}
