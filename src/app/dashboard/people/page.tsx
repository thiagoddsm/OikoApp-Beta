
'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function PeopleRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the "Integração" (Journey) page by default
    router.replace('/dashboard/people/journey');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-full w-full">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="ml-4 text-muted-foreground">Carregando...</p>
    </div>
  );
}
