'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import { LogIn, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';

const navLinks = [
  { href: '/public/enrollment', label: 'Inscrições' },
];

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="size-8 text-primary" />
          <span className="text-xl font-black italic tracking-tighter uppercase">OikoApp</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link 
              key={link.href} 
              href={link.href} 
              className="text-sm font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Button asChild className="font-bold rounded-full px-6 bg-[#6A52A3] hover:bg-[#584289] text-white">
            <Link href="/login">
              <LogIn className="mr-2 size-4" />
              Portal do Membro
            </Link>
          </Button>
        </nav>

        {/* Mobile Nav */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu de navegação">
                <Menu className="size-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              {/* SheetTitle e SheetDescription são necessários por questões de acessibilidade no shadcn/ui mais recente */}
              <SheetTitle className="text-left mb-2">Navegação</SheetTitle>
              <SheetDescription className="text-left mb-8">
                Acesse as principais áreas do OikoApp.
              </SheetDescription>
              
              <div className="flex flex-col gap-6 mt-4">
                {navLinks.map((link) => (
                  <Link 
                    key={link.href} 
                    href={link.href} 
                    className="text-lg font-black uppercase italic tracking-tighter hover:text-[#6A52A3] transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                {/* Botão Mobile agora com rounded-full para seguir o padrão visual */}
                <Button asChild className="w-full font-bold rounded-full bg-[#6A52A3] hover:bg-[#584289] text-white">
                  <Link href="/login">Portal do Membro</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}