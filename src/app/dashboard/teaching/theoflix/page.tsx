'use client';

import React, { useState } from 'react';
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
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { theoflixDB, type Course } from '@/lib/theoflix-data';
import { PlayCircle, Plus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const levelConfig: Record<number, { title: string; color: string; shadow: string }> = {
  1: {
    title: 'Fundamentos & Integração',
    color: 'bg-ibm-blue',
    shadow: 'shadow-blue-500/30',
  },
  2: {
    title: 'Maturidade & Cura',
    color: 'bg-ibm-rose',
    shadow: 'shadow-rose-500/30',
  },
  3: {
    title: 'Escola de Líderes',
    color: 'bg-ibm-amber',
    shadow: 'shadow-amber-500/30',
  },
  4: {
    title: 'Alta Gestão & Supervisão',
    color: 'bg-ibm-purple',
    shadow: 'shadow-purple-500/30',
  },
};

export default function TheoFlixPage() {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const levels = [1, 2, 3, 4];

  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course);
  };

  return (
    <div className="space-y-8">
      {levels.map((level) => {
        const coursesForLevel = theoflixDB.filter((c) => c.level === level);
        if (coursesForLevel.length === 0) return null;
        const config = levelConfig[level];
        return (
          <section key={level}>
            <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-3">
              <span
                className={`${config.color} text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-lg ${config.shadow} font-black`}
              >
                {level}
              </span>
              {config.title}
            </h2>
            <Carousel
              opts={{
                align: 'start',
                loop: false,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-4">
                {coursesForLevel.map((course) => (
                  <CarouselItem
                    key={course.id}
                    className="basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5 pl-4"
                  >
                    <Card
                      className="overflow-hidden cursor-pointer group transition-transform duration-300 hover:scale-105 hover:z-20 shadow-md border-border"
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
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800/50">
                            <div
                              className={`h-full ${config.color}`}
                              style={{ width: `${Math.random() * 60 + 20}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="p-3 bg-card">
                          <h3 className="text-sm font-bold truncate">
                            {course.title}
                          </h3>
                          <div className="flex items-center justify-between mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {course.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {course.episodes.length} Aulas
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="ml-16" />
              <CarouselNext className="mr-16"/>
            </Carousel>
          </section>
        );
      })}

      <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {selectedCourse && (
            <>
              <div className="relative h-96">
                <Image
                  src={selectedCourse.image}
                  alt={selectedCourse.title}
                  fill
                  className="object-cover"
                />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent"></div>
                 <div className="absolute bottom-8 left-8 right-8 z-10 space-y-4">
                    <Badge className={`${levelConfig[selectedCourse.level].color} text-white shadow-lg`}>
                        NÍVEL {selectedCourse.level}
                    </Badge>
                    <h2 className="text-4xl font-black text-white drop-shadow-lg">
                        {selectedCourse.title}
                    </h2>
                     <div className="flex items-center gap-4">
                        <Button>
                            <PlayCircle className="mr-2"/>
                            Iniciar Trilha
                        </Button>
                        <Button variant="outline" size="icon">
                            <Plus/>
                        </Button>
                    </div>
                 </div>
              </div>
              <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-4">
                    <p className="text-base leading-relaxed text-muted-foreground">{selectedCourse.desc}</p>
                    <Separator className="my-6"/>
                    <h3 className="text-xl font-bold">Aulas</h3>
                    <div className="space-y-2">
                        {selectedCourse.episodes.map((ep, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 hover:bg-muted rounded-lg cursor-pointer group">
                                <div className="flex items-center gap-4">
                                    <span className="text-muted-foreground font-bold w-4 text-center">{idx + 1}</span>
                                    <h4 className="font-medium group-hover:text-primary">{ep}</h4>
                                </div>
                                <span className="text-xs text-muted-foreground">45m</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="space-y-3 text-sm">
                     <h4 className="font-semibold">Sobre o curso</h4>
                     <div className="flex flex-col space-y-2 text-muted-foreground">
                        <div><strong className="text-foreground">Nível:</strong> {selectedCourse.level} - {levelConfig[selectedCourse.level].title}</div>
                        <div><strong className="text-foreground">Tipo:</strong> {selectedCourse.type}</div>
                        <div><strong className="text-foreground">Módulos:</strong> {selectedCourse.episodes.length}</div>
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
