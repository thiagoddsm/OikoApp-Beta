
'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import { LogIn, Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function PublicNavbar() {
  const pathname = usePathname();
  const isTransparent = pathname === '/';

  return (
    <nav className={cn(
      "h-20 w-full flex items-center z-50 transition-all duration-300",
      isTransparent ? "absolute top-0 bg-transparent text-white" : "bg-white border-b shadow-sm sticky top-0"
    )}>
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 group">
          <Logo className={cn("size-10 transition-transform group-hover:scale-110", isTransparent ? "text-white" : "text-primary")} />
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tighter leading-none">IBM</span>
            <span className={cn("text-[9px] font-bold uppercase tracking-[0.2em]", isTransparent ? "text-white/70" : "text-muted-foreground")}>Igreja Batista da Manhã</span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-widest">
          <Link href="/" className="hover:text-accent transition-colors">Início</Link>
          <Link href="/public/enrollment" className="hover:text-accent transition-colors">Cursos</Link>
          <Link href="/dashboard/gc/map" className="hover:text-accent transition-colors">Células</Link>
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" asChild className={cn("font-bold", isTransparent ? "bg-white text-slate-900 hover:bg-white/90" : "")}>
            <Link href="/login">
              <LogIn className="mr-2 size-4" />
              Portal do Membro
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu />
          </Button>
        </div>
      </div>
    </nav>
  );
}
