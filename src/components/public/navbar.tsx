'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';

export function PublicNavbar() {
  return (
    <header className="h-20 border-b bg-white/80 backdrop-blur-md sticky top-0 z-50 px-6 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2 group">
        <Logo className="size-8 text-primary transition-transform group-hover:scale-110" />
        <span className="text-xl font-black tracking-tighter uppercase italic text-slate-900">OikoApp</span>
      </Link>
      
      <nav className="hidden md:flex items-center gap-8">
        <Link href="/" className="text-sm font-bold uppercase tracking-widest text-slate-600 hover:text-primary transition-colors">Home</Link>
        <Link href="/public/enrollment" className="text-sm font-bold uppercase tracking-widest text-slate-600 hover:text-primary transition-colors">Inscrições</Link>
      </nav>

      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild className="font-bold text-slate-600">
          <Link href="/login">Entrar</Link>
        </Button>
        <Button asChild className="font-bold shadow-lg shadow-primary/20">
          <Link href="/public/enrollment">Fazer parte</Link>
        </Button>
      </div>
    </header>
  );
}