
'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/icons';
import { Button } from '@/components/ui/button';

export function PublicNavbar() {
  return (
    <nav className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="size-8 text-primary" />
          <span className="text-xl font-bold tracking-tighter">OikoApp</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8">
          <Link 
            href="/public/enrollment" 
            className="text-sm font-bold uppercase tracking-widest hover:text-primary transition-colors text-foreground"
          >
            Inscrições
          </Link>
          <Link href="/login">
            <Button variant="ghost" size="sm" className="font-bold">Portal do Membro</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
