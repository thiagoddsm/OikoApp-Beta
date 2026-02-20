
'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { theoflixDB, type Course } from '@/lib/theoflix-data';
import { Play, Info, Plus, Lock, Search, Clock, CheckCircle2, PlayCircle, Star } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const levelConfig: Record<number, { title: string; color: string; shadow: string; bg: string }> = {
  1: {
    title: 'Fundamentos & Integração',
    color: 'bg-blue-600',
    bg: 'bg-blue-50',
    shadow: 'shadow-blue-500/30',
  },
  2: {
    title: 'Maturidade & Cura',
    color: 'bg-rose-600',
    bg: 'bg-rose-50',
    shadow: 'shadow-rose-500/30',
  },
  3: {
    title: 'Escola de Líderes',
    color: 'bg-amber-600',
    bg: 'bg-amber-50',
    shadow: 'shadow-amber-500/30',
  },
  4: {
    title: 'Alta Gestão & Supervisão',
    color: 'bg-purple-600',
    bg: 'bg-purple-50',
    shadow: 'shadow-purple-500/30',
  },
};

export default function TheoFlixPage() {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [searchQuery, setSearchTerm] = useState('');

  const featuredCourse = theoflixDB.find(c => c.id === 'membros') || theoflixDB[0];

  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return theoflixDB;
    const term = searchQuery.toLowerCase();
    return theoflixDB.filter(c => 
        c.title.toLowerCase().includes(term) || 
        c.desc.toLowerCase().includes(term) ||
        c.tags?.some(t => t.toLowerCase().includes(term))
    );
  }, [searchQuery]);

  const levels = [1, 2, 3, 4];

  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course);
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Header com Busca */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
                <PlayCircle className="text-primary size-8" />
                TheoFlix
            </h1>
            <p className="text-muted-foreground text-sm">O streaming oficial da trilha de crescimento IBM.</p>
        </div>
        <div className="relative w-full md:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
                placeholder="Buscar cursos, temas..." 
                className="pl-10 bg-background/50 border-muted-foreground/20 focus:ring-primary"
                value={searchQuery}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      {/* Hero Section (Featured) */}
      {!searchQuery && (
        <section className="relative h-[400px] md:h-[500px] rounded-[2rem] overflow-hidden group shadow-2xl animate-in fade-in duration-700">
            <Image 
                src={featuredCourse.image} 
                alt={featuredCourse.title} 
                fill 
                className="object-cover transition-transform duration-1000 group-hover:scale-105"
                priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full md:max-w-2xl space-y-4">
                <div className="flex items-center gap-2">
                    <Badge className="bg-primary text-white font-black animate-bounce">EM DESTAQUE</Badge>
                    <span className="text-white/80 text-xs font-bold flex items-center gap-1">
                        <Star className="size-3 fill-amber-400 text-yellow-400" />
                        Curso Recomendado para você
                    </span>
                </div>
                <h2 className="text-4xl md:text-6xl font-black text-white leading-tight drop-shadow-lg uppercase tracking-tighter italic">
                    {featuredCourse.title}
                </h2>
                <p className="text-slate-200 line-clamp-2 md:line-clamp-3 text-sm md:text-base leading-relaxed max-w-xl">
                    {featuredCourse.desc}
                </p>
                <div className="flex items-center gap-4 pt-4">
                    <Button size="lg" className="h-12 px-8 font-black text-base transition-all hover:scale-105 active:scale-95" onClick={() => handleCourseClick(featuredCourse)}>
                        <Play className="mr-2 size-5 fill-current" /> Começar Agora
                    </Button>
                    <Button variant="outline" size="lg" className="h-12 px-8 font-bold border-white/20 text-white bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all" onClick={() => handleCourseClick(featuredCourse)}>
                        <Info className="mr-2 size-5" /> Mais Informações
                    </Button>
                </div>
            </div>
        </section>
      )}

      {/* Listas de Cursos */}
      <div className="space-y-12">
        {levels.map((level) => {
            const coursesForLevel = filteredCourses.filter((c) => c.level === level);
            if (coursesForLevel.length === 0) return null;
            const config = levelConfig[level];
            
            return (
            <section key={level} className="animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={cn("w-1 h-8 rounded-full", config.color)}></div>
                        <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900">
                            {config.title}
                        </h2>
                    </div>
                    <Badge variant="outline" className="opacity-50">{coursesForLevel.length} títulos</Badge>
                </div>
                
                <Carousel opts={{ align: 'start', loop: false }} className="w-full">
                <CarouselContent className="-ml-4">
                    {coursesForLevel.map((course) => (
                    <CarouselItem key={course.id} className="basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5 pl-4">
                        <Card
                            className="overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-105 border-none shadow-md bg-card"
                            onClick={() => handleCourseClick(course)}
                        >
                        <CardContent className="p-0">
                            <div className="relative w-full aspect-video">
                                <Image
                                    src={course.image}
                                    alt={course.title}
                                    fill
                                    className="object-cover"
                                />
                                {/* Barra de Progresso Simulada */}
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                                    <div
                                        className={cn("h-full transition-all duration-1000", config.color)}
                                        style={{ width: `${Math.random() * 60 + 10}%` }}
                                    ></div>
                                </div>
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                    <PlayCircle className="text-white size-12 drop-shadow-2xl" />
                                </div>
                            </div>
                            <div className="p-4 space-y-2">
                                <h3 className="text-sm font-black text-slate-900 truncate uppercase tracking-tighter">
                                    {course.title}
                                </h3>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                        {course.episodes.length} Aulas • {course.duration || '2h'}
                                    </span>
                                    <Badge variant="secondary" className="text-[9px] h-4 py-0 font-bold uppercase">
                                        {course.type}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                        </Card>
                    </CarouselItem>
                    ))}
                </CarouselContent>
                <div className="hidden md:block">
                    <CarouselPrevious className="absolute -left-12 top-1/2 -translate-y-1/2 border-none bg-background/80 backdrop-blur-md shadow-xl hover:bg-primary hover:text-white" />
                    <CarouselNext className="absolute -right-12 top-1/2 -translate-y-1/2 border-none bg-background/80 backdrop-blur-md shadow-xl hover:bg-primary hover:text-white" />
                </div>
                </Carousel>
            </section>
            );
        })}
      </div>

      {/* Course Detail Dialog */}
      <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
          {selectedCourse && (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>{selectedCourse.title}</DialogTitle>
                <DialogDescription>{selectedCourse.desc}</DialogDescription>
              </DialogHeader>

              <div className="relative h-[300px] md:h-[400px]">
                <Image
                  src={selectedCourse.image}
                  alt={selectedCourse.title}
                  fill
                  className="object-cover"
                />
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>
                 <div className="absolute bottom-8 left-8 right-8 z-10 space-y-4">
                    <div className="flex items-center gap-2">
                        <Badge className={cn("text-white shadow-lg border-none font-black", levelConfig[selectedCourse.level].color)}>
                            NÍVEL {selectedCourse.level} • {levelConfig[selectedCourse.level].title}
                        </Badge>
                        <span className="text-white/80 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                            <Clock size={12} /> {selectedCourse.duration || '4h 30min'}
                        </span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-white drop-shadow-2xl uppercase italic tracking-tighter">
                        {selectedCourse.title}
                    </h2>
                     <div className="flex items-center gap-4 pt-2">
                        <Button className="h-12 px-10 font-black text-base shadow-xl" onClick={() => setSelectedCourse(null)}>
                            <Play className="mr-2 size-5 fill-current"/> Retomar Trilha
                        </Button>
                        <Button variant="outline" size="icon" className="h-12 w-12 rounded-full bg-white/10 border-white/20 text-white backdrop-blur-md hover:bg-white/30 transition-all">
                            <Plus className="size-6"/>
                        </Button>
                    </div>
                 </div>
              </div>

              <div className="bg-slate-950 text-slate-100 p-8 grid grid-cols-1 md:grid-cols-3 gap-12 max-h-[50vh] overflow-y-auto no-scrollbar">
                <div className="md:col-span-2 space-y-8">
                    <div>
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Info className="size-5 text-primary" /> Sinopse
                        </h3>
                        <p className="text-base leading-relaxed text-slate-400 font-medium">
                            {selectedCourse.desc}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <PlayCircle className="size-5 text-primary" /> Episódios / Aulas
                        </h3>
                        <div className="space-y-3">
                            {selectedCourse.episodes.map((ep, idx) => {
                                const isMemberCourse = selectedCourse.id === 'membros';
                                const isEpisode5 = idx === 4;
                                const isLocked = isMemberCourse && isEpisode5;

                                return (
                                    <div key={idx} className={cn(
                                        "flex items-center justify-between p-4 rounded-xl transition-all border group",
                                        isLocked 
                                            ? "bg-slate-900/50 border-slate-800 opacity-50 grayscale cursor-not-allowed" 
                                            : "bg-slate-900 border-slate-800 hover:border-primary/50 hover:bg-slate-800/50 cursor-pointer"
                                    )}>
                                        <div className="flex items-center gap-5">
                                            <span className="text-slate-600 font-black text-lg w-6 text-center">{idx + 1}</span>
                                            <div className="flex flex-col">
                                                <h4 className={cn("font-bold text-sm md:text-base transition-colors", !isLocked && "group-hover:text-primary")}>
                                                    {ep}
                                                </h4>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                                                        45 MINUTOS • VÍDEO + PDF
                                                    </span>
                                                    {isLocked && (
                                                        <span className="text-[10px] text-rose-500 font-black uppercase flex items-center gap-1">
                                                            <Lock size={10}/> Requisito Pendente
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {isLocked ? (
                                                <Lock className="size-5 text-slate-700" />
                                            ) : (
                                                <CheckCircle2 className="size-5 text-emerald-500/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Sobre este título</h4>
                        <div className="space-y-4 text-sm font-medium">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Nível</span>
                                <span className="text-slate-200">{selectedCourse.level} - {levelConfig[selectedCourse.level].title}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Categoria</span>
                                <span className="text-slate-200">{selectedCourse.type}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Duração Total</span>
                                <span className="text-slate-200">{selectedCourse.duration || '4h'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Palavras-chave</h4>
                        <div className="flex flex-wrap gap-2">
                            {selectedCourse.tags?.map(tag => (
                                <Badge key={tag} variant="outline" className="bg-slate-900 border-slate-800 text-slate-400 font-bold hover:text-primary hover:border-primary transition-colors cursor-default">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {selectedCourse.id === 'membros' && (
                        <Alert className="bg-blue-950 border-blue-900 text-blue-200">
                            <Info className="h-4 w-4" />
                            <AlertTitle className="font-bold">Aviso de Presença</AlertTitle>
                            <AlertDescription className="text-xs opacity-80 leading-relaxed">
                                As aulas dominicais presenciais são obrigatórias. Este portal serve para consulta de material e revisão de conteúdo.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
