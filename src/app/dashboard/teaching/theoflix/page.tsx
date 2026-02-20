
'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
import { theoflixDB, type Course, type Episode } from '@/lib/theoflix-data';
import { Play, Info, Plus, Lock, Search, Clock, CheckCircle2, PlayCircle, Star, Heart, X, Volume2, Maximize2, Loader2 } from 'lucide-react';
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
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [searchQuery, setSearchTerm] = useState('');
  const [myList, setMyList] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theoflix_mylist');
    if (saved) setMyList(JSON.parse(saved));
  }, []);

  const toggleMyList = (id: string) => {
    setMyList(prev => {
      const newList = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      localStorage.setItem('theoflix_mylist', JSON.stringify(newList));
      return newList;
    });
  };

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

  const myListCourses = useMemo(() => {
    return theoflixDB.filter(c => myList.includes(c.id));
  }, [myList]);

  const levels = [1, 2, 3, 4];

  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course);
    setCurrentEpisode(course.episodes[0]); // Começa pelo primeiro episódio
  };

  const handlePlayEpisode = (episode: Episode) => {
    setCurrentEpisode(episode);
    setIsPlaying(true);
  };

  return (
    <div className="space-y-10 pb-20 overflow-x-hidden">
      {/* Header com Busca */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2 text-primary">
                <PlayCircle className="size-8" />
                TheoFlix
            </h1>
            <p className="text-muted-foreground text-sm">O streaming oficial da trilha de crescimento IBM.</p>
        </div>
        <div className="relative w-full md:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
                placeholder="Buscar cursos, temas..." 
                className="pl-10 bg-background/50 border-muted-foreground/20 focus:ring-primary rounded-full"
                value={searchQuery}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      {/* Hero Section (Featured) */}
      {!searchQuery && (
        <section className="relative h-[450px] md:h-[550px] rounded-[2.5rem] overflow-hidden group shadow-2xl animate-in fade-in zoom-in-95 duration-1000">
            <Image 
                src={featuredCourse.image} 
                alt={featuredCourse.title} 
                fill 
                className="object-cover transition-transform duration-[2000ms] group-hover:scale-110"
                priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 to-transparent" />
            
            <div className="absolute bottom-0 left-0 p-8 md:p-16 w-full md:max-w-3xl space-y-6">
                <div className="flex items-center gap-3">
                    <Badge className="bg-primary text-white font-black px-4 py-1 text-xs animate-pulse tracking-widest">EM DESTAQUE</Badge>
                    <div className="flex items-center gap-1.5 text-white/90 text-[10px] font-black uppercase tracking-widest">
                        <Star className="size-3 fill-amber-400 text-yellow-400" />
                        Mais assistido da semana
                    </div>
                </div>
                <h2 className="text-5xl md:text-7xl font-black text-white leading-tight drop-shadow-2xl uppercase tracking-tighter italic">
                    {featuredCourse.title}
                </h2>
                <p className="text-slate-200 line-clamp-2 md:line-clamp-3 text-sm md:text-lg leading-relaxed max-w-2xl font-medium">
                    {featuredCourse.desc}
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-4">
                    <Button size="lg" className="h-14 px-10 font-black text-lg transition-all hover:scale-105 active:scale-95 shadow-xl shadow-primary/20" onClick={() => handleCourseClick(featuredCourse)}>
                        <Play className="mr-2 size-6 fill-current" /> Começar Agora
                    </Button>
                    <Button variant="outline" size="lg" className="h-14 px-10 font-black text-lg border-white/30 text-white bg-white/10 backdrop-blur-xl hover:bg-white/20 transition-all border-2" onClick={() => handleCourseClick(featuredCourse)}>
                        <Info className="mr-2 size-6" /> Detalhes
                    </Button>
                    <Button 
                        variant="outline" 
                        size="icon" 
                        className={cn(
                            "h-14 w-14 rounded-full border-2 transition-all",
                            myList.includes(featuredCourse.id) ? "bg-primary border-primary text-white" : "border-white/30 text-white bg-white/10 backdrop-blur-xl hover:bg-white/20"
                        )}
                        onClick={() => toggleMyList(featuredCourse.id)}
                    >
                        <Heart className={cn("size-6", myList.includes(featuredCourse.id) && "fill-current")} />
                    </Button>
                </div>
            </div>
        </section>
      )}

      {/* Minha Lista */}
      {myListCourses.length > 0 && !searchQuery && (
        <section className="animate-in slide-in-from-left-4 duration-500">
            <div className="flex items-center gap-3 mb-6">
                <Heart className="text-rose-500 fill-current size-5" />
                <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">Minha Lista</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {myListCourses.map(course => (
                    <Card
                        key={course.id}
                        className="overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-105 border-none shadow-md bg-card aspect-[2/3]"
                        onClick={() => handleCourseClick(course)}
                    >
                        <div className="relative h-full w-full">
                            <Image src={course.image} alt={course.title} fill className="object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute bottom-0 p-3 w-full">
                                <h3 className="text-white text-xs font-black uppercase truncate tracking-tighter">{course.title}</h3>
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-[8px] text-white/70 font-bold uppercase">{course.episodes.length} Aulas</span>
                                    <div className="size-6 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                        <Play className="size-3 fill-white text-white" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </section>
      )}

      {/* Listas de Cursos por Nível */}
      <div className="space-y-16">
        {levels.map((level) => {
            const coursesForLevel = filteredCourses.filter((c) => c.level === level);
            if (coursesForLevel.length === 0) return null;
            const config = levelConfig[level];
            
            return (
            <section key={level} className="animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={cn("w-1.5 h-10 rounded-full", config.color)}></div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic leading-none">
                                {config.title}
                            </h2>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">Nível {level}</p>
                        </div>
                    </div>
                    <Badge variant="outline" className="opacity-50 font-black">{coursesForLevel.length} TÍTULOS</Badge>
                </div>
                
                <Carousel opts={{ align: 'start', loop: false }} className="w-full">
                <CarouselContent className="-ml-4">
                    {coursesForLevel.map((course) => (
                    <CarouselItem key={course.id} className="basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5 pl-4">
                        <Card
                            className="overflow-hidden cursor-pointer group transition-all duration-500 hover:scale-105 border-none shadow-xl bg-card"
                            onClick={() => handleCourseClick(course)}
                        >
                        <CardContent className="p-0">
                            <div className="relative w-full aspect-video">
                                <Image
                                    src={course.image}
                                    alt={course.title}
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[3px]">
                                    <div className="size-14 rounded-full bg-white/20 border-2 border-white/50 flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-500">
                                        <PlayCircle className="text-white size-10" />
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 space-y-2 bg-gradient-to-b from-card to-muted/20">
                                <h3 className="text-sm font-black text-slate-900 truncate uppercase tracking-tighter">
                                    {course.title}
                                </h3>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                                        <Clock className="size-3" /> {course.duration || '2h'}
                                    </span>
                                    <Badge variant="secondary" className="text-[9px] h-4 py-0 px-1 font-black uppercase">
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
                    <CarouselPrevious className="absolute -left-12 top-1/2 -translate-y-1/2 border-none bg-background/80 backdrop-blur-md shadow-xl hover:bg-primary hover:text-white transition-all size-10" />
                    <CarouselNext className="absolute -right-12 top-1/2 -translate-y-1/2 border-none bg-background/80 backdrop-blur-md shadow-xl hover:bg-primary hover:text-white transition-all size-10" />
                </div>
                </Carousel>
            </section>
            );
        })}
      </div>

      {/* Course Detail Dialog */}
      <Dialog open={!!selectedCourse} onOpenChange={() => { setSelectedCourse(null); setIsPlaying(false); }}>
        <DialogContent className="max-w-6xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-[0_0_100px_rgba(0,0,0,0.5)] bg-slate-950">
          {selectedCourse && (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>{selectedCourse.title}</DialogTitle>
                <DialogDescription>{selectedCourse.desc}</DialogDescription>
              </DialogHeader>

              {/* Player Area */}
              <div className="relative aspect-video w-full bg-black">
                {isPlaying && currentEpisode?.vimeoId ? (
                    <div className="absolute inset-0 animate-in fade-in duration-500">
                        <iframe
                            src={`https://player.vimeo.com/video/${currentEpisode.vimeoId}?autoplay=1&title=0&byline=0&portrait=0`}
                            className="w-full h-full"
                            frameBorder="0"
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                        <div className="absolute top-6 left-6 z-20">
                            <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => setIsPlaying(false)}>
                                <X className="mr-2" /> Fechar Player
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <Image
                            src={selectedCourse.image}
                            alt={selectedCourse.title}
                            fill
                            className="object-cover opacity-40 blur-sm"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 space-y-6">
                            <Badge className={cn("text-white shadow-lg border-none font-black px-4 py-1 text-xs", levelConfig[selectedCourse.level].color)}>
                                NÍVEL {selectedCourse.level} • {levelConfig[selectedCourse.level].title}
                            </Badge>
                            <h2 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter">
                                {currentEpisode?.title || selectedCourse.title}
                            </h2>
                            <div className="flex items-center gap-4">
                                <Button className="h-16 px-12 font-black text-xl shadow-2xl transition-all hover:scale-105 active:scale-95 group" onClick={() => currentEpisode && handlePlayEpisode(currentEpisode)}>
                                    <Play className="mr-3 size-7 fill-current group-hover:animate-bounce"/> ASSISTIR AGORA
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className={cn(
                                        "h-16 w-16 rounded-full border-2 transition-all",
                                        myList.includes(selectedCourse.id) ? "bg-primary border-primary text-white" : "bg-white/10 border-white/20 text-white backdrop-blur-md hover:bg-white/30"
                                    )}
                                    onClick={() => toggleMyList(selectedCourse.id)}
                                >
                                    <Heart className={cn("size-8", myList.includes(selectedCourse.id) && "fill-current")} />
                                </Button>
                            </div>
                        </div>
                    </>
                )}
              </div>

              {/* Content Area */}
              <div className="bg-slate-950 text-slate-100 p-10 grid grid-cols-1 md:grid-cols-3 gap-16 max-h-[40vh] overflow-y-auto no-scrollbar border-t border-white/5">
                <div className="md:col-span-2 space-y-12">
                    <section>
                        <h3 className="text-xs font-black uppercase text-primary tracking-[0.3em] mb-4">Sinopse</h3>
                        <p className="text-lg leading-relaxed text-slate-300 font-medium">
                            {selectedCourse.desc}
                        </p>
                    </section>

                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase text-primary tracking-[0.3em]">Grade de Aulas</h3>
                            <span className="text-[10px] font-black text-slate-500 uppercase">{selectedCourse.episodes.length} EPISÓDIOS</span>
                        </div>
                        <div className="space-y-4">
                            {selectedCourse.episodes.map((ep, idx) => {
                                const isMemberCourse = selectedCourse.id === 'membros';
                                const isEpisode5 = idx === 4;
                                const isLocked = isMemberCourse && isEpisode5; // Exemplo de regra IBM
                                const isActive = currentEpisode?.title === ep.title;

                                return (
                                    <div key={idx} className={cn(
                                        "flex items-center justify-between p-5 rounded-2xl transition-all border group relative overflow-hidden",
                                        isLocked 
                                            ? "bg-slate-900/30 border-slate-800 opacity-40 grayscale cursor-not-allowed" 
                                            : isActive 
                                                ? "bg-primary/20 border-primary shadow-[0_0_20px_rgba(var(--primary),0.2)]" 
                                                : "bg-slate-900/50 border-slate-800 hover:border-primary/50 hover:bg-slate-800/50 cursor-pointer"
                                    )} onClick={() => !isLocked && handlePlayEpisode(ep)}>
                                        <div className="flex items-center gap-6">
                                            <div className={cn("font-black text-2xl w-8 text-center transition-colors", isActive ? "text-primary" : "text-slate-700 group-hover:text-primary")}>
                                                {String(idx + 1).padStart(2, '0')}
                                            </div>
                                            <div className="flex flex-col">
                                                <h4 className={cn("font-black text-base md:text-lg transition-colors uppercase italic tracking-tight", isActive ? "text-white" : "group-hover:text-white")}>
                                                    {ep.title}
                                                </h4>
                                                <div className="flex items-center gap-4 mt-1.5">
                                                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1">
                                                        <Clock className="size-2 fill-current" /> {ep.duration || '45 MIN'}
                                                    </span>
                                                    {isLocked && (
                                                        <span className="text-[10px] text-rose-500 font-black uppercase flex items-center gap-1.5 bg-rose-500/10 px-2 py-0.5 rounded">
                                                            <Lock size={10} className="fill-current"/> Requisito Pendente
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {isLocked ? (
                                                <Lock className="size-6 text-slate-700" />
                                            ) : (
                                                <div className={cn("size-10 rounded-full border flex items-center justify-center transition-all", isActive ? "bg-primary border-primary" : "border-white/10 group-hover:bg-primary group-hover:border-primary")}>
                                                    <Play className="size-4 fill-white text-white translate-x-0.5" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>

                <div className="space-y-10">
                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] border-b border-white/5 pb-3">Ficha Técnica</h4>
                        <div className="space-y-5 text-sm font-bold">
                            <div className="flex flex-col gap-1">
                                <span className="text-slate-500 text-[10px] uppercase">Nível de Maturidade</span>
                                <span className="text-slate-200">{selectedCourse.level} - {levelConfig[selectedCourse.level].title}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-slate-500 text-[10px] uppercase">Formato</span>
                                <span className="text-slate-200 uppercase italic tracking-tighter">{selectedCourse.type}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-slate-500 text-[10px] uppercase">Tempo Total</span>
                                <span className="text-slate-200">{selectedCourse.duration || '4h'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] border-b border-white/5 pb-3">Palavras-chave</h4>
                        <div className="flex flex-wrap gap-2">
                            {selectedCourse.tags?.map(tag => (
                                <Badge key={tag} variant="outline" className="bg-white/5 border-white/10 text-slate-400 font-black text-[9px] uppercase tracking-tighter hover:text-primary hover:border-primary transition-colors cursor-default px-3">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
