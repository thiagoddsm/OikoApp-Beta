
'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function GCRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/gc/structure');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-full w-full">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="ml-4 text-muted-foreground">Redirecionando...</p>
    </div>
  );
}
