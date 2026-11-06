'use client';

import React, { useState } from 'react';
import type { DiscLetter, DiscScores } from '@/lib/disc';
import {
  generateFullDiscReport,
  type FullDiscReport,
  type DimensionAnalysis,
  type CompetencyItem,
  type LeadershipStyleData,
} from '@/lib/disc-report-data';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles,
  ShieldAlert,
  Target,
  Compass,
  Users,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  MessageSquare,
  Printer,
  ChevronRight,
  TrendingUp,
  Brain,
  Award,
  Zap,
  Info,
} from 'lucide-react';

interface DiscDetailedReportProps {
  scores: DiscScores;
  primary: DiscLetter;
  secondary: DiscLetter | null;
  lowest?: DiscLetter | null;
  personName?: string;
  className?: string;
  defaultTab?: string;
}

export function DiscDetailedReport({
  scores,
  primary,
  secondary,
  lowest,
  personName = 'Servo de Deus',
  className = '',
  defaultTab = 'perfil',
}: DiscDetailedReportProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const report: FullDiscReport = generateFullDiscReport(
    scores,
    primary,
    secondary,
    lowest,
    personName
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Banner Principal com Identificação do Perfil Composto */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E113F] via-[#2D1A5E] to-[#523A8C] p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-amber-400 text-slate-950 hover:bg-amber-300 font-extrabold text-xs px-2.5 py-0.5">
                Mapeamento Comportamental DISC Completo
              </Badge>
              <Badge variant="outline" className="text-white/80 border-white/20 text-xs">
                Metodologia William M. Marston
              </Badge>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {report.profileData.title}
            </h2>
            <p className="text-sm sm:text-base text-purple-200 font-medium max-w-2xl leading-relaxed">
              {report.profileData.subtitle}
            </p>
            <p className="text-xs text-purple-300 pt-1">
              Avaliação ministerial de <strong>{personName}</strong> • Base de 120 pontos ponderados
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 gap-2 text-xs font-bold"
            >
              <Printer className="w-4 h-4" /> Imprimir Relatório
            </Button>
          </div>
        </div>

        {/* Efeito decorativo de fundo */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Navegação por Abas Ricas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto pb-1 no-scrollbar">
          <TabsList className="bg-slate-100 p-1 rounded-2xl h-auto gap-1 inline-flex min-w-full sm:min-w-0">
            <TabsTrigger
              value="perfil"
              className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#523A8C] data-[state=active]:shadow-xs gap-1.5"
            >
              <span>🧭</span>
              <span>Perfil & Potencialidades</span>
            </TabsTrigger>
            <TabsTrigger
              value="dimensoes"
              className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#523A8C] data-[state=active]:shadow-xs gap-1.5"
            >
              <span>📊</span>
              <span>4 Dimensões Marston</span>
            </TabsTrigger>
            <TabsTrigger
              value="lideranca"
              className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#523A8C] data-[state=active]:shadow-xs gap-1.5"
            >
              <span>👑</span>
              <span>Estilo de Liderança</span>
            </TabsTrigger>
            <TabsTrigger
              value="comunicacao"
              className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#523A8C] data-[state=active]:shadow-xs gap-1.5"
            >
              <span>💬</span>
              <span>Comunicação Eficaz</span>
            </TabsTrigger>
            <TabsTrigger
              value="competencias"
              className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#523A8C] data-[state=active]:shadow-xs gap-1.5"
            >
              <span>⚡</span>
              <span>16 Competências</span>
            </TabsTrigger>
            <TabsTrigger
              value="plano"
              className="rounded-xl px-3.5 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#523A8C] data-[state=active]:shadow-xs gap-1.5"
            >
              <span>🎯</span>
              <span>Plano & Aplicação</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ABA 1: PERFIL & POTENCIALIDADES */}
        <TabsContent value="perfil" className="space-y-5 mt-4">
          {/* Visão Geral */}
          <Card className="rounded-2xl border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Brain className="w-5 h-5 text-[#523A8C]" /> Visão Geral do Perfil Comportamental
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                {report.profileData.generalDescription}
              </p>

              <div className="p-4 bg-purple-50/70 border border-purple-150 rounded-2xl text-xs sm:text-sm text-[#2D1A5E] leading-relaxed">
                <strong>Orientações para o Pastoreio: </strong>
                {report.profileData.pastoralGuidance}
              </div>
            </CardContent>
          </Card>

          {/* Potencialidades & Forças */}
          <Card className="rounded-2xl border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" /> Potencialidades e Forças Naturais
              </CardTitle>
              <CardDescription className="text-xs">
                Áreas onde este servo expressa espontaneamente alto rendimento e maturidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {report.profileData.potentialities.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-150 text-xs sm:text-sm text-slate-800"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Relações Interpessoais & Tomada de Decisão */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="rounded-2xl border-slate-200 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" /> Relações Interpessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs leading-relaxed">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-1">
                  <strong className="text-slate-900 block">No Serviço e Trabalho:</strong>
                  <span className="text-slate-600">{report.profileData.interpersonalRelationships.workAndService}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-1">
                  <strong className="text-slate-900 block">Com Amigos e Família:</strong>
                  <span className="text-slate-600">{report.profileData.interpersonalRelationships.familyAndFriends}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-1">
                  <strong className="text-slate-900 block">Em Ambientes Formais:</strong>
                  <span className="text-slate-600">{report.profileData.interpersonalRelationships.underFormalEnvironment}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-600" /> Estilo de Tomada de Decisão
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-150 text-slate-700 leading-relaxed">
                    {report.profileData.decisionMaking}
                  </div>

                  <div className="pt-2">
                    <h5 className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5 text-xs">
                      <Compass className="w-3.5 h-3.5 text-[#523A8C]" /> Melhor Adequação Ministerial:
                    </h5>
                    <ul className="space-y-1.5">
                      {report.profileData.bestOrganizationalFit.map((fit, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-slate-600 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#523A8C] shrink-0" />
                          <span>{fit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </div>

              <div className="p-4 bg-amber-50/70 border-t border-amber-200/80 rounded-b-2xl">
                <span className="text-[10px] font-extrabold uppercase text-amber-800 tracking-wider block mb-1">
                  Gatilhos e Medos Centrais
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {report.profileData.coreFears.map((fear, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="bg-white text-amber-900 border-amber-200 text-[10px]"
                    >
                      ⚠️ {fear}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Motivadores Centrais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase text-emerald-800 tracking-wider">
                Motivador Principal
              </span>
              <h4 className="text-sm font-black text-emerald-950">
                {report.profileData.mainMotivator.title}
              </h4>
              <p className="text-xs text-emerald-900/90 leading-relaxed">
                {report.profileData.mainMotivator.description}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase text-indigo-800 tracking-wider">
                Motivador Secundário
              </span>
              <h4 className="text-sm font-black text-indigo-950">
                {report.profileData.secondaryMotivator.title}
              </h4>
              <p className="text-xs text-indigo-900/90 leading-relaxed">
                {report.profileData.secondaryMotivator.description}
              </p>
            </div>
          </div>

          {/* Pontos a Desenvolver sob Pressão */}
          <Card className="rounded-2xl border-rose-200 bg-rose-50/40 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-extrabold text-rose-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" /> Pontos de Atenção & Comportamentos sob Pressão
              </CardTitle>
              <CardDescription className="text-xs text-rose-700/80">
                Atitudes reativas comuns a este perfil quando cansado, contrariado ou sob alto nível de estresse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {report.profileData.pointsToDevelop.map((pt, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white rounded-xl border border-rose-200/80 text-xs text-rose-950 flex items-start gap-2"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span>{pt}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 2: AS 4 DIMENSÕES MARSTON */}
        <TabsContent value="dimensoes" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.dimensions.map((dim) => {
              const borderColors: Record<DiscLetter, string> = {
                D: 'border-red-200 bg-red-50/40',
                I: 'border-amber-200 bg-amber-50/40',
                S: 'border-emerald-200 bg-emerald-50/40',
                C: 'border-blue-200 bg-blue-50/40',
              };
              const tagColors: Record<DiscLetter, string> = {
                D: 'bg-red-500 text-white',
                I: 'bg-amber-400 text-slate-900',
                S: 'bg-emerald-500 text-white',
                C: 'bg-blue-500 text-white',
              };
              const barColors: Record<DiscLetter, string> = {
                D: 'bg-red-500',
                I: 'bg-amber-400',
                S: 'bg-emerald-500',
                C: 'bg-blue-500',
              };

              return (
                <Card
                  key={dim.letter}
                  className={`rounded-2xl border ${borderColors[dim.letter]} shadow-xs`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-6 h-6 rounded-md flex items-center justify-center font-black text-xs ${tagColors[dim.letter]}`}>
                            {dim.letter}
                          </span>
                          <h4 className="font-extrabold text-sm text-slate-900">{dim.name}</h4>
                        </div>
                        <p className="text-xs font-semibold text-slate-600">{dim.title}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <Badge variant="outline" className="text-[10px] font-black bg-white border-slate-200">
                          {dim.score} pts ({dim.percentage}%)
                        </Badge>
                        <span className="block text-[10px] font-bold text-slate-500 mt-0.5">
                          {dim.intensityLevel}
                        </span>
                      </div>
                    </div>

                    {/* Barra de Intensidade */}
                    <div className="space-y-1">
                      <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-slate-200/80">
                        <div
                          className={`h-full rounded-full transition-all ${barColors[dim.letter]}`}
                          style={{ width: `${Math.max(8, dim.percentage)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-400 font-semibold px-0.5">
                        <span>Baixo</span>
                        <span>Equilibrado</span>
                        <span>Muito Alto</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 space-y-1">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide block">
                        Descritor: <span className="text-slate-900">{dim.descriptor}</span>
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {dim.interpretation}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ABA 3: ESTILO DE LIDERANÇA */}
        <TabsContent value="lideranca" className="space-y-5 mt-4">
          {/* Card Destaque do Estilo Predominante */}
          <Card className="rounded-2xl border-purple-200 bg-gradient-to-br from-purple-50/70 via-white to-slate-50 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-[#523A8C] text-white text-xs font-bold px-2.5 py-0.5">
                  Estilo de Liderança Predominante
                </Badge>
                <span className="text-xs font-extrabold text-purple-900">
                  {report.predominantLeadership.percentage}% do perfil
                </span>
              </div>
              <CardTitle className="text-xl font-black text-slate-900 pt-1">
                Líder {report.predominantLeadership.style} ({report.predominantLeadership.letter})
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                {report.predominantLeadership.summary}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1.5 text-xs">
                  <strong className="text-emerald-950 font-extrabold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Principais Pontos Fortes na Liderança:
                  </strong>
                  <ul className="space-y-1 text-emerald-900">
                    {report.predominantLeadership.strengths.map((str, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-emerald-600" />
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl space-y-1.5 text-xs">
                  <strong className="text-rose-950 font-extrabold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Desafios e Armadilhas da Liderança:
                  </strong>
                  <ul className="space-y-1 text-rose-900">
                    {report.predominantLeadership.challenges.map((ch, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-rose-600" />
                        <span>{ch}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico dos 4 Estilos de Liderança */}
          <Card className="rounded-2xl border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#523A8C]" /> Composição dos 4 Estilos de Liderança
              </CardTitle>
              <CardDescription className="text-xs">
                Distribuição percentual derivada da intensidade das respostas no inventário
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {report.leadershipStyles.map((item) => (
                  <div
                    key={item.style}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-slate-900">
                        {item.style} ({item.letter})
                      </span>
                      <span className="font-black text-sm text-slate-800">{item.percentage}%</span>
                    </div>

                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                      />
                    </div>

                    <p className="text-[11px] text-slate-600 leading-tight">
                      {item.summary}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 4: COMUNICAÇÃO EFICAZ */}
        <TabsContent value="comunicacao" className="space-y-5 mt-4">
          <Card className="rounded-2xl border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" /> Como a Liderança & Equipe Devem se Comunicar com Este Perfil
              </CardTitle>
              <CardDescription className="text-xs">
                Guia pastoral para reuniões, feedbacks, delegação de tarefas e alinhamentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                  <h4 className="font-extrabold text-xs text-emerald-950 flex items-center gap-1.5 uppercase tracking-wide">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> O que fazer (Recomendado):
                  </h4>
                  <ul className="space-y-1.5 text-xs text-emerald-900">
                    {report.communicationGuide.howOthersShouldTalkToMe.do.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-1" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-2">
                  <h4 className="font-extrabold text-xs text-rose-950 flex items-center gap-1.5 uppercase tracking-wide">
                    <AlertTriangle className="w-4 h-4 text-rose-600" /> O que evitar (Cuidado):
                  </h4>
                  <ul className="space-y-1.5 text-xs text-rose-900">
                    {report.communicationGuide.howOthersShouldTalkToMe.dont.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0 mt-1" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Como se comunicar com os outros 4 perfis */}
          <Card className="rounded-2xl border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#523A8C]" /> Como Você Pode se Comunicar com Cada Perfil
              </CardTitle>
              <CardDescription className="text-xs">
                Flexibilidade relacional para liderar e cooperar com pessoas de temperamentos diferentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {report.communicationGuide.howITalkToOtherProfiles.map((guide) => (
                  <div
                    key={guide.targetLetter}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs"
                  >
                    <span className="font-black text-slate-900 block">
                      Ao falar com um {guide.targetLetter} ({guide.targetName}):
                    </span>
                    <ul className="space-y-1 text-slate-600">
                      {guide.howToCommunicateDo.slice(0, 3).map((d, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 5: MAPA DE 16 COMPETÊNCIAS */}
        <TabsContent value="competencias" className="space-y-4 mt-4">
          <Card className="rounded-2xl border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" /> Mapa de 16 Competências Comportamentais
              </CardTitle>
              <CardDescription className="text-xs">
                Matriz de habilidades e predisposições naturais calculadas a partir dos subfatores do DISC
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {report.competencies.map((comp) => {
                  const levelColors: Record<CompetencyItem['level'], string> = {
                    Excelente: 'text-emerald-700 bg-emerald-50 border-emerald-200',
                    Desenvolvido: 'text-indigo-700 bg-indigo-50 border-indigo-200',
                    Satisfatório: 'text-slate-700 bg-slate-50 border-slate-200',
                    Baixo: 'text-amber-700 bg-amber-50 border-amber-200',
                    Crítico: 'text-rose-700 bg-rose-50 border-rose-200',
                  };
                  const barColor: Record<CompetencyItem['level'], string> = {
                    Excelente: 'bg-emerald-500',
                    Desenvolvido: 'bg-indigo-500',
                    Satisfatório: 'bg-slate-400',
                    Baixo: 'bg-amber-500',
                    Crítico: 'bg-rose-500',
                  };

                  return (
                    <div
                      key={comp.id}
                      className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-slate-900">{comp.name}</span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-extrabold px-1.5 py-0 ${levelColors[comp.level]}`}
                        >
                          {comp.level}
                        </Badge>
                      </div>

                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor[comp.level]}`}
                          style={{ width: `${comp.score}%` }}
                        />
                      </div>

                      <p className="text-[10px] text-slate-500 leading-tight">
                        {comp.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 6: PLANO DE AÇÃO & REFLEXÃO */}
        <TabsContent value="plano" className="space-y-4 mt-4">
          <Card className="rounded-2xl border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" /> Plano de Ação Ministerial & Autoconsciência
              </CardTitle>
              <CardDescription className="text-xs">
                Perguntas reflexivas baseadas nas páginas 50-53 do relatório CIS para mentoria pastoral
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.reflectionQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2"
                >
                  <p className="text-xs sm:text-sm font-bold text-slate-900 flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#523A8C] text-white text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{q}</span>
                  </p>
                  <div className="w-full min-h-[44px] p-2 bg-white rounded-lg border border-dashed border-slate-300 text-xs text-slate-400 italic">
                    Espaço para anotações pessoais durante a mentoria com o pastor ou líder de GC...
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
