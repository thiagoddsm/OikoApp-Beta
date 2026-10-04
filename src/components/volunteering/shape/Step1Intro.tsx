'use client';
import { Compass, User, Mail, Users, HeartHandshake, ArrowRight, Lightbulb, PersonStanding } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Step1Intro() {
  return (
    <div className="flex flex-col w-full gap-8">
      <div className="relative overflow-hidden rounded-3xl bg-card border shadow-sm p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-lg shrink-0">
            <Compass className="w-8 h-8" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-[11px] text-primary uppercase font-bold tracking-wider">Etapa Inicial • Boas-Vindas</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground">Descubra o seu Molde de Servo</h1>
            <p className="text-muted-foreground text-base max-w-2xl">
              Você foi criado com uma assinatura singular. Deus entrelaçou seus dons, paixões e história para cumprir um propósito específico no Corpo de Cristo. Vamos mapear juntos sua identidade de serviço.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 bg-card rounded-3xl p-8 border shadow-sm flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Dados de Identificação</h2>
                <p className="text-sm text-muted-foreground">Suas respostas gerarão um relatório vocacional individual</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="space-y-2">
              <Label>Nome Completo <span className="text-destructive">*</span></Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input className="pl-10 h-12" placeholder="Ex: João da Silva" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>E-mail Principal <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input type="email" className="pl-10 h-12" placeholder="joao@email.com" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Grupo de Conexão / GC</Label>
                <Select>
                  <SelectTrigger className="h-12 pl-10 relative">
                    <Users className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                    <SelectValue placeholder="Selecione ou deixe em aberto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gc-central">GC Central - Terças 20h</SelectItem>
                    <SelectItem value="gc-jovens">GC Jovens Oikos - Quintas 20h</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ministério de Maior Interesse</Label>
                <div className="relative">
                  <HeartHandshake className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <Input className="pl-10 h-12" placeholder="Ex: Louvor, Acolhimento..." />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="rounded-3xl bg-muted/50 p-6 flex flex-col gap-4 border">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Lightbulb className="w-5 h-5" />
              <span>Dica para sua avaliação</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Responda com honestidade baseando-se em quem você <em>é de fato</em> no dia a dia, e não no que pensa que <em>deveria ser</em>. O Corpo funciona melhor quando cada membro expressa sua autenticidade.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
