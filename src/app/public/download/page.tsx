'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Download, Smartphone, Monitor, Radio, Tv, Play, CheckCircle2, 
  ExternalLink, Sparkles, Shield, ArrowRight, Music, GraduationCap,
  Copy, Check, Layers, Laptop
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function DownloadCentralPage() {
  const { toast } = useToast();
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(label);
    toast({
      title: "Link Copiado!",
      description: `O link para ${label} foi copiado para sua área de transferência.`,
    });
    setTimeout(() => setCopiedLink(null), 3000);
  };

  const apps = [
    {
      id: "theoflix",
      name: "Theoflix Android",
      subtitle: "App do Aluno para Streaming & EAD",
      badge: "Mobile Android",
      badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
      icon: GraduationCap,
      iconColor: "text-purple-600 bg-purple-50",
      description: "Acesso exclusivo aos cursos bíblicos, trilhas de crescimento, vídeos e quizzes integrados diretamente ao OikoApp.",
      features: [
        "Aulas e módulos em vídeo HD",
        "Progresso salvo automaticamente",
        "Quizzes e certificações",
        "Modo offline e favoritos"
      ],
      primaryAction: {
        label: "Baixar Theoflix (APK)",
        href: "https://github.com/thiagoddsm/Theoflix/releases/latest",
        icon: Download,
        isExternal: true
      },
      secondaryAction: {
        label: "Repositório GitHub",
        href: "https://github.com/thiagoddsm/Theoflix",
        icon: ExternalLink,
        isExternal: true
      },
      gradient: "from-purple-500/10 via-transparent to-transparent border-purple-200"
    },
    {
      id: "oikolive",
      name: "Oiko Live VS",
      subtitle: "Multitrack Stage & Virtual Soundcheck",
      badge: "Desktop / Web Stage",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
      icon: Radio,
      iconColor: "text-amber-600 bg-amber-50",
      description: "Sistema profissional para ministério de louvor, reprodução multitrack, metrônomo, pads e controle remoto de culto.",
      features: [
        "Mixer multitrack em tempo real",
        "Integração com a Ordem de Culto",
        "Modo Remote Pad para celular",
        "Roteamento de canais de áudio"
      ],
      primaryAction: {
        label: "Abrir Oiko Live Stage",
        href: "/dashboard/vs",
        icon: Play,
        isExternal: false
      },
      secondaryAction: {
        label: "Remote Pad (Músicos)",
        href: "/public/vs-banda",
        icon: Smartphone,
        isExternal: false
      },
      gradient: "from-amber-500/10 via-transparent to-transparent border-amber-200"
    },
    {
      id: "oikopwa",
      name: "OikoApp Mobile (PWA)",
      subtitle: "Portal de Membros & Liderança",
      badge: "Web App / PWA",
      badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
      icon: Smartphone,
      iconColor: "text-blue-600 bg-blue-50",
      description: "Instale o portal completo da igreja na tela inicial do seu celular (iOS ou Android) sem precisar da loja.",
      features: [
        "Check-in e Fila de Tarefas",
        "Relatórios semanais de GC",
        "Escalas de serviço e voluntários",
        "Avisos e avisos em tempo real"
      ],
      primaryAction: {
        label: "Acessar Portal / Conectar",
        href: "/conectar",
        icon: ExternalLink,
        isExternal: false
      },
      secondaryAction: {
        label: "Área de Membros",
        href: "/dashboard",
        icon: Laptop,
        isExternal: false
      },
      gradient: "from-blue-500/10 via-transparent to-transparent border-blue-200"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-purple-600 selection:text-white">
      {/* Header / Nav */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/public" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-md shadow-purple-900/30">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-white">
              Oiko<span className="text-purple-400">Apps</span> Central
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" className="text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800">
                Painel da Liderança
              </Button>
            </Link>
            <Link href="/conectar">
              <Button size="sm" className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-sm">
                Portal Conectar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-16 space-y-16">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <Badge className="bg-purple-950 text-purple-300 border border-purple-800/60 font-semibold px-3 py-1 text-xs">
            ✨ Central Oficial de Downloads & Aplicativos
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Baixe e acesse os apps da nossa igreja
          </h1>
          <p className="text-sm sm:text-base text-slate-400 font-normal leading-relaxed">
            Tenha acesso exclusivo aos cursos do Theoflix, ferramentas de louvor e palco Oiko Live e ao sistema de membros na palma da sua mão.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {apps.map((app) => {
            const Icon = app.icon;
            return (
              <div 
                key={app.id}
                className={`relative rounded-3xl bg-gradient-to-b ${app.gradient} bg-slate-900/90 border p-6 flex flex-col justify-between shadow-xl hover:translate-y-[-4px] transition-all duration-300`}
              >
                <div className="space-y-5">
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${app.iconColor}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <Badge variant="outline" className={`font-bold text-[11px] ${app.badgeColor}`}>
                      {app.badge}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-xl font-extrabold text-white tracking-tight">{app.name}</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{app.subtitle}</p>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    {app.description}
                  </p>

                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Recursos:</span>
                    <ul className="space-y-1.5">
                      {app.features.map((feat, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2.5 pt-6 mt-4 border-t border-slate-800/80">
                  {app.primaryAction.isExternal ? (
                    <a 
                      href={app.primaryAction.href} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="block w-full"
                    >
                      <Button className="w-full bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs h-11 rounded-xl shadow-md gap-2">
                        <app.primaryAction.icon className="w-4 h-4" />
                        {app.primaryAction.label}
                      </Button>
                    </a>
                  ) : (
                    <Link href={app.primaryAction.href} className="block w-full">
                      <Button className="w-full bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs h-11 rounded-xl shadow-md gap-2">
                        <app.primaryAction.icon className="w-4 h-4" />
                        {app.primaryAction.label}
                      </Button>
                    </Link>
                  )}

                  {app.secondaryAction.isExternal ? (
                    <a 
                      href={app.secondaryAction.href} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="block w-full"
                    >
                      <Button variant="outline" className="w-full border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80 font-semibold text-xs h-9 rounded-xl gap-2">
                        <app.secondaryAction.icon className="w-3.5 h-3.5" />
                        {app.secondaryAction.label}
                      </Button>
                    </a>
                  ) : (
                    <Link href={app.secondaryAction.href} className="block w-full">
                      <Button variant="outline" className="w-full border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80 font-semibold text-xs h-9 rounded-xl gap-2">
                        <app.secondaryAction.icon className="w-3.5 h-3.5" />
                        {app.secondaryAction.label}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Guia de Instalação Rápida */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 space-y-6">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-purple-400" />
            <h3 className="text-lg font-black text-white uppercase tracking-tight">Como instalar no seu celular</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300">
            <div className="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              <span className="font-bold text-purple-400 uppercase tracking-wider block">📱 Theoflix Android (APK)</span>
              <p>1. Clique no botão de download acima e baixe o arquivo APK.</p>
              <p>2. Abra o arquivo baixado nas notificações ou no gerenciador de arquivos.</p>
              <p>3. Permita a instalação de fontes desconhecidas se solicitado pelo Android.</p>
              <p>4. Abra o Theoflix e faça login com seu e-mail e senha do OikoApp!</p>
            </div>

            <div className="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              <span className="font-bold text-blue-400 uppercase tracking-wider block">🌐 OikoApp no iPhone / Android (Web App)</span>
              <p>1. Abra o link <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-300">/conectar</code> no Safari ou Chrome.</p>
              <p>2. No iPhone: clique no botão <strong>Compartilhar</strong> e selecione <strong>"Adicionar à Tela de Início"</strong>.</p>
              <p>3. No Android: clique nos 3 pontinhos e selecione <strong>"Instalar Aplicativo"</strong>.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-8 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} OikoApp & Theoflix. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
