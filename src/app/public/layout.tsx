
import React from 'react';
import { FirebaseClientProvider } from '@/firebase';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FirebaseClientProvider>
      <main className="min-h-screen bg-muted/40">
        {children}
      </main>
    </FirebaseClientProvider>
  );
}
