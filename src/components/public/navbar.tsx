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
} from "@/components/ui/sheet";

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="size-8 text-primary" />
          <span className="text-xl font-bold tracking-tighter text-slate-900">OikoApp</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">Início</Link>
          <Link href="/public/enrollment" className="text-sm font-medium hover:text-primary transition-colors">Inscrições</Link>
          <Button asChild variant="ghost" size="sm" className="font-bold">
            <Link href="/login">
              <LogIn className="mr-2 size-4" />
              Portal do Membro
            </Link>
          </Button>
          <Button asChild size="sm" className="font-bold">
            <Link href="/public/enrollment">Fazer parte de um GC</Link>
          </Button>
        </nav>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="size-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="flex flex-col gap-4 mt-8">
                <Link href="/" className="text-lg font-bold">Início</Link>
                <Link href="/public/enrollment" className="text-lg font-bold">Inscrições</Link>
                <Separator />
                <Link href="/login" className="text-lg font-bold">Entrar no Portal</Link>
                <Button asChild className="w-full font-bold mt-4">
                  <Link href="/public/enrollment">Fazer parte de um GC</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function Separator() {
    return <div className="h-px w-full bg-border" />;
}
