
'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import { LogIn, Menu } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="size-8 text-primary" />
          <span className="text-xl font-black tracking-tighter">IBM</span>
        </Link>

        {/* Desktop Menu */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">INÍCIO</Link>
          <Link href="/public/enrollment" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">CURSOS & GCs</Link>
          <Link href="/leader/new-member" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">SOU LÍDER</Link>
          <Button asChild className="font-bold rounded-full px-6">
            <Link href="/login">
              <LogIn className="mr-2 size-4" />
              Portal do Membro
            </Link>
          </Button>
        </nav>

        {/* Mobile Menu */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="size-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetTitle>Menu</SheetTitle>
              <nav className="flex flex-col gap-6 mt-8">
                <Link href="/" className="text-lg font-bold">INÍCIO</Link>
                <Link href="/public/enrollment" className="text-lg font-bold">CURSOS & GCs</Link>
                <Link href="/leader/new-member" className="text-lg font-bold">SOU LÍDER</Link>
                <Button asChild className="font-bold w-full">
                  <Link href="/login">Entrar no Portal</Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
