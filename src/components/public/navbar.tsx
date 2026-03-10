
'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import { useFirebase } from '@/firebase';
import { LogIn, User } from 'lucide-react';

export function PublicNavbar() {
  const { user } = useFirebase();

  return (
    <nav className="h-20 border-b bg-background/95 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto h-full px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="size-8 text-primary" />
          <span className="text-xl font-black tracking-tighter">OikoApp</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-widest text-muted-foreground">
          <Link href="/public/enrollment" className="hover:text-primary transition-colors">Inscrições</Link>
          <Link href="/dashboard/teaching/theoflix" className="hover:text-primary transition-colors">TheoFlix</Link>
          <Link href="/dashboard/gc/map" className="hover:text-primary transition-colors">Células</Link>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <Button asChild variant="default">
              <Link href="/dashboard">
                <User className="mr-2 size-4" />
                Painel do Membro
              </Link>
            </Button>
          ) : (
            <Button asChild variant="ghost" className="font-bold">
              <Link href="/login">
                <LogIn className="mr-2 size-4" />
                Entrar
              </Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
