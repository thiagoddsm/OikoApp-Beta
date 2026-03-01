'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from "@/components/icons";
import { Button } from "@/components/ui/button";

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="size-8 text-primary" />
          <span className="text-xl font-bold tracking-tighter">OikoApp</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/public/enrollment" className="text-sm font-medium hover:text-primary transition-colors">
            Inscrições
          </Link>
          <Button asChild size="sm">
            <Link href="/login">Portal do Membro</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
