
'use client';

import React, { Suspense } from 'react';
import { VolunteeringProvider } from '@/contexts/volunteering-context';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { EnrollmentPortalContent } from '@/components/public/enrollment-portal-content';
import { Loader2 } from 'lucide-react';

/**
 * Página pública de inscrições para cursos e GCs.
 * Envolvida em Suspense para evitar erros de build com useSearchParams.
 */
export default function PublicEnrollmentPage() {
  return (
    <VolunteeringProvider>
      <div className="flex flex-col min-h-screen bg-background">
        <PublicNavbar />
        <main className="flex-1">
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center h-96 gap-4">
              <Loader2 className="animate-spin size-8 text-primary" />
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Carregando Trilhas...</p>
            </div>
          }>
            <EnrollmentPortalContent />
          </Suspense>
        </main>
        <PublicFooter />
      </div>
    </VolunteeringProvider>
  );
}
