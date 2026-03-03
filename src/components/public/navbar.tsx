'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';

export function PublicNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full transition-all duration-300",
      isScrolled ? "bg-background/95 backdrop-blur-md border-b shadow-sm" : "bg-transparent"
    )}>
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="size-8 text-primary" />
          <span className="text-xl font-black italic tracking-tighter uppercase text-primary">OikoApp</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/public/enrollment" className="text-sm font-bold uppercase tracking-widest hover:text-primary transition-colors text-foreground">
            Cursos & Trilhos
          </Link>
          <Button asChild className="font-bold rounded-full px-6">
            <Link href="/login">Acessar Portal</Link>
          </Button>
        </nav>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden p-2 text-muted-foreground"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-background border-b p-4 space-y-4 animate-in slide-in-from-top-2">
          <Link 
            href="/public/enrollment" 
            className="block text-sm font-bold uppercase tracking-widest p-2 hover:bg-muted rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Cursos & Trilhos
          </Link>
          <Button asChild className="w-full font-bold rounded-full h-12">
            <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>Acessar Portal</Link>
          </Button>
        </div>
      )}
    </header>
  );
}
