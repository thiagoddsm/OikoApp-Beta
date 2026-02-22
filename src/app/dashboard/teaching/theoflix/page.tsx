
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
import { Play, Info, Plus, Lock, Search, Clock, CheckCircle2, PlayCircle, Star, Heart, X, Settings, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { TheoflixManager } from '@/components/teaching/theoflix/theoflix-manager';

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
  const { firestore, user } = useFirebase();
  const { data: userData } = useDoc<{ hierarchy?: { role?: string } }>(user ? `users/${user.uid}` : null);
  const isAdmin = userData?.hierarchy?.role === 'admin' || userData?.hierarchy?.role === 'pastor_senior';

  const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'theoflix_courses')) : null, [firestore]);
  const { data: dbCourses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [searchQuery, setSearchTerm] = useState('');
  const [myList, setMyList] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isManagerOpen, setManagerOpen] = useState(false);

  const allCourses = useMemo(() => {
    if (!dbCourses || dbCourses.length === 0) return theoflixDB;
    return dbCourses;
  }, [dbCourses]);

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

  const featuredCourse = allCourses.find(c => c.id === 'membros') || allCourses[0];

  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return allCourses;
    const term = searchQuery.toLowerCase();
    return allCourses.filter(c => 
        c.title.toLowerCase().includes(term) || 
        c.desc.toLowerCase().includes(term)
    );
  }, [searchQuery, allCourses]);

  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course);
    setCurrentEpisode(course.episodes[0]); 
  };

  const handlePlayEpisode = (episode: Episode) => {
    setCurrentEpisode(episode);
    setIsPlaying(true);
  };

  if (isLoadingCourses) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2 text-primary">
                <PlayCircle className="size-8" />
                TheoFlix
            </h1>
            <p className="text-muted-foreground text-sm">O streaming oficial da trilha de crescimento IBM.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-80 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input 
                    placeholder="Buscar cursos..." 
                    className="pl-10 rounded-full"
                    value={searchQuery}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            {isAdmin && (
                <Button variant="outline" size="icon" className="rounded-full shrink-0" onClick={() => setManagerOpen(true)}>
                    <Settings className="size-5" />
                </Button>
            )}
        </div>
      </div>

      {featuredCourse && !searchQuery && (
        <section className="relative h-[450px] rounded-[2.5rem] overflow-hidden group shadow-2xl">
            <Image 
                src={featuredCourse.image} 
                alt={featuredCourse.title} 
                fill 
                className="object-cover transition-transform duration-[2000ms] group-hover:scale-110"
                priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            <div className="absolute bottom-0 left-0 p-8 md:p-16 w-full max-w-3xl space-y-6">
                <Badge className="bg-primary text-white font-black px-4 py-1 text-xs">EM DESTAQUE</Badge>
                <h2 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter">
                    {featuredCourse.title}
                </h2>
                <p className="text-slate-200 line-clamp-3 text-sm md:text-lg leading-relaxed max-w-2xl font-medium">
                    {featuredCourse.desc}
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-4">
                    <Button size="lg" className="h-14 px-10 font-black text-lg" onClick={() => handleCourseClick(featuredCourse)}>
                        <Play className="mr-2 size-6 fill-current" /> Assistir
                    </Button>
                    <Button 
                        variant="outline" 
                        size="icon" 
                        className={cn(
                            "h-14 w-14 rounded-full border-2 transition-all",
                            myList.includes(featuredCourse.id) ? "bg-primary border-primary text-white" : "border-white/30 text-white bg-white/10 backdrop-blur-xl"
                        )}
                        onClick={() => toggleMyList(featuredCourse.id)}
                    >
                        <Heart className={cn("size-6", myList.includes(featuredCourse.id) && "fill-current")} />
                    </Button>
                </div>
            </div>
        </section>
      )}

      <div className="space-y-16">
        {Object.keys(levelConfig).map((lvl) => {
            const level = parseInt(lvl);
            const coursesForLevel = filteredCourses.filter((c) => c.level === level);
            if (coursesForLevel.length === 0) return null;
            const config = levelConfig[level];
            
            return (
            <section key={level} className="animate-in slide-in-from-bottom-4">
                <div className="flex items-center gap-3 mb-6">
                    <div className={cn("w-1.5 h-10 rounded-full", config.color)}></div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">
                        {config.title}
                    </h2>
                </div>
                
                <Carousel opts={{ align: 'start' }} className="w-full">
                <CarouselContent className="-ml-4">
                    {coursesForLevel.map((course) => (
                    <CarouselItem key={course.id} className="basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5 pl-4">
                        <Card
                            className="overflow-hidden cursor-pointer group transition-all duration-500 hover:scale-105 border-none shadow-xl"
                            onClick={() => handleCourseClick(course)}
                        >
                        <CardContent className="p-0">
                            <div className="relative w-full aspect-video">
                                <Image src={course.image} alt={course.title} fill className="object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[2px]">
                                    <PlayCircle className="text-white size-12" />
                                </div>
                            </div>
                            <div className="p-5 space-y-2 bg-card">
                                <h3 className="text-sm font-black text-slate-900 truncate uppercase tracking-tighter">
                                    {course.title}
                                </h3>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                        <Clock className="size-3 inline mr-1" /> {course.duration || '2h'}
                                    </span>
                                    <Badge variant="secondary" className="text-[9px] h-4 px-1 font-black">
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
                    <CarouselPrevious className="absolute -left-12 top-1/2 -translate-y-1/2" />
                    <CarouselNext className="absolute -right-12 top-1/2 -translate-y-1/2" />
                </div>
                </Carousel>
            </section>
            );
        })}
      </div>

      <Dialog open={!!selectedCourse} onOpenChange={() => { setSelectedCourse(null); setIsPlaying(false); }}>
        <DialogContent className="max-w-6xl p-0 overflow-y-auto sm:overflow-hidden sm:rounded-[2.5rem] rounded-none bg-slate-950 border-none shadow-2xl h-full sm:h-auto max-h-screen">
          {selectedCourse && (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>{currentEpisode?.title || selectedCourse.title}</DialogTitle>
                <DialogDescription>{selectedCourse.desc}</DialogDescription>
              </DialogHeader>
              
              <div className="relative aspect-video w-full bg-black shrink-0">
                {isPlaying && currentEpisode?.youtubeId ? (
                    <iframe
                        src={`https://www.youtube.com/embed/${currentEpisode.youtubeId}?autoplay=1&rel=0&playsinline=1&enablejsapi=1`}
                        className="w-full h-full"
                        frameBorder="0"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                ) : (
                    <>
                        <Image src={selectedCourse.image} alt={selectedCourse.title} fill className="object-cover opacity-40 blur-sm" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 sm:p-8 space-y-4 sm:space-y-6">
                            <Badge className={cn("text-white font-black", levelConfig[selectedCourse.level]?.color)}>
                                NÍVEL {selectedCourse.level}
                            </Badge>
                            <h2 className="text-2xl sm:text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter line-clamp-2">
                                {currentEpisode?.title || selectedCourse.title}
                            </h2>
                            <Button className="h-12 sm:h-16 px-8 sm:px-12 font-black text-base sm:text-xl shadow-2xl" onClick={() => currentEpisode && handlePlayEpisode(currentEpisode)}>
                                <Play className="mr-2 sm:mr-3 size-5 sm:size-7 fill-current" /> ASSISTIR AGORA
                            </Button>
                        </div>
                    </>
                )}
              </div>

              <div className="bg-slate-950 text-slate-100 p-6 sm:p-10 grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-16 sm:max-h-[45vh] overflow-y-auto border-t border-white/5">
                <div className="md:col-span-2 space-y-10 sm:space-y-12">
                    <section>
                        <h3 className="text-[10px] sm:text-xs font-black uppercase text-primary tracking-widest mb-3 sm:mb-4">Sinopse</h3>
                        <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed">{selectedCourse.desc}</p>
                    </section>

                    <section className="space-y-4 sm:space-y-6">
                        <h3 className="text-[10px] sm:text-xs font-black uppercase text-primary tracking-widest">Grade de Aulas</h3>
                        <div className="space-y-3 sm:space-y-4">
                            {selectedCourse.episodes?.map((ep, idx) => (
                                <div key={idx} className={cn(
                                    "flex items-center justify-between p-4 sm:p-5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer",
                                    currentEpisode?.title === ep.title ? "bg-primary/20 border-primary" : "bg-slate-900 border-slate-800 hover:bg-slate-800"
                                )} onClick={() => handlePlayEpisode(ep)}>
                                    <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                                        <span className="font-black text-xl sm:text-2xl text-slate-700 shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                                        <div className="min-w-0">
                                            <h4 className="font-black text-sm sm:text-lg uppercase italic truncate">{ep.title}</h4>
                                            <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase">{ep.duration || '45 MIN'}</span>
                                        </div>
                                    </div>
                                    <PlayCircle className="size-6 sm:size-8 text-primary shrink-0 ml-2" />
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
                <div className="space-y-8 sm:space-y-10">
                    <div className="space-y-4 sm:space-y-6">
                        <h4 className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-3">Ficha Técnica</h4>
                        <div className="space-y-4 sm:space-y-5 text-sm font-bold">
                            <div className="flex flex-col gap-1">
                                <span className="text-slate-500 text-[9px] sm:text-[10px] uppercase">Nível</span>
                                <span className="text-slate-200 text-xs sm:text-sm">{selectedCourse.level} - {levelConfig[selectedCourse.level]?.title}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-slate-500 text-[9px] sm:text-[10px] uppercase">Tempo Total</span>
                                <span className="text-slate-200 text-xs sm:text-sm">{selectedCourse.duration || '4h'}</span>
                            </div>
                        </div>
                    </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <TheoflixManager 
        open={isManagerOpen}
        onOpenChange={setManagerOpen}
        existingCourses={allCourses}
      />
    </div>
  );
}
