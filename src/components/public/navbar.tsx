'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';

export function PublicNavbar() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="size-8 text-primary" />
          <span className="text-xl font-bold tracking-tighter">OikoApp</span>
        </Link>
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild className="font-bold">
            <Link href="/public/enrollment">Inscrições</Link>
          </Button>
          <Button asChild className="font-bold">
            <Link href="/login">Portal do Membro</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
