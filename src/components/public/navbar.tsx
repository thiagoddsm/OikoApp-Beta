
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
    SheetDescription
} from '@/components/ui/sheet';

const navItems = [
    { href: "/public/enrollment", label: "Cursos e GCs" },
    { href: "/dashboard/gc/map", label: "Localizar Célula" },
    { href: "/dashboard/teaching/theoflix", label: "TheoFlix" },
];

export function PublicNavbar() {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <Logo className="size-8 text-primary" />
                    <span className="text-xl font-bold tracking-tighter text-slate-900 uppercase italic">OikoApp</span>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-8">
                    {navItems.map(item => (
                        <Link 
                            key={item.href} 
                            href={item.href} 
                            className="text-sm font-bold text-slate-600 hover:text-primary transition-colors uppercase tracking-widest"
                        >
                            {item.label}
                        </Link>
                    ))}
                    <Button asChild size="sm" className="rounded-full px-6 font-black uppercase italic tracking-tighter">
                        <Link href="/login">
                            <LogIn className="mr-2 size-4" /> Portal do Membro
                        </Link>
                    </Button>
                </nav>

                {/* Mobile Nav */}
                <div className="md:hidden flex items-center gap-4">
                    <Button asChild size="sm" className="rounded-full h-8 px-4 font-black text-[10px] uppercase italic">
                        <Link href="/login">Entrar</Link>
                    </Button>
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon"><Menu /></Button>
                        </SheetTrigger>
                        <SheetContent side="right">
                            <SheetTitle className="text-left font-black uppercase italic tracking-tighter">Menu OikoApp</SheetTitle>
                            <SheetDescription className="sr-only">Navegação pública do site da IBM</SheetDescription>
                            <div className="flex flex-col gap-6 mt-10">
                                {navItems.map(item => (
                                    <Link 
                                        key={item.href} 
                                        href={item.href} 
                                        className="text-lg font-black text-slate-900 uppercase italic tracking-tighter"
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                                <hr />
                                <Button asChild className="w-full font-black uppercase italic h-12">
                                    <Link href="/login">Acessar Portal do Membro</Link>
                                </Button>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
}
