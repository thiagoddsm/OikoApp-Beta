'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { LogIn } from 'lucide-react';

export function PublicNavbar() {
  return (
    <nav className="h-16 border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <Logo className="size-8 text-primary group-hover:scale-110 transition-transform" />
          <span className="text-xl font-black tracking-tighter">OikoApp</span>
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/public/enrollment" className="text-sm font-bold text-slate-600 hover:text-primary transition-colors">
            Inscrições
          </Link>
          <Button size="sm" className="font-bold rounded-full px-6" asChild>
            <Link href="/login">
              <LogIn className="mr-2 size-4" />
              Portal do Membro
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
