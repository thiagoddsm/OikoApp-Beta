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
  Users, 
  MapPin, 
  ArrowRight, 
  Music, 
  Church, 
  HandHelping,
  LogIn
} from 'lucide-react';
import { Logo } from "@/components/icons";
import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function LandingPage() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'login-background');

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
              {[
                { 
                  icon: HeartHandshake, 
                  title: "Comunhão (GCs)", 
                  desc: "Nossas células são o coração da igreja. Pequenos grupos que se reúnem nas casas para cuidado mútuo e amizade.",
                  link: "/dashboard/gc/map",
                  linkText: "Ver Mapa de GCs"
                },
                { 
                  icon: GraduationCap, 
                  title: "Ensino (Teologia)", 
                  desc: "Do curso de membros à Escola de Líderes. Uma trilha de discipulado profunda para o seu crescimento.",
                  link: "/dashboard/teaching/theoflix",
                  linkText: "Conhecer TheoFlix"
                },
                { 
                  icon: Music, 
                  title: "Adoração & Artes", 
                  desc: "O ministério Wave e nossas celebrações dominicais focadas em uma adoração que toca o coração de Deus.",
                  link: "/dashboard/teaching/wave",
                  linkText: "Conhecer Escola Wave"
                },
              ].map((pilar, i) => (
                <Card key={i} className="border-none shadow-xl hover:translate-y-[-10px] transition-transform duration-300 overflow-hidden group">
                  <CardContent className="p-8">
                    <div className="size-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                      <pilar.icon size={32} />
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

        {/* Escolas e Projetos */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <Badge variant="outline" className="text-primary font-bold uppercase tracking-widest">Inclusão e Impacto</Badge>
                <h2 className="text-4xl md:text-6xl font-black leading-tight">Projetos que <br /> <span className="text-primary">transformam a cidade.</span></h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Não somos apenas uma igreja dentro de quatro paredes. Atuamos ativamente na educação musical com a <strong>Wave</strong>, na inclusão com a <strong>Escola DIS</strong> e no suporte social às famílias de São Gonçalo.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg"><HandHelping /></div>
                    <div>
                      <h4 className="font-bold">Ação Social</h4>
                      <p className="text-sm text-muted-foreground">Suporte a famílias em vulnerabilidade.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-100 text-blue-700 rounded-lg"><GraduationCap /></div>
                    <div>
                      <h4 className="font-bold">Escola DIS</h4>
                      <p className="text-sm text-muted-foreground">Inclusão para pessoas com deficiência.</p>
                    </div>
                  </div>
                </div>
                <Button size="lg" className="rounded-full px-8" asChild>
                  <Link href="/dashboard/social">Saiba mais sobre nosso impacto</Link>
                </Button>
              </div>
              <div className="relative aspect-square md:aspect-video lg:aspect-square bg-slate-200 rounded-[2rem] overflow-hidden shadow-2xl">
                 <Image 
                    src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyfHxtdXNpYyUyMGNodXJjaHxlbnwwfHx8fDE3NjMyNTMyNDZ8MA&ixlib=rb-4.1.0&q=80&w=1080" 
                    alt="Ministério" 
                    fill 
                    className="object-cover"
                    data-ai-hint="music church"
                 />
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center space-y-8">
            <h2 className="text-3xl md:text-5xl font-black">Já é um membro da IBM?</h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">
              Acesse sua jornada de discipulado, gerencie suas escalas de serviço e acompanhe o crescimento do seu GC no nosso Portal.
            </p>
            <Button size="lg" variant="secondary" className="h-14 px-10 text-lg font-bold shadow-lg" asChild>
              <Link href="/login">Entrar no Portal do Membro</Link>
            </Button>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
