
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import { Play, Info, Plus, Lock, Search, Clock, CheckCircle2, PlayCircle, Star, Heart, X, Settings, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirebase, useCollection, useMemoFirebase, useDoc, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, doc, orderBy } from 'firebase/firestore';
import { TheoflixManager } from '@/components/teaching/theoflix/theoflix-manager';
import { useToast } from '@/hooks/use-toast';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';

export type TheoLevel = {
    id: string;
    level: number;
    title: string;
    color: string;
};

const defaultLevelConfig: Record<number, { title: string; color: string; shadow: string; bg: string }> = {
  1: { title: 'Fundamentos & Integração', color: 'bg-blue-600', bg: 'bg-blue-50', shadow: 'shadow-blue-500/30' },
  2: { title: 'Maturidade & Cura', color: 'bg-rose-600', bg: 'bg-rose-50', shadow: 'shadow-rose-500/30' },
  3: { title: 'Escola de Líderes', color: 'bg-amber-600', bg: 'bg-amber-50', shadow: 'shadow-amber-500/30' },
  4: { title: 'Alta Gestão & Supervisão', color: 'bg-purple-600', bg: 'bg-purple-50', shadow: 'shadow-purple-500/30' },
};

export const getColorClasses = (color: string) => {
    const maps: Record<string, any> = {
        blue: { color: 'bg-blue-600', bg: 'bg-blue-50', shadow: 'shadow-blue-500/30' },
        rose: { color: 'bg-rose-600', bg: 'bg-rose-50', shadow: 'shadow-rose-500/30' },
        amber: { color: 'bg-amber-600', bg: 'bg-amber-50', shadow: 'shadow-amber-500/30' },
        purple: { color: 'bg-purple-600', bg: 'bg-purple-50', shadow: 'shadow-purple-500/30' },
        emerald: { color: 'bg-emerald-600', bg: 'bg-emerald-50', shadow: 'shadow-emerald-500/30' },
        indigo: { color: 'bg-indigo-600', bg: 'bg-indigo-50', shadow: 'shadow-indigo-500/30' },
        slate: { color: 'bg-slate-600', bg: 'bg-slate-50', shadow: 'shadow-slate-500/30' },
    };
    return maps[color] || maps.blue;
};

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

function TheoFlixContent() {
  const { firestore, user } = useFirebase();
  const { markAttendanceByTheoflix } = useVolunteering();
  const { toast } = useToast();
  const { data: userData } = useDoc<any>(user ? `users/${user.uid}` : null);
  const isAdmin = userData?.hierarchy?.role === 'admin' || userData?.hierarchy?.role === 'pastor_senior';

  const coursesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'theoflix_courses')) : null, [firestore]);
  const { data: dbCourses, isLoading: isLoadingCourses } = useCollection<Course>(coursesQuery);

  const levelsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'theoflix_levels'), orderBy('level', 'asc')) : null, [firestore]);
  const { data: dbLevels, isLoading: isLoadingLevels } = useCollection<TheoLevel>(levelsQuery);

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [searchQuery, setSearchTerm] = useState('');
  const [myList, setMyList] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isManagerOpen, setManagerOpen] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);
  
  const playerRef = useRef<any>(null);

  const userProgress = useMemo(() => userData?.journey?.theoflixProgress || {}, [userData]);

  const levels = useMemo(() => {
      if (dbLevels && dbLevels.length > 0) return dbLevels;
      return Object.entries(defaultLevelConfig).map(([lvl, cfg]) => ({
          id: lvl,
          level: parseInt(lvl),
          title: cfg.title,
          color: cfg.color.replace('bg-', '').replace('-600', '')
      }));
  }, [dbLevels]);

  const allCourses = useMemo(() => {
    const baseCourses = (dbCourses && dbCourses.length > 0) ? dbCourses : theoflixDB;
    if (!dbCourses || dbCourses.length === 0) return baseCourses;
    const dbIds = new Set(dbCourses.map(c => c.id));
    const localFiltered = theoflixDB.filter(c => !dbIds.has(c.id));
    return [...dbCourses, ...localFiltered];
  }, [dbCourses]);

  const calculatedTotalDuration = useMemo(() => {
    if (!selectedCourse?.episodes) return "0min";
    const totalMinutes = selectedCourse.episodes.reduce((acc, ep) => {
        const duration = ep.duration || "0";
        const hMatch = duration.match(/(\d+)\s*h/i);
        const mMatch = duration.match(/(\d+)\s*m/i);
        
        let mins = 0;
        if (hMatch) mins += parseInt(hMatch[1]) * 60;
        if (mMatch) mins += parseInt(mMatch[1]);
        
        if (!hMatch && !mMatch) {
            const rawNum = parseInt(duration.replace(/\D/g, ''));
            if (!isNaN(rawNum)) mins += rawNum;
        }
        
        return acc + mins;
    }, 0);
    
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h > 0) return `${h}h ${m > 0 ? `${m}min` : ''}`.trim();
    return `${m}min`;
  }, [selectedCourse]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = () => setIsApiReady(true);
    } else {
      setIsApiReady(true);
    }
  }, []);

  useEffect(() => {
    if (isPlaying && currentEpisode && isApiReady) {
      if (playerRef.current && playerRef.current.loadVideoById) {
        playerRef.current.loadVideoById(currentEpisode.youtubeId);
      } else {
        playerRef.current = new window.YT.Player('theoflix-player', {
          height: '100%',
          width: '100%',
          videoId: currentEpisode.youtubeId,
          playerVars: { 'playsinline': 1, 'autoplay': 1, 'rel': 0, 'modestbranding': 1 },
          events: {
            'onStateChange': (event: any) => {
              if (event.data === window.YT.PlayerState.ENDED) handleMarkAsCompleted();
            }
          }
        });
      }
    }
  }, [isPlaying, currentEpisode, isApiReady]);

  const handleMarkAsCompleted = () => {
    if (!user || !selectedCourse || !currentEpisode || !firestore) return;
    
    const episodeIndex = selectedCourse.episodes.findIndex(e => e.youtubeId === currentEpisode.youtubeId);
    const episodeKey = currentEpisode.youtubeId || currentEpisode.title.replace(/\s+/g, '_');
    
    // 1. Salvar progresso no usuário
    updateDocumentNonBlocking(doc(firestore, 'users', user.uid), {
      [`journey.theoflixProgress.${selectedCourse.id}.${episodeKey}`]: true
    });

    // 2. Sincronizar presença física automática via Contexto
    if (episodeIndex > -1) {
        markAttendanceByTheoflix(user.uid, selectedCourse.id, episodeIndex);
    }

    toast({ title: "Aula Concluída! 🎉", description: "Seu progresso foi salvo com sucesso." });
  };

  const toggleMyList = (id: string) => {
    setMyList(prev => {
      const newList = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      localStorage.setItem('theoflix_mylist', JSON.stringify(newList));
      return newList;
    });
  };

  const featuredCourse = useMemo(() => allCourses.find(c => c.id === 'membros') || allCourses[0], [allCourses]);

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
    setCurrentEpisode(course.episodes[0] || null); 
  };

  const handlePlayEpisode = (episode: Episode) => {
    setCurrentEpisode(episode);
    setIsPlaying(true);
  };

  const handleClosePlayer = () => {
    setSelectedCourse(null);
    setIsPlaying(false);
    if (playerRef.current && playerRef.current.destroy) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
  };

  if (isLoadingCourses || isLoadingLevels) {
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
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="rounded-full shrink-0 h-10 w-10 hover:bg-primary/10 transition-colors" 
                  onClick={() => setManagerOpen(true)}
                >
                    <Settings className="size-5" />
                </Button>
            )}
        </div>
      </div>

      {featuredCourse && !searchQuery && (
        <section className="relative h-[450px] rounded-[2.5rem] overflow-hidden group shadow-2xl">
            <Image 
                src={featuredCourse.image || 'https://picsum.photos/seed/placeholder/1200/800'} 
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
        {levels.map((lvl) => {
            const coursesForLevel = filteredCourses.filter((c) => c.level === lvl.level);
            if (coursesForLevel.length === 0) return null;
            const config = getColorClasses(lvl.color);
            
            return (
            <section key={lvl.id} className="animate-in slide-in-from-bottom-4">
                <div className="flex items-center gap-3 mb-6">
                    <div className={cn("w-1.5 h-10 rounded-full", config.color)}></div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">
                        {lvl.title}
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
                                <Image src={course.image || 'https://picsum.photos/seed/placeholder/800/450'} alt={course.title} fill className="object-cover" />
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

      <Dialog open={!!selectedCourse} onOpenChange={(open) => !open && handleClosePlayer()}>
        <DialogContent className="max-w-6xl p-0 overflow-y-auto sm:rounded-[2.5rem] rounded-none bg-slate-950 border-none shadow-2xl h-full sm:h-auto max-h-screen scroll-smooth">
          <DialogHeader className="p-6 bg-slate-950 flex flex-row items-center justify-between sticky top-0 z-50">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={handleClosePlayer} className="text-white hover:bg-white/10 rounded-full h-10 w-10">
                <ArrowLeft className="size-6" />
              </Button>
              <DialogTitle className="text-white font-black uppercase italic tracking-tighter truncate">
                {selectedCourse?.title || "Visualizando Curso"}
              </DialogTitle>
            </div>
            <DialogDescription className="sr-only">Assista às aulas do curso e acompanhe seu progresso.</DialogDescription>
          </DialogHeader>
          
          {selectedCourse && (
            <div className="flex flex-col">
              <div className="relative aspect-video w-full bg-black">
                {isPlaying && currentEpisode?.youtubeId ? (
                    <div id="theoflix-player" className="w-full h-full"></div>
                ) : (
                    <>
                        <Image src={selectedCourse.image || 'https://picsum.photos/seed/placeholder/800/450'} alt={selectedCourse.title} fill className="object-cover opacity-40 blur-sm" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 sm:p-8 space-y-4 sm:space-y-6">
                            <Badge className={cn("text-white font-black", getColorClasses(levels.find(l => l.level === selectedCourse.level)?.color || 'blue').color)}>
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

              <div className="bg-slate-950 text-slate-100 p-6 sm:p-10 grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-16 border-t border-white/5">
                <div className="md:col-span-2 space-y-10 sm:space-y-12">
                    <section>
                        <h3 className="text-[10px] sm:text-xs font-black uppercase text-primary tracking-widest mb-3 sm:mb-4">Sinopse</h3>
                        <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed">{selectedCourse.desc}</p>
                    </section>

                    <section className="space-y-4 sm:space-y-6">
                        <h3 className="text-[10px] sm:text-xs font-black uppercase text-primary tracking-widest">Grade de Aulas</h3>
                        <div className="space-y-3 sm:space-y-4">
                            {selectedCourse.episodes?.map((ep, idx) => {
                                const epKey = ep.youtubeId || ep.title.replace(/\s+/g, '_');
                                const isCompleted = userProgress[selectedCourse.id]?.[epKey];
                                
                                return (
                                <div key={idx} className={cn(
                                    "flex items-center justify-between p-4 sm:p-5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer",
                                    currentEpisode?.title === ep.title ? "bg-primary/20 border-primary" : "bg-slate-900 border-slate-800 hover:bg-slate-800"
                                )} onClick={() => handlePlayEpisode(ep)}>
                                    <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                                        <div className="relative">
                                          <span className="font-black text-xl sm:text-2xl text-slate-700 shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                                          {isCompleted && (
                                            <div className="absolute -top-2 -right-2 bg-emerald-500 rounded-full p-0.5 text-white">
                                              <CheckCircle className="size-3 fill-current" />
                                            </div>
                                          )}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-black text-sm sm:text-lg uppercase italic truncate">{ep.title}</h4>
                                            <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase">{ep.duration || '45 MIN'}</span>
                                        </div>
                                    </div>
                                    <PlayCircle className={cn("size-6 sm:size-8 shrink-0 ml-2", isCompleted ? "text-emerald-500" : "text-primary")} />
                                </div>
                            )})}
                        </div>
                    </section>
                </div>
                <div className="space-y-8 sm:space-y-10">
                    <div className="space-y-4 sm:space-y-6">
                        <h4 className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-3">Ficha Técnica</h4>
                        <div className="space-y-4 sm:space-y-5 text-sm font-bold">
                            <div className="flex flex-col gap-1">
                                <span className="text-slate-500 text-[9px] sm:text-[10px] uppercase">Nível</span>
                                <span className="text-slate-200 text-xs sm:text-sm">
                                    {selectedCourse.level} - {levels.find(l => l.level === selectedCourse.level)?.title || 'Outro'}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-slate-500 text-[9px] sm:text-[10px] uppercase">Tempo Total</span>
                                <span className="text-slate-200 text-xs sm:text-sm">{calculatedTotalDuration}</span>
                            </div>
                        </div>
                    </div>
                    
                    <Button 
                      variant="secondary" 
                      onClick={handleClosePlayer} 
                      className="w-full h-12 rounded-xl font-black bg-slate-800 text-white hover:bg-slate-700 border-none shadow-lg transition-colors"
                    >
                      <ArrowLeft className="mr-2 size-4" /> VOLTAR PARA A GALERIA
                    </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <TheoflixManager 
        open={isManagerOpen}
        onOpenChange={setManagerOpen}
        existingCourses={allCourses}
        existingLevels={levels}
      />
    </div>
  );
}

export default function TheoFlixPage() {
    return (
        <VolunteeringProvider>
            <TheoFlixContent />
        </VolunteeringProvider>
    );
}
