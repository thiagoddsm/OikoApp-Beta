'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function RedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    const destination = query ? `/public/gc-report?${query}` : '/public/gc-report';
    router.replace(destination);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <Loader2 className="size-8 text-primary animate-spin" />
        <p className="text-sm font-medium">Carregando relatório do GC...</p>
      </div>
    </div>
  );
}

export default function GcRelatorioRedirectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="size-8 text-primary animate-spin" />
      </div>
    }>
      <RedirectContent />
    </Suspense>
  );
}
