
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// This page is deprecated and now redirects to the new location under courses.
export default function WaveRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new location within the courses page, activating the 'wave' tab
    router.replace('/dashboard/teaching/courses');
  }, [router]);

  return (
    <div className="flex h-96 w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="ml-4 text-muted-foreground">Redirecionando para a nova página da Wave...</p>
    </div>
  );
}
