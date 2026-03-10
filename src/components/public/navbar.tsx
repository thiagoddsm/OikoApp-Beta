'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/icons";
import { LogIn, UserPlus } from 'lucide-react';

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="size-8 text-primary" />
          <span className="text-xl font-black tracking-tighter text-slate-900">IBM</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" asChild className="font-bold text-slate-600 hover:text-primary hover:bg-primary/5 uppercase text-xs tracking-widest">
            <Link href="/public/enrollment">
              <UserPlus className="mr-2 size-4" />
              Inscrições
            </Link>
          </Button>
          
          <Button className="font-bold rounded-full px-6 shadow-md transition-all hover:scale-105 active:scale-95" asChild>
            <Link href="/login">
              <LogIn className="mr-2 size-4" />
              Portal do Membro
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
