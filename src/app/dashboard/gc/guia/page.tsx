'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Printer, ArrowLeft, CheckCircle2, Clock, 
  Sparkles, ShieldCheck, Send, Smartphone, HeartHandshake
} from 'lucide-react';

export default function GuiaLiderGcPage() {
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Barra Superior de Ações (Oculta na Impressão) */}
        <div className="flex items-center justify-between gap-4 print:hidden">
          <Link 
            href="/dashboard/gc/cells"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="size-4" /> Voltar para Células
          </Link>

          <Button 
            onClick={handlePrint}
            className="rounded-xl font-bold text-xs gap-2 shadow-sm text-white bg-slate-900 hover:bg-slate-800"
          >
            <Printer className="size-4" /> Imprimir / Salvar em PDF
          </Button>
        </div>

        {/* Card Principal do Guia / Flyer */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden print:shadow-none print:border-none print:rounded-none">
          
          {/* Header Visual */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-8 md:p-10 relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 size-60 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider text-emerald-400 border border-white/10">
                <Sparkles className="size-3.5" /> Guia Oficial do Líder de GC
              </div>

              <h1 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tight leading-none text-white">
                Como Enviar o Relatório de Célula no WhatsApp
              </h1>

              <p className="text-slate-300 text-sm font-medium leading-relaxed">
                Tudo o que você precisa saber para registrar as presenças, visitantes e bênçãos do seu GC em menos de <strong>1 minuto</strong>.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-400 font-bold">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Clock className="size-4" /> Rápido e Sem Senhas
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 text-blue-400">
                  <Smartphone className="size-4" /> 100% no WhatsApp
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <ShieldCheck className="size-4" /> Integrado à Pastoral
                </span>
              </div>
            </div>
          </div>

          {/* Seção 1: Por que mudamos? */}
          <div className="p-8 md:p-10 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <HeartHandshake className="size-4 text-primary" /> Por que estamos usando o WhatsApp?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="size-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm">
                  1
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Sem Aplicativos Pesados</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Você não precisa baixar nada nem memorizar senhas. A mensagem chega no seu próprio WhatsApp.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="size-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm">
                  2
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Pastores e Supervisores Conectados</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Assim que você responde, os pedidos de oração e novas decisões chegam imediatamente à liderança da igreja.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="size-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-sm">
                  3
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Líder e Secretário Compartilham</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Tanto o líder quanto o(a) secretário(a) podem preencher a chamada se um estiver ocupado.
                </p>
              </div>
            </div>
          </div>

          {/* Seção 2: Passo a Passo Prático */}
          <div className="p-8 md:p-10 space-y-8">
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
              <Send className="size-5 text-primary" /> Passo a Passo: Seu Envio em 6 Passos Rápidos
            </h2>

            <div className="space-y-6">
              
              {/* Passo 1 */}
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <div className="size-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-base shrink-0">
                  1
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-sm uppercase text-slate-900">Mensagem Semanal</h3>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-500">Automático</Badge>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    No dia do seu GC ou no dia seguinte, o bot enviará uma mensagem perguntando: <em>"Aconteceu a reunião esta semana?"</em>.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Basta clicar em <strong>[Sim]</strong> ou <strong>[Não]</strong> (se foi adiada ou cancelada, basta informar o motivo).
                  </p>
                </div>
              </div>

              {/* Passo 2 */}
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <div className="size-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-base shrink-0">
                  2
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-sm uppercase text-slate-900">Marcar Presenças na Enquete</h3>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50">Chamada</Badge>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    O WhatsApp exibirá a lista dos membros do seu GC em formato de enquete. Toque no nome de quem esteve <strong>PRESENTE</strong>.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Ao terminar, clique no botão <strong>[Concluir Chamada]</strong> ou envie <strong>OK</strong>.
                  </p>
                </div>
              </div>

              {/* Passo 3 (NOVIDADE: CONFIRMAÇÃO) */}
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-xs">
                <div className="size-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-base shrink-0">
                  3
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-sm uppercase text-emerald-950 flex items-center gap-1.5">
                      <Sparkles className="size-4 text-emerald-600" /> Resumo Imediato: Avançar ou Refazer
                    </h3>
                    <Badge className="text-[10px] uppercase font-black bg-emerald-600 text-white border-none">Novidade</Badge>
                  </div>
                  <p className="text-xs text-emerald-900 font-medium">
                    O bot mostrará a contagem e os nomes de quem ficou como <strong>Presente</strong> e quem ficou como <strong>Ausente</strong>.
                  </p>
                  <p className="text-[11px] text-emerald-800">
                    Se estiver tudo certo, aperte <strong>[Avançar ➡️]</strong>. Se esqueceu alguém, aperte <strong>[Refazer Chamada 🔄]</strong> para marcar novamente!
                  </p>
                </div>
              </div>

              {/* Passo 4 */}
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <div className="size-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-base shrink-0">
                  4
                </div>
                <div className="space-y-1.5 flex-1">
                  <h3 className="font-black text-sm uppercase text-slate-900">Lição, Visitantes e Conversões</h3>
                  <p className="text-xs text-slate-600 font-medium">
                    O bot pedirá 3 informações rápidas:
                  </p>
                  <ul className="text-xs text-slate-500 list-disc pl-4 space-y-0.5">
                    <li><strong>Lição:</strong> Digite o título ou tema ministrado.</li>
                    <li><strong>Visitantes:</strong> Digite o nome dos visitantes ou envie <strong>0</strong> se não houve.</li>
                    <li><strong>Decisões:</strong> Quantas reconciliações ou decisões por Cristo aconteceram (ex: 0, 1, 2).</li>
                  </ul>
                </div>
              </div>

              {/* Passo 5 */}
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <div className="size-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-base shrink-0">
                  5
                </div>
                <div className="space-y-1.5 flex-1">
                  <h3 className="font-black text-sm uppercase text-slate-900">Feedback ao Supervisor</h3>
                  <p className="text-xs text-slate-600 font-medium">
                    Deixe um pedido de oração, elogio ou recado pastoral para seu supervisor. Se não quiser escrever nada, basta clicar em <strong>[Pular Feedback]</strong>.
                  </p>
                </div>
              </div>

              {/* Passo 6 (NOVIDADE: RESUMO FINAL) */}
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-blue-50/70 border border-blue-200 shadow-xs">
                <div className="size-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-base shrink-0">
                  6
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-sm uppercase text-blue-950 flex items-center gap-1.5">
                      <CheckCircle2 className="size-4 text-blue-600" /> Confirmação Final do Relatório
                    </h3>
                    <Badge className="text-[10px] uppercase font-black bg-blue-600 text-white border-none">Segurança</Badge>
                  </div>
                  <p className="text-xs text-blue-900 font-medium">
                    Antes de finalizar, o bot apresenta a ficha completa consolidada. Toque em <strong>[Confirmar e Enviar ✅]</strong> e pronto!
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Destaque Bônus: Comando /editar */}
          <div className="p-8 md:p-10 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-y border-amber-200">
            <div className="flex items-start gap-4">
              <div className="size-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-xl shrink-0 shadow-md">
                💡
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black uppercase text-amber-950">
                    Comando Especial: Errou algo ou quer corrigir?
                  </h3>
                  <Badge className="bg-amber-600 text-white border-none text-[10px] font-black uppercase">Dica de Ouro</Badge>
                </div>
                <p className="text-xs text-amber-900 font-medium leading-relaxed">
                  Se você já enviou o relatório mas percebeu que esqueceu de marcar um membro ou digitou algo errado, não se preocupe: basta enviar a palavra <strong>/editar</strong> ou <strong>editar reunião</strong> no WhatsApp!
                </p>
                <p className="text-xs text-amber-800">
                  O bot buscará o último relatório do seu GC e permitirá que você refaça o lançamento, atualizando o sistema automaticamente sem duplicar dados.
                </p>
              </div>
            </div>
          </div>

          {/* FAQ Rápido */}
          <div className="p-8 md:p-10 space-y-6">
            <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">
              Perguntas Frequentes dos Líderes
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-1.5">
                <h4 className="font-bold text-xs text-slate-900">
                  ❓ Entrou um membro novo ou alguém mudou de GC. Como atualizo?
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Comunique seu supervisor de área ou acesse o menu de Células no sistema para vincular o novo participante ao seu GC. No início de cada mês o bot também enviará um lembrete para checagem da lista!
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-1.5">
                <h4 className="font-bold text-xs text-slate-900">
                  ❓ O bot travou ou demorou a responder. O que fazer?
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Basta digitar <strong>/reiniciar</strong> no chat do WhatsApp. A sessão atual será resetada e o bot recomeçará as perguntas imediatamente.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-1.5">
                <h4 className="font-bold text-xs text-slate-900">
                  ❓ O secretário pode preencher no meu lugar?
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Sim! Desde que o número do(a) secretário(a) esteja cadastrado na sua célula no Oiko, ele(a) receberá o fluxo e poderá preencher com a mesma facilidade.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-1.5">
                <h4 className="font-bold text-xs text-slate-900">
                  ❓ O que acontece se a reunião não aconteceu?
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Basta responder <strong>[Não]</strong>. O bot perguntará se a reunião foi <strong>Adiada</strong> (perguntando o novo dia para cobrar depois) ou <strong>Cancelada</strong> (registrando o motivo para o supervisor).
                </p>
              </div>
            </div>
          </div>

          {/* Rodapé do Guia */}
          <div className="p-6 bg-slate-900 text-white text-center rounded-b-3xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <p className="text-slate-400 font-medium">
              Igreja Batista da Manhã • Coordenação de Células & Tecnologia Oiko
            </p>
            <p className="font-bold text-slate-300">
              Dúvidas? Fale com a equipe de apoio pastoral.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
