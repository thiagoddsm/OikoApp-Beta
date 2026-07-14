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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { theoflixDB, type Course, type Episode } from '@/lib/theoflix-data';
import { Play, Info, Plus, Lock, Search, Clock, CheckCircle2, PlayCircle, Star, Heart, X, Settings, Loader2, ArrowLeft, CheckCircle, BookCheck, DatabaseZap, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirebase, useCollection, useMemoFirebase, useDoc, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, query, doc, orderBy } from 'firebase/firestore';
import { TheoflixManager } from '@/components/teaching/theoflix/theoflix-manager';
import { useToast } from '@/hooks/use-toast';
import { useVolunteering, VolunteeringProvider } from '@/contexts/volunteering-context';
import { useCoursesData } from "@/hooks/useDomainData";

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
    const { courses, classes, enrollmentRequests, pedagogicalLogs, theoflixCourses } = useCoursesData();

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
  const [managerOpen, setManagerOpen] = useState(false);
  const [lessonNotes, setLessonNotes] = useState('');
  
  // Quiz states
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<(number | string)[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState<string>('');
  const { data: theoflixConfig } = useDoc<any>('config/theoflix');

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

  const getCourseTotalDuration = (course: Course): string => {
    if (!course?.episodes?.length) return "";
    const totalMinutes = course.episodes.reduce((acc, ep) => {
        const duration = ep.duration || "0";
        const hMatch = duration.match(/(\d+)\s*h/i);
        const mMatch = duration.match(/(\d+)\s*m/i);
        
        let mins = 0;
        if (hMatch) mins += parseInt(hMatch[1], 10) * 60;
        if (mMatch) mins += parseInt(mMatch[1], 10);
        
        if (!hMatch && !mMatch) {
            const rawNum = parseInt(duration.replace(/\D/g, ''), 10);
            if (!isNaN(rawNum)) mins += rawNum;
        }
        
        return acc + mins;
    }, 0);

    if (totalMinutes === 0) return "";

    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    
    const parts: string[] = [];
    if (h > 0) parts.push(`${h}H`);
    if (m > 0) parts.push(`${m}MIN`);
    
    return parts.join(' ');
  };

  const currentLessonMaterial = useMemo(() => {
    if (!selectedCourse || !currentEpisode || !courses) return null;
    
    const epIdx = selectedCourse.episodes.findIndex(ep => ep.title === currentEpisode.title);
    if (epIdx === -1) return null;

    const physicalCourse = courses.find((pc: any) => 
        pc.linkedTheoflixId === selectedCourse.id || pc.id === selectedCourse.id
    );
    const syllabus = physicalCourse?.syllabus || [];
    const matchedMod = syllabus.find((mod: any) => 
        mod.theoflixCourseId === selectedCourse.id &&
        mod.theoflixRequiredVideoIds?.includes(epIdx.toString())
    );

    if ((matchedMod as any)?.materialUrl && (matchedMod as any)?.materialName) {
        return {
            name: (matchedMod as any).materialName,
            url: (matchedMod as any).materialUrl
        };
    }
    return null;
  }, [selectedCourse, currentEpisode, courses]);

  const [isApiReady, setIsApiReady] = useState(false);
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
    
    // Check for quiz
    if (currentEpisode.quiz?.enabled && currentEpisode.quiz.questions?.length > 0 && !quizSubmitted) {
        setIsQuizOpen(true);
        // Inicializa com string vazia para essay (discursiva) e -1 para multipla escolha
        setQuizAnswers(currentEpisode.quiz.questions.map(q => q.type === 'essay' ? '' : -1));
        return;
    }

    const episodeIndex = selectedCourse.episodes.findIndex(e => e.youtubeId === currentEpisode.youtubeId);
    const episodeKey = currentEpisode.youtubeId || currentEpisode.title.replace(/\s+/g, '_');
    
    // Salva as respostas discursivas se houver
    const essayAnswers: Record<string, string> = {};
    if (currentEpisode.quiz?.enabled && currentEpisode.quiz.questions) {
        currentEpisode.quiz.questions.forEach((q, idx) => {
            if (q.type === 'essay' && quizAnswers[idx]) {
                essayAnswers[`q_${idx}`] = String(quizAnswers[idx]);
            }
        });
    }

    updateDocumentNonBlocking(doc(firestore, 'users', user.uid), {
      [`journey.theoflixProgress.${selectedCourse.id}.${episodeKey}`]: true,
      // Grava no histórico se o aluno submeteu respostas discursivas neste quiz
      ...(Object.keys(essayAnswers).length > 0 && {
        [`journey.theoflixEssayAnswers.${selectedCourse.id}.${episodeKey}`]: essayAnswers
      })
    });

    if (episodeIndex > -1) {
        markAttendanceByTheoflix(user.uid, selectedCourse.id, episodeIndex, lessonNotes);
    }
    setLessonNotes('');
    setQuizSubmitted(false);
    toast({ title: "Aula Concluída! 🎉", description: "Seu progresso e anotações foram salvos com sucesso." });
  };

  const handleQuizSubmit = async () => {
      if (!currentEpisode?.quiz?.questions) return;
      const questions = currentEpisode.quiz.questions;
      
      setIsEvaluating(true);
      setQuizFeedback('');

      try {
          const questionScores: number[] = [];
          const feedbacks: string[] = [];

          for (let i = 0; i < questions.length; i++) {
              const q = questions[i];
              const answer = quizAnswers[i];

              if (q.type === 'essay') {
                  if (q.aiActive) {
                      const res = await fetch('/api/teaching/quiz/evaluate-essay', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                              questionText: q.question,
                              studentAnswer: String(answer || ''),
                              essayGabarito: q.essayGabarito
                          })
                      });
                      if (!res.ok) {
                          throw new Error('Falha na comunicação com o servidor de IA.');
                      }
                      const evaluation = await res.json();
                      questionScores.push(evaluation.score);
                      if (evaluation.feedback) {
                          feedbacks.push(`Questão ${i + 1}: ${evaluation.feedback}`);
                      }
                  } else {
                      const hasContent = String(answer || '').trim().length > 0;
                      questionScores.push(hasContent ? 100 : 0);
                  }
              } else {
                  const isCorrect = answer === q.correctIndex;
                  questionScores.push(isCorrect ? 100 : 0);
              }
          }

          const sum = questionScores.reduce((a, b) => a + b, 0);
          const score = Math.round(sum / questions.length);
          const minScore = theoflixConfig?.quizMinScore || 70;
          const finalFeedback = feedbacks.join('\n\n');

          setQuizScore(score);
          setQuizFeedback(finalFeedback);
          setQuizSubmitted(true);

          // Save attempt to firestore
          if (user && firestore && selectedCourse) {
              addDocumentNonBlocking(collection(firestore, 'theoflix_quiz_attempts'), {
                  userId: user.uid,
                  userName: userData?.name || user.displayName || user.email || 'Aluno',
                  userEmail: user.email || '',
                  courseId: selectedCourse.id,
                  courseTitle: selectedCourse.title,
                  episodeId: currentEpisode.youtubeId || currentEpisode.title.replace(/\s+/g, '_'),
                  episodeTitle: currentEpisode.title,
                  score,
                  minScore,
                  approved: true,
                  answers: quizAnswers,
                  questions: questions.map((q, idx) => ({
                      ...q,
                      obtainedScore: questionScores[idx]
                  })),
                  aiFeedback: finalFeedback || null,
                  submittedAt: new Date().toISOString()
              });
          }

          toast({ title: "Respostas enviadas!", description: "Sua aula foi marcada como assistida." });
          setTimeout(() => {
              setIsQuizOpen(false);
              handleMarkAsCompleted();
          }, 3000);
      } catch (error: any) {
          console.error("Erro ao avaliar quiz:", error);
          toast({
              variant: 'destructive',
              title: "Erro na avaliação",
              description: error.message || "Ocorreu um erro ao processar o seu teste. Tente novamente."
          });
      } finally {
          setIsEvaluating(false);
      }
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

  const checkCourseAccess = (course: Course) => {
    if (isAdmin) return true;

    // Verifica se existe algum curso presencial que esteja vinculado a este curso do TheoFlix
    const linkedPhysicalCourses = courses.filter((pc: any) => 
        pc.linkedTheoflixId === course.id || pc.id === course.id
    );

    // Se NÃO for vinculado a nenhum curso presencial (100% online), fica habilitado para todos
    if (linkedPhysicalCourses.length === 0) {
        return true;
    }

    // Se FOR um curso híbrido (tem presencial), o aluno DEVE estar matriculado
    const physicalCourseIds = linkedPhysicalCourses.map(pc => pc.id);
    return classes.some(cls => 
        physicalCourseIds.includes(cls.courseId) && 
        cls.students?.includes(user?.uid || '')
    );
  };

  const handleCourseClick = (course: Course) => {
    // Access check for hybrid/restricted courses
    if (!checkCourseAccess(course)) {
        toast({
            variant: 'destructive',
            title: "Acesso Restrito",
            description: "Este curso é exclusivo para alunos matriculados na modalidade presencial."
        });
        return;
    }
    setSelectedCourse(course);
    setCurrentEpisode(course.episodes[0] || null); 
    setLessonNotes('');
  };

  const handlePlayEpisode = (episode: Episode) => {
    setCurrentEpisode(episode);
    setIsPlaying(true);
    setLessonNotes('');
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
    <div className="space-y-6 sm:space-y-10 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2 text-primary">
                <PlayCircle className="size-6 sm:size-8" />
                TheoFlix
            </h1>
            <p className="text-muted-foreground text-[10px] sm:text-sm">O streaming oficial da trilha de crescimento IBM.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-80 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input 
                    placeholder="Buscar cursos..." 
                    className="pl-10 rounded-full h-10"
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
        <section className="relative h-[300px] sm:h-[450px] rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden group shadow-2xl">
            <Image 
                src={featuredCourse.image || 'https://picsum.photos/seed/placeholder/1200/800'} 
                alt={featuredCourse.title} 
                fill 
                className={cn(
                    "object-cover transition-transform duration-1000 group-hover:scale-110",
                    !checkCourseAccess(featuredCourse) && "grayscale"
                )}
                priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6 sm:p-16 w-full max-w-3xl space-y-3 sm:space-y-6">
                <Badge className="bg-primary text-white font-black px-3 py-0.5 text-[10px] sm:text-xs">EM DESTAQUE</Badge>
                <h2 className="text-3xl sm:text-7xl font-black text-white italic tracking-tighter leading-none">
                    {featuredCourse.title}
                </h2>
                <p className="text-slate-200 line-clamp-2 sm:line-clamp-3 text-xs sm:text-lg leading-relaxed max-w-2xl font-medium">
                    {featuredCourse.desc}
                </p>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2 sm:pt-4">
                    {(() => {
                        const isLocked = !checkCourseAccess(featuredCourse);
                        return (
                            <Button 
                                size="lg" 
                                className={cn(
                                    "h-10 sm:h-14 px-6 sm:px-10 font-black text-sm sm:text-lg",
                                    isLocked && "bg-slate-700 hover:bg-slate-700 cursor-not-allowed"
                                )}
                                onClick={() => handleCourseClick(featuredCourse)}
                            >
                                {isLocked ? (
                                    <>
                                        <Lock className="mr-2 size-4 sm:size-6" /> Acesso Restrito
                                    </>
                                ) : (
                                    <>
                                        <Play className="mr-2 size-4 sm:size-6 fill-current" /> Assistir
                                    </>
                                )}
                            </Button>
                        );
                    })()}
                    <Button 
                        variant="outline" 
                        size="icon" 
                        className={cn(
                            "h-10 w-10 sm:h-14 sm:w-14 rounded-full border-2 transition-all",
                            myList.includes(featuredCourse.id) ? "bg-primary border-primary text-white" : "border-white/30 text-white bg-white/10 backdrop-blur-xl"
                        )}
                        onClick={() => toggleMyList(featuredCourse.id)}
                    >
                        <Heart className={cn("size-4 sm:size-6", myList.includes(featuredCourse.id) && "fill-current")} />
                    </Button>
                </div>
            </div>
        </section>
      )}

      <div className="space-y-10 sm:space-y-16">
        {levels.map((lvl) => {
            const coursesForLevel = filteredCourses.filter((c) => c.level === lvl.level);
            if (coursesForLevel.length === 0) return null;
            const config = getColorClasses(lvl.color);
            
            return (
            <section key={lvl.id} className="animate-in slide-in-from-bottom-4">
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <div className={cn("w-1 h-6 sm:w-1.5 sm:h-10 rounded-full", config.color)}></div>
                    <h2 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 uppercase italic">
                        {lvl.title}
                    </h2>
                </div>
                
                <Carousel opts={{ align: 'start' }} className="w-full">
                <CarouselContent className="-ml-2 sm:-ml-4">
                    {coursesForLevel.map((course) => {
                        const isLocked = !checkCourseAccess(course);
                        return (
                            <CarouselItem key={course.id} className="basis-1/2 sm:basis-1/3 lg:basis-1/4 xl:basis-1/5 pl-2 sm:pl-4">
                                <Card
                                    className={cn(
                                        "overflow-hidden cursor-pointer group transition-all duration-500 border-none shadow-xl",
                                        isLocked ? "opacity-75 grayscale cursor-not-allowed" : "hover:scale-105"
                                    )}
                                    onClick={() => handleCourseClick(course)}
                                >
                                <CardContent className="p-0">
                                    <div className="relative w-full aspect-video">
                                        <Image src={course.image || 'https://picsum.photos/seed/placeholder/800/450'} alt={course.title} fill className="object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[2px]">
                                            {isLocked ? (
                                                <Lock className="text-white size-8 sm:size-12" />
                                            ) : (
                                                <PlayCircle className="text-white size-8 sm:size-12" />
                                            )}
                                        </div>
                                        {isLocked && (
                                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md p-1.5 rounded-full text-white">
                                                <Lock className="size-3" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3 sm:p-5 space-y-1 sm:space-y-2 bg-card">
                                        <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate uppercase tracking-tighter">
                                            {course.title}
                                        </h3>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[8px] sm:text-[10px] font-bold text-muted-foreground uppercase">
                                                <Clock className="size-2.5 sm:size-3 inline mr-1" /> {getCourseTotalDuration(course)}
                                            </span>
                                            <Badge 
                                                variant="outline" 
                                                className={cn(
                                                    "text-[7px] sm:text-[9px] h-3 sm:h-4 px-1 font-black transition-all",
                                                    course.type === 'Obrigatório' 
                                                        ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100" 
                                                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                                )}
                                            >
                                                {isLocked ? 'BLOQUEADO' : course.type}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                                </Card>
                            </CarouselItem>
                        );
                    })}
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
        <DialogContent className="max-w-6xl p-0 overflow-y-auto sm:rounded-[2.5rem] rounded-none bg-slate-950 border-none shadow-2xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-screen scroll-smooth">
          <DialogHeader className="p-4 sm:p-6 bg-slate-950 flex flex-row items-center justify-between sticky top-0 z-50 shrink-0">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button variant="ghost" size="icon" onClick={handleClosePlayer} className="text-white hover:bg-white/10 rounded-full h-8 w-8 sm:h-10 sm:w-10">
                <ArrowLeft className="size-5 sm:size-6" />
              </Button>
              <DialogTitle className="text-white font-black uppercase italic tracking-tighter truncate text-sm sm:text-base max-w-[200px] sm:max-w-none">
                {selectedCourse?.title || "Visualizando Curso"}
              </DialogTitle>
            </div>
            <DialogDescription className="sr-only">Assista às aulas do curso e acompanhe seu progresso.</DialogDescription>
          </DialogHeader>
          
          {selectedCourse && (
            <div className="flex flex-col">
              <div className="relative aspect-video w-full bg-black shrink-0">
                {isPlaying && currentEpisode?.youtubeId ? (
                    <div id="theoflix-player" className="w-full h-full"></div>
                ) : (
                    <>
                        <Image src={selectedCourse.image || 'https://picsum.photos/seed/placeholder/800/450'} alt={selectedCourse.title} fill className="object-cover opacity-40 blur-sm" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 sm:p-8 space-y-4 sm:space-y-6">
                            <Badge className={cn("text-white font-black text-[10px] sm:text-xs", getColorClasses(levels.find(l => l.level === selectedCourse.level)?.color || 'blue').color)}>
                                NÍVEL {selectedCourse.level}
                            </Badge>
                            <h2 className="text-xl sm:text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter line-clamp-2">
                                {currentEpisode?.title || selectedCourse.title}
                            </h2>
                            <Button className="h-10 sm:h-16 px-6 sm:px-12 font-black text-xs sm:text-xl shadow-2xl" onClick={() => currentEpisode && handlePlayEpisode(currentEpisode)}>
                                <Play className="mr-2 sm:mr-3 size-4 sm:size-7 fill-current" /> ASSISTIR AGORA
                            </Button>
                        </div>
                    </>
                )}
              </div>

              <div className="bg-slate-950 text-slate-100 p-5 sm:p-10 grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-16 border-t border-white/5">
                <div className="md:col-span-2 space-y-8 sm:space-y-12">
                    <section>
                        <h3 className="text-[9px] sm:text-xs font-black uppercase text-primary tracking-widest mb-2 sm:mb-4">Sinopse</h3>
                        <p className="text-sm sm:text-lg text-slate-300 font-medium leading-relaxed">{selectedCourse.desc}</p>
                    </section>

                    <section className="space-y-4 sm:space-y-6">
                        <h3 className="text-[9px] sm:text-xs font-black uppercase text-primary tracking-widest">Grade de Aulas</h3>
                        <div className="space-y-2 sm:space-y-4">
                             {selectedCourse.episodes?.map((ep, idx) => {
                                const epKey = ep.youtubeId || ep.title.replace(/\s+/g, '_');
                                const isCompleted = userProgress[selectedCourse.id]?.[epKey];

                                // Procura se este episódio está associado a alguma aula física
                                const matchedLesson = (() => {
                                    const physicalCourse = courses?.find((pc: any) => 
                                        pc.linkedTheoflixId === selectedCourse.id || pc.id === selectedCourse.id
                                    );
                                    const syllabus = physicalCourse?.syllabus || [];
                                    const sIdx = syllabus.findIndex((mod: any) => 
                                        mod.theoflixCourseId === selectedCourse.id &&
                                        mod.theoflixRequiredVideoIds?.includes(idx.toString())
                                    );
                                    if (sIdx !== -1) {
                                        return {
                                            num: String(sIdx + 1).padStart(2, '0'),
                                            title: syllabus[sIdx].title
                                        };
                                    }
                                    return null;
                                })();
                                
                                return (
                                <div key={idx} className={cn(
                                    "flex items-center justify-between p-3 sm:p-5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer",
                                    currentEpisode?.title === ep.title ? "bg-primary/20 border-primary" : "bg-slate-900 border-slate-800 hover:bg-slate-800"
                                )} onClick={() => handlePlayEpisode(ep)}>
                                    <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                                        <div className="relative">
                                          <span className="font-black text-base sm:text-2xl text-slate-700 shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                                          {isCompleted && (
                                            <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-emerald-500 rounded-full p-0.5 text-white">
                                              <CheckCircle className="size-2 sm:size-3 fill-current" />
                                            </div>
                                          )}
                                        </div>
                                        <div className="min-w-0">
                                            {matchedLesson && (
                                                <span className="text-[10px] font-bold text-primary block uppercase tracking-wider mb-0.5">
                                                    Aula {matchedLesson.num}: {matchedLesson.title}
                                                </span>
                                            )}
                                            <h4 className="font-black text-xs sm:text-lg uppercase italic truncate">{ep.title}</h4>
                                            <span className="text-[8px] sm:text-[10px] text-slate-500 font-bold uppercase">{ep.duration || '45 MIN'}</span>
                                        </div>
                                    </div>
                                    <PlayCircle className={cn("size-5 sm:size-8 shrink-0 ml-2", isCompleted ? "text-emerald-500" : "text-primary")} />
                                </div>
                            )})}
                        </div>
                    </section>
                </div>
                <div className="space-y-6 sm:space-y-10">
                     {currentLessonMaterial && (
                         <div className="p-4 bg-emerald-950/40 rounded-2xl border border-emerald-500/20 space-y-3 animate-in fade-in duration-300">
                             <div className="flex items-center gap-2">
                                 <LinkIcon className="size-4 text-emerald-400 shrink-0" />
                                 <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Material de Apoio</span>
                             </div>
                             <p className="text-xs text-slate-300 font-medium">Esta aula possui material disponível para download ou leitura.</p>
                             <Button 
                                 asChild 
                                 variant="outline" 
                                 size="sm" 
                                 className="w-full text-xs font-bold gap-2 text-emerald-400 border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-950/60"
                             >
                                 <a href={currentLessonMaterial.url} target="_blank" rel="noopener noreferrer">
                                     Acessar: {currentLessonMaterial.name}
                                 </a>
                             </Button>
                         </div>
                     )}
                     <div className="space-y-4">
                        <Label className="text-xs font-black uppercase text-slate-400 tracking-widest">Observações da Aula</Label>
                        <Textarea 
                            value={lessonNotes}
                            onChange={(e) => setLessonNotes(e.target.value)}
                            placeholder="Anotações, dúvidas ou insights..."
                            className="bg-slate-900 border-slate-800 text-slate-200 h-32 text-sm"
                        />
                    </div>
                    <div className="space-y-4 sm:space-y-6">
                        <h4 className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-3">Ficha Técnica</h4>
                        <div className="space-y-3 sm:space-y-5 text-xs sm:text-sm font-bold">
                            <div className="flex flex-col gap-1">
                                <span className="text-slate-500 text-[8px] sm:text-[10px] uppercase">Nível</span>
                                <span className="text-slate-200">
                                    {selectedCourse.level} - {levels.find(l => l.level === selectedCourse.level)?.title || 'Outro'}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-slate-500 text-[8px] sm:text-[10px] uppercase">Tempo Total</span>
                                <span className="text-slate-200">{calculatedTotalDuration}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                        <Button onClick={handleMarkAsCompleted} className="w-full h-12 font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg">
                            <BookCheck className="mr-2 size-5"/> Marcar como Concluída
                        </Button>
                        <Button 
                          variant="secondary" 
                          onClick={handleClosePlayer} 
                          className="w-full h-10 sm:h-12 rounded-xl font-black bg-slate-800 text-white hover:bg-slate-700 border-none shadow-lg transition-colors text-xs sm:text-sm"
                        >
                          <ArrowLeft className="mr-2 size-3 sm:size-4" /> VOLTAR PARA A GALERIA
                        </Button>
                    </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <TheoflixManager 
        open={managerOpen} 
        onOpenChange={setManagerOpen} 
        existingCourses={allCourses}
        existingLevels={levels}
      />

      <Dialog open={isQuizOpen} onOpenChange={setIsQuizOpen}>
          <DialogContent className="max-w-xl w-[95vw] sm:w-full rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
              <div className="bg-primary p-8 text-white text-center space-y-2">
                  <DatabaseZap className="size-12 mx-auto mb-2 opacity-50" />
                  <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter">Avaliação de Aula</DialogTitle>
                  <DialogDescription className="text-white/70 text-xs">Responda as questões abaixo para validar seu conhecimento.</DialogDescription>
              </div>

              <ScrollArea className="max-h-[60vh] p-6">
                  <div className="space-y-8 pb-4">
                      {currentEpisode?.quiz?.questions?.map((q, idx) => (
                          <div key={idx} className="space-y-4">
                              <h4 className="font-bold text-slate-800 flex gap-3">
                                  <span className="size-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0">{idx + 1}</span>
                                  {q.question}
                              </h4>
                              <div className="grid grid-cols-1 gap-2 pl-9">
                                  {(q.type || 'multiple') === 'multiple' ? (
                                      (q.options || []).map((opt, optIdx) => (
                                          <button
                                              key={optIdx}
                                              disabled={quizSubmitted || isEvaluating}
                                              onClick={() => {
                                                  const n = [...quizAnswers];
                                                  n[idx] = optIdx;
                                                  setQuizAnswers(n);
                                              }}
                                              className={cn(
                                                  "p-3 rounded-xl border-2 text-left text-sm transition-all font-medium",
                                                  quizAnswers[idx] === optIdx 
                                                    ? "border-primary bg-primary/5 text-primary" 
                                                    : "border-slate-100 hover:border-slate-200 text-slate-600",
                                                  quizSubmitted && optIdx === q.correctIndex && "bg-emerald-50 border-emerald-500 text-emerald-700",
                                                  quizSubmitted && quizAnswers[idx] === optIdx && optIdx !== q.correctIndex && "bg-rose-50 border-rose-500 text-rose-700"
                                              )}
                                          >
                                              {opt}
                                          </button>
                                      ))
                                  ) : (
                                      <div className="space-y-2">
                                          <Textarea
                                              disabled={quizSubmitted || isEvaluating}
                                              value={String(quizAnswers[idx] || '')}
                                              onChange={(e) => {
                                                  const n = [...quizAnswers];
                                                  n[idx] = e.target.value;
                                                  setQuizAnswers(n);
                                              }}
                                              placeholder="Digite sua resposta aqui..."
                                              className={cn(
                                                  "bg-white border-slate-200 text-slate-800 text-xs sm:text-sm h-24 rounded-xl focus-visible:ring-primary",
                                                  (quizSubmitted || isEvaluating) && "bg-slate-100 text-slate-600 cursor-not-allowed"
                                              )}
                                          />
                                          {quizSubmitted && (
                                              <p className="text-[10px] text-emerald-600 font-bold uppercase flex items-center gap-1">
                                                  <CheckCircle2 className="size-3" /> Resposta registrada com sucesso!
                                              </p>
                                          )}
                                      </div>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              </ScrollArea>

              <div className="p-6 bg-slate-50 border-t flex flex-col gap-3">
                  {!quizSubmitted ? (
                      <Button 
                          onClick={handleQuizSubmit} 
                          disabled={isEvaluating || quizAnswers.some((ans, qIdx) => {
                              const q = currentEpisode?.quiz?.questions?.[qIdx];
                              if (!q) return true;
                              if (q.type === 'essay') {
                                  return !ans || String(ans).trim().length < 3;
                              }
                              return ans === -1;
                          })}
                          className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest"
                      >
                          {isEvaluating ? (
                              <>
                                  <Loader2 className="mr-2 size-5 animate-spin" />
                                  Avaliando com IA...
                              </>
                          ) : (
                              "Finalizar Teste"
                          )}
                      </Button>
                  ) : (
                      <div className="space-y-4">
                           <div className="p-4 rounded-2xl text-center border border-primary/20 bg-primary/5 text-primary">
                               <p className="text-[10px] font-black uppercase tracking-widest mb-1">AULA CONCLUÍDA!</p>
                               <p className="text-xs font-bold mt-1 text-primary">
                                   Obrigado por enviar suas respostas. Seu feedback foi registrado e a aula foi computada.
                               </p>
                           </div>

                           {quizFeedback && (
                               <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-800 text-xs text-left max-h-40 overflow-y-auto">
                                   <p className="font-black uppercase text-[9px] text-primary mb-1">Feedback Detalhado (IA):</p>
                                   <p className="whitespace-pre-wrap font-medium">{quizFeedback}</p>
                                </div>
                           )}

                           <Button 
                               onClick={() => {
                                   setIsQuizOpen(false);
                                   handleMarkAsCompleted();
                               }}
                               className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest bg-primary hover:bg-primary/95 text-primary-foreground"
                           >
                               Fechar e Continuar
                           </Button>
                      </div>
                  )}
                  <Button variant="ghost" onClick={() => setIsQuizOpen(false)} disabled={isEvaluating} className="text-xs font-bold text-muted-foreground uppercase">Responder depois</Button>
              </div>
          </DialogContent>
      </Dialog>
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
