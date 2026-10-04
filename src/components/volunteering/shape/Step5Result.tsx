'use client';
import { BadgeCheck, Copy, Download, Send, Star, Users, Brain, Heart, Briefcase, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function Step5Result() {
  return (
    <div className="flex flex-col items-center gap-8 text-center pb-12">
      <div className="flex flex-col items-center gap-3">
        <Badge variant="secondary" className="px-4 py-1.5 gap-2 uppercase tracking-wide bg-primary/10 text-primary hover:bg-primary/10">
          <BadgeCheck className="w-4 h-4" /> Jornada 100% Concluída
        </Badge>
        <h1 className="text-3xl font-bold">Perfil Concluído! Aqui está o seu <span className="text-primary">Cartão do Servo</span></h1>
        <p className="text-muted-foreground max-w-lg">Sua síntese vocacional foi gerada com base em seus dons, coração, habilidades, personalidade e experiências.</p>
      </div>

      {/* Cartão Físico Visual */}
      <div className="w-full max-w-2xl bg-card rounded-2xl overflow-hidden shadow-2xl border text-left flex flex-col">
        {/* Header do Cartão */}
        <div className="bg-gradient-to-br from-primary to-accent p-8 text-primary-foreground relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10 flex items-center justify-between mb-8">
            <span className="text-xs font-bold uppercase tracking-wider bg-black/20 px-3 py-1 rounded-full backdrop-blur">Molde de Servo</span>
            <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> Certificado
            </span>
          </div>
          
          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-24 h-24 rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center backdrop-blur">
              <Camera className="w-10 h-10 text-white/50" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/70">Identidade Ministerial</span>
              <h2 className="text-2xl font-bold">Mateus Oliveira</h2>
              <p className="text-sm text-white/80">GC Betel Central</p>
            </div>
          </div>
        </div>

        {/* Corpo do Cartão */}
        <div className="p-8 flex flex-col gap-8 bg-card">
          
          <div className="p-5 rounded-xl bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30">
            <div className="flex items-center gap-2 text-rose-600 mb-2">
              <Heart className="w-5 h-5 fill-current" />
              <h3 className="font-bold">Onde seu coração arde</h3>
            </div>
            <p className="text-sm text-foreground/80 italic">"Tenho um chamado profundo para mentorear jovens adultos e estruturar pequenos grupos para que ninguém viva a caminhada cristã em solidão."</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-amber-500 fill-current" />
              <h3 className="font-bold text-lg">Top 3 Dons Espirituais</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border shadow-sm">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">1º Lugar</span>
                <h4 className="font-bold mt-2">Administração</h4>
                <p className="text-xs text-muted-foreground mt-1">Gerenciar recursos, alinhar equipes de apoio.</p>
              </div>
              <div className="p-4 rounded-xl border shadow-sm">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">2º Lugar</span>
                <h4 className="font-bold mt-2">Liderança</h4>
                <p className="text-xs text-muted-foreground mt-1">Inspirar irmãos a cumprirem propósitos eternos.</p>
              </div>
              <div className="p-4 rounded-xl border shadow-sm">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">3º Lugar</span>
                <h4 className="font-bold mt-2">Sabedoria</h4>
                <p className="text-xs text-muted-foreground mt-1">Discernimento prático e aconselhamento.</p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-lg">Habilidades</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="px-3 py-1 font-semibold"><Users className="w-3 h-3 mr-1" /> Gestão de Pessoas</Badge>
              <Badge variant="outline" className="px-3 py-1 font-semibold"><Brain className="w-3 h-3 mr-1" /> Planejamento</Badge>
            </div>
          </div>
          
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full max-w-2xl">
        <Button variant="outline" className="flex-1 h-12 gap-2 text-primary border-primary/30 hover:bg-primary/5">
          <Copy className="w-4 h-4" /> Copiar Resumo
        </Button>
        <Button variant="outline" className="flex-1 h-12 gap-2">
          <Download className="w-4 h-4" /> Baixar PDF
        </Button>
        <Button className="flex-1 h-12 gap-2 bg-green-600 hover:bg-green-700 text-white">
          <Send className="w-4 h-4" /> Enviar ao Líder
        </Button>
      </div>
    </div>
  );
}
