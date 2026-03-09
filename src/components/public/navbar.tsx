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
        
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/public/enrollment" className="text-sm font-bold uppercase tracking-widest hover:text-primary transition-colors text-foreground">
            Inscrições
          </Link>
          <Link href="/dashboard/gc/map" className="text-sm font-bold uppercase tracking-widest hover:text-primary transition-colors text-foreground">
            Encontre um GC
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm" className="font-bold">
            <Link href="/login">Portal do Membro</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
