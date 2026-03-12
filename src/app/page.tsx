'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  HeartHandshake, 
  GraduationCap, 
  ArrowRight, 
  Music, 
  LogIn
} from 'lucide-react';
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';

export default function LandingPage() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'login-background');

  const pilares = [
    { 
      icon: HeartHandshake, 
      title: "Comunhão (GCs)", 
      desc: "Nossas células são o coração da igreja. Pequenos grupos que se reúnem nas casas para cuidado mútuo e amizade.",
      link: "/dashboard/gc/map",
      linkText: "Ver Mapa de GCs",
      color: "text-rose-500",
      bg: "bg-rose-50"
    },
    { 
      icon: GraduationCap, 
      title: "Ensino (Teologia)", 
      desc: "Do curso de membros à Escola de Líderes. Uma trilha de discipulado profunda para o seu crescimento.",
      link: "/dashboard/teaching/theoflix",
      linkText: "Conhecer TheoFlix",
      color: "text-indigo-500",
      bg: "bg-indigo-50"
    },
    { 
      icon: Music, 
      title: "Adoração & Artes", 
      desc: "O ministério Wave e nossas celebrações dominicais focadas em uma adoração que toca o coração de Deus.",
      link: "/dashboard/teaching/wave",
      linkText: "Conhecer Escola Wave",
      color: "text-amber-500",
      bg: "bg-amber-50"
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PublicNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 overflow-hidden bg-slate-900 text-white">
          <div className="absolute inset-0 opacity-30">
            {heroImage && (
              <Image 
                src={heroImage.imageUrl} 
                alt="Church Community" 
                fill 
                className="object-cover"
                priority
              />
            )}
          </div>
          <div className="container relative z-10 mx-auto px-4 text-center">
            <Badge variant="secondary" className="mb-6 bg-primary/20 text-white border-primary/30 py-1 px-4 text-sm font-bold uppercase tracking-widest">
              Igreja Batista da Manhã
            </Badge>
            <h1 className="text-4xl md:text-7xl font-black mb-6 leading-tight tracking-tighter">
              Uma igreja feita de pessoas,<br /> <span className="text-accent">cuidando de pessoas.</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed">
              Onde a organização serve ao organismo. Somos uma família que vive o evangelho de forma prática, relevante e inclusiva.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="h-14 px-8 text-lg font-bold" asChild>
                <Link href="/public/enrollment">Fazer parte de um GC</Link>
              </Button>
              <Button size="lg" className="h-14 px-8 text-lg font-bold bg-white text-slate-900 border-white hover:bg-white/90 transition-colors" asChild>
                <Link href="/login">
                  <LogIn className="mr-2 size-5" />
                  Portal do Membro
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Nossos Pilares */}
        <section className="py-20 bg-slate-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black mb-4">Nossos Pilares</h2>
              <div className="h-1.5 w-24 bg-primary mx-auto rounded-full"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {pilares.map((pilar, i) => (
                <Card key={i} className="border-none shadow-xl hover:translate-y-[-10px] transition-all duration-300 overflow-hidden group">
                  <CardContent className="p-8">
                    <div className={cn(
                        "size-16 rounded-2xl flex items-center justify-center mb-6 transition-all group-hover:scale-110 group-hover:rotate-3",
                        pilar.bg, pilar.color
                    )}>
                      <pilar.icon size={32} strokeWidth={1.5} />
                    </div>
                    <h3 className="text-2xl font-bold mb-4">{pilar.title}</h3>
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      {pilar.desc}
                    </p>
                    <Button variant="link" className="p-0 text-primary font-bold text-base" asChild>
                      <Link href={pilar.link} className="flex items-center">
                        {pilar.linkText} <ArrowRight className="ml-2 size-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
