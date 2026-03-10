'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/icons";
import { LogIn, Menu } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle
} from "@/components/ui/sheet";

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="size-8 text-primary" />
          <span className="text-xl font-bold tracking-tighter">OikoApp</span>
        </Link>

        {/* Desktop Menu */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/public/enrollment" className="text-sm font-bold uppercase tracking-widest hover:text-primary transition-colors text-foreground">
            Inscrições
          </Link>
          <Link href="/dashboard/gc/map" className="text-sm font-bold uppercase tracking-widest hover:text-primary transition-colors text-foreground">
            Mapa de GCs
          </Link>
          <Link href="/dashboard/social" className="text-sm font-bold uppercase tracking-widest hover:text-primary transition-colors text-foreground">
            Ação Social
          </Link>
          <Button asChild variant="ghost" className="font-bold">
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
              <div className="flex flex-col gap-4 mt-8">
                <Link href="/public/enrollment" className="text-lg font-bold">Inscrições</Link>
                <Link href="/dashboard/gc/map" className="text-lg font-bold">Mapa de GCs</Link>
                <Link href="/dashboard/social" className="text-lg font-bold">Ação Social</Link>
                <hr />
                <Link href="/login" className="flex items-center gap-2 text-lg font-bold text-primary">
                  <LogIn className="size-5" /> Portal do Membro
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
