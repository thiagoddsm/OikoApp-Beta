'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/icons';
import { Button } from '@/components/ui/button';

export function PublicNavbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="size-8 text-primary" />
          <span className="text-xl font-bold tracking-tighter">OikoApp</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8">
          <Link href="/dashboard/gc/map" className="text-sm font-bold uppercase tracking-widest hover:text-primary transition-colors">
            Células (GCs)
          </Link>
          <Link href="/public/enrollment" className="text-sm font-bold uppercase tracking-widest hover:text-primary transition-colors text-foreground">
            Inscrições
          </Link>
          <Link href="/dashboard/teaching/theoflix" className="text-sm font-bold uppercase tracking-widest hover:text-primary transition-colors">
            TheoFlix
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild>
            <Link href="/public/enrollment">Fazer Parte</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
