'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';

export function PublicNavbar() {
  return (
    <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-8 w-8 text-primary" />
          <span className="font-bold text-xl tracking-tighter text-slate-900 uppercase italic">OikoApp</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/public/enrollment" className="text-sm font-bold hover:text-primary transition-colors text-slate-600 uppercase tracking-tight">Inscrições</Link>
          <Button asChild variant="default" size="sm" className="font-bold uppercase tracking-tight h-9">
            <Link href="/login">Portal do Membro</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
