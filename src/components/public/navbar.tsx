
'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function PublicNavbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Início' },
    { href: '/public/enrollment', label: 'Inscrições' },
    { href: '/dashboard/gc/map', label: 'Mapa de GCs' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="size-8 text-primary" />
          <span className="text-xl font-bold tracking-tighter">OikoApp</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                pathname === link.href ? "text-primary" : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
            <Link href="/login">Portal do Membro</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/public/enrollment">Quero participar</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
