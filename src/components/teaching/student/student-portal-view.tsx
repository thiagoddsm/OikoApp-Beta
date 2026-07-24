'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, CheckCircle2, Clock, DollarSign, Folder, Award, PlayCircle, BookOpen } from 'lucide-react';
import Link from 'next/link';

interface StudentPortalViewProps {
  studentName?: string;
  courseName?: string;
  className?: string;
  attendancePercentage?: number;
  completedQuizzesCount?: number;
}

export function StudentPortalView({
  studentName = 'Aluno Oiko',
  courseName = 'Curso de Libras',
  className = 'DIS Libras Nível 1',
  attendancePercentage = 92,
  completedQuizzesCount = 4
}: StudentPortalViewProps) {
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <GraduationCap className="size-6 text-purple-300" />
            <h2 className="text-xl font-bold">Portal do Aluno — {studentName}</h2>
          </div>
          <p className="text-xs text-purple-200">
            Acompanhe seu progresso acadêmico, presenças, apostilas e certificados em um só lugar.
          </p>
        </div>

        <Badge className="bg-emerald-500 text-white font-bold text-xs px-3 py-1 self-start md:self-auto">
          Aluno Ativo • {className}
        </Badge>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Attendance KPI */}
        <Card className="border-indigo-100 bg-indigo-50/40 dark:bg-indigo-950/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-indigo-700 dark:text-indigo-300">Frequência Integrada</CardTitle>
            <CheckCircle2 className="size-4 text-indigo-600" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-black text-indigo-900 dark:text-indigo-100">{attendancePercentage}%</div>
            <Progress value={attendancePercentage} className="h-1.5 bg-indigo-200" />
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400">Presença presencial + Quizzes online</p>
          </CardContent>
        </Card>

        {/* Quizzes Completed KPI */}
        <Card className="border-purple-100 bg-purple-50/40 dark:bg-purple-950/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-purple-700 dark:text-purple-300">Quizzes TheoFlix</CardTitle>
            <PlayCircle className="size-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-purple-900 dark:text-purple-100">{completedQuizzesCount} concluídos</div>
            <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-1">Aulas EAD aprovadas no módulo</p>
          </CardContent>
        </Card>

        {/* Finance KPI */}
        <Card className="border-emerald-100 bg-emerald-50/40 dark:bg-emerald-950/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">Mensalidade do Mês</CardTitle>
            <DollarSign className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100">Em dia ✅</div>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">Próximo vencimento: 10/08</p>
          </CardContent>
        </Card>

        {/* Certificate Status KPI */}
        <Card className="border-amber-100 bg-amber-50/40 dark:bg-amber-950/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold uppercase text-amber-700 dark:text-amber-300">Certificado de Nível</CardTitle>
            <Award className="size-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-amber-900 dark:text-amber-100">Em Progresso</div>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">Liberação ao concluir a turma</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BookOpen className="size-5 text-indigo-600" />
              Minha Turma & Aulas TheoFlix
            </CardTitle>
            <CardDescription className="text-xs">Acesse os quizzes online e assista aos episódios EAD.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/teaching/theoflix">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 text-xs">
                <PlayCircle className="size-4" /> Entrar no TheoFlix & Quizzes
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Folder className="size-5 text-indigo-600" />
              Materiais Didáticos & Apostilas
            </CardTitle>
            <CardDescription className="text-xs">Baixe os PDFs e exercícios disponibilizados pelos professores.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full font-bold gap-2 text-xs">
              <Folder className="size-4 text-indigo-600" /> Ver Minhas Apostilas
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
