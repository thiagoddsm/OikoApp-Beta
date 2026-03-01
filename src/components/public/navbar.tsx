'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/icons";

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="size-8 text-primary" />
          <span className="text-xl font-bold tracking-tighter">OikoApp</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6">
          <Link 
            href="/public/enrollment" 
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            Inscrições
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild className="hidden sm:inline-flex text-sm font-bold">
            <Link href="/login">Portal do Membro</Link>
          </Button>
          <Button asChild className="font-bold">
            <Link href="/public/enrollment">Fazer Parte</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
