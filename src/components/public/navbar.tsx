'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import { LogIn } from 'lucide-react';

export function PublicNavbar() {
  return (
    <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="size-8 text-primary" />
          <span className="text-xl font-black tracking-tighter">OikoApp</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild className="hidden sm:flex font-bold">
            <Link href="/public/enrollment">Cursos & GCs</Link>
          </Button>
          <Button asChild className="font-bold">
            <Link href="/login">
              <LogIn className="mr-2 size-4" />
              Entrar
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}