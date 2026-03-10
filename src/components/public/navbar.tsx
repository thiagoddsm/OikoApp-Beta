'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/icons';
import { Button } from '@/components/ui/button';

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="size-8 text-primary" />
          <span className="text-xl font-bold tracking-tighter">OikoApp</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">Início</Link>
          <Link href="/dashboard/gc/map" className="text-sm font-medium hover:text-primary transition-colors">GCs</Link>
          <Link href="/dashboard/teaching/theoflix" className="text-sm font-medium hover:text-primary transition-colors">Escolas</Link>
          <Link href="/dashboard/social" className="text-sm font-medium hover:text-primary transition-colors">Impacto Social</Link>
        </nav>

        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild>
            <Link href="/public/enrollment">Fazer Parte</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
