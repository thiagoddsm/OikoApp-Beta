'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Play, Pause, RotateCcw, Copy, Check, ArrowLeft, 
  Clock, BookOpen, Heart, Sparkles, ChevronDown, ChevronUp,
  MessageCircle, Lightbulb
} from 'lucide-react';

export default function RoteiroEncontro1Page() {
  // Passos abertos
  const [openSteps, setOpenSteps] = useState<Record<number, boolean>>({
    1: true,
    2: false,
    3: true,
    4: false,
  });

  // Checkboxes de conclusão
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({
    1: false,
    2: false,
    3: false,
    4: false,
  });

  // Tamanho de fonte: 0 = normal (sm/base), 1 = grande (base/lg), 2 = extra grande (lg/xl)
  const [fontScale, setFontScale] = useState<number>(0);

  // Cronômetro
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Notas do líder
  const [notes, setNotes] = useState<string>('');
  const [noteStatus, setNoteStatus] = useState<string>('Automático');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Carregar notas salvas
    const saved = localStorage.getItem('discipulado_batismo_e1_notes');
    if (saved) setNotes(saved);
  }, []);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    setNoteStatus('Salvando...');
    localStorage.setItem('discipulado_batismo_e1_notes', val);
    setTimeout(() => {
      setNoteStatus('Salvo ✓');
    }, 400);
  };

  // Timer logic
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setSecondsElapsed(prev => prev + 1);
      }, 1000);
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning]);

  const toggleTimer = () => setIsTimerRunning(prev => !prev);
  const resetTimer = () => {
    setIsTimerRunning(false);
    setSecondsElapsed(0);
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleStep = (stepNumber: number) => {
    setOpenSteps(prev => ({ ...prev, [stepNumber]: !prev[stepNumber] }));
  };

  const toggleStepCompleted = (stepNumber: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedSteps(prev => {
      const next = { ...prev, [stepNumber]: !prev[stepNumber] };
      const count = Object.values(next).filter(Boolean).length;
      if (count === 4) {
        showToast('🎉 Parabéns! Encontro 1 concluído.');
      }
      return next;
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const copyText = (ref: string, text: string) => {
    navigator.clipboard.writeText(`${ref} - ${text}`);
    showToast(`Texto de ${ref} copiado!`);
  };

  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const progressPercent = (completedCount / 4) * 100;

  // Font scale classes
  const fontClass = fontScale === 0 ? 'text-sm' : fontScale === 1 ? 'text-base' : 'text-lg';
  const headingClass = fontScale === 0 ? 'text-sm' : fontScale === 1 ? 'text-base' : 'text-lg font-bold';

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between pb-28 selection:bg-amber-500 selection:text-slate-950 font-sans`}>
      
      {/* HEADER FIXO COMPACTO */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link 
              href="/dashboard/engajamento/jornada" 
              className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
              title="Voltar para Jornada"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  ENCONTRO 1
                </span>
                <span className="text-[11px] text-slate-400 font-medium">45-60 min</span>
              </div>
              <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight mt-0.5 truncate max-w-[190px] sm:max-w-xs">
                Você entende a sua decisão?
              </h1>
            </div>
          </div>

          {/* Controles: Fonte e Cronômetro */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setFontScale(prev => (prev + 1) % 3)}
              className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300 active:scale-95 transition-all text-xs font-bold"
              title="Ajustar tamanho da fonte"
            >
              {fontScale === 0 ? 'A+' : fontScale === 1 ? 'A++' : 'A-'}
            </button>

            <button 
              onClick={toggleTimer}
              className="h-9 px-2.5 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center gap-1.5 text-xs font-semibold text-slate-200 active:scale-95 transition-all"
            >
              <Clock className={`w-3.5 h-3.5 text-amber-400 ${isTimerRunning ? 'animate-pulse' : ''}`} />
              <span className="font-mono">{formatTimer(secondsElapsed)}</span>
            </button>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="max-w-md mx-auto mt-2.5">
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-amber-500 h-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL (OTIMIZADO PARA POLEGAR) */}
      <main className="max-w-md mx-auto w-full px-4 pt-4 space-y-3.5 flex-1">
        
        {/* Card de Boas-Vindas & Postura do Líder */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800/80 to-slate-900 border border-slate-700/60 rounded-2xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs uppercase font-extrabold tracking-wider text-amber-400">Postura do Líder</h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Deixe o novo convertido falar a maior parte do tempo. Seja apenas um mediador que traz acolhimento e direciona a sua vida. Nós não estamos aqui para cobrar e sim para conduzir.
              </p>
            </div>
          </div>
        </div>

        {/* PASSO 1: ABERTURA COM ORAÇÃO */}
        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden transition-all duration-200">
          <div 
            className="p-4 flex items-center justify-between cursor-pointer select-none"
            onClick={() => toggleStep(1)}
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center border border-slate-700">
                1
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Abertura com Oração</h3>
                <p className="text-[11px] text-slate-400">3 a 5 minutos • Acolhimento</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <input 
                type="checkbox"
                checked={completedSteps[1]}
                onChange={() => {}}
                onClick={(e) => toggleStepCompleted(1, e)}
                className="w-4 h-4 rounded text-amber-500 bg-slate-800 border-slate-700 focus:ring-0 cursor-pointer accent-amber-500"
              />
              {openSteps[1] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
          </div>

          {openSteps[1] && (
            <div className="px-4 pb-4 border-t border-slate-800/80 pt-3 space-y-3">
              <div className="bg-amber-950/20 border border-amber-600/30 p-3.5 rounded-xl text-xs text-amber-200/90 leading-relaxed space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Oração Inicial do Líder</span>
                </div>
                <p className={fontClass}>
                  Comece a reunião com uma oração breve e calorosa, agradecendo a Deus pela oportunidade de estarem juntos ali naquele momento e convidando o Senhor para abençoar a conversa.
                </p>
                <p className="text-[11px] text-slate-400 italic bg-slate-950/40 p-2.5 rounded-lg border border-amber-500/10">
                  Exemplo: &ldquo;Senhor, muito obrigado por esta oportunidade preciosa de estarmos juntos hoje. Abençoa o nosso bate-papo, abre o nosso coração e que a Tua presença esteja conosco. Em nome de Jesus, amém!&rdquo;
                </p>
              </div>
            </div>
          )}
        </section>

        {/* PASSO 2: TESTEMUNHO DO LÍDER & DECISÃO */}
        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden transition-all duration-200">
          <div 
            className="p-4 flex items-center justify-between cursor-pointer select-none"
            onClick={() => toggleStep(2)}
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center border border-slate-700">
                2
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Seu Testemunho & Decisão</h3>
                <p className="text-[11px] text-slate-400">5 a 10 minutos • Conexão pessoal</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <input 
                type="checkbox"
                checked={completedSteps[2]}
                onChange={() => {}}
                onClick={(e) => toggleStepCompleted(2, e)}
                className="w-4 h-4 rounded text-amber-500 bg-slate-800 border-slate-700 focus:ring-0 cursor-pointer accent-amber-500"
              />
              {openSteps[2] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
          </div>

          {openSteps[2] && (
            <div className="px-4 pb-4 border-t border-slate-800/80 pt-3 space-y-3">
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">1. Sua Apresentação</span>
                <p className={`text-slate-200 leading-snug ${fontClass}`}>
                  Apresente-se contando, de forma breve e natural, <strong>como foi a sua experiência com Jesus</strong> (quem você era, como o conheceu e o que mudou na sua vida).
                </p>
                <p className="text-xs text-slate-400 italic">
                  <strong>Dica:</strong> Seja vulnerável e autêntico. Isso quebra qualquer barreira e ajuda a pessoa a se sentir à vontade para falar abertamente da própria história.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">2. Pergunta ao Novo Convertido</span>
                <p className={`font-semibold text-slate-100 ${headingClass}`}>
                  &ldquo;Você entendeu o que aconteceu com você no momento daquela decisão?&rdquo;
                </p>
                <p className="text-xs text-slate-400 italic">
                  <strong>Guia para você:</strong> Ouça atentamente sem pressa. Deixe-o expressar com suas próprias palavras como foi a experiência de entregar a vida a Cristo.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* PASSO 3: LEITURAS & REFLEXÕES */}
        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden transition-all duration-200">
          <div 
            className="p-4 flex items-center justify-between cursor-pointer select-none"
            onClick={() => toggleStep(3)}
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center">
                3
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Leituras & Reflexões</h3>
                <p className="text-[11px] text-slate-400">25 a 30 minutos • Diálogo central</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <input 
                type="checkbox"
                checked={completedSteps[3]}
                onChange={() => {}}
                onClick={(e) => toggleStepCompleted(3, e)}
                className="w-4 h-4 rounded text-amber-500 bg-slate-800 border-slate-700 focus:ring-0 cursor-pointer accent-amber-500"
              />
              {openSteps[3] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
          </div>

          {openSteps[3] && (
            <div className="px-4 pb-4 border-t border-slate-800/80 pt-3 space-y-4">
              
              {/* PARTE A: ROMANOS */}
              <div className="space-y-3">
                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      Romanos 10:9-10
                    </span>
                    <button 
                      onClick={() => copyText('Romanos 10:9-10', 'Se você confessar com a sua boca que Jesus é Senhor e crer em seu coração que Deus o ressuscitou dentre os mortos, será salvo. Pois com o coração se crê para a justiça, e com a boca se confessa para a salvação.')}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 active:scale-95 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">Façam a leitura deste texto em conjunto e em voz alta:</p>
                  <blockquote className={`text-slate-200 italic leading-relaxed border-l-2 border-amber-500 pl-3 ${fontClass}`}>
                    &ldquo;Se você confessar com a sua boca que Jesus é Senhor e crer em seu coração que Deus o ressuscitou dentre os mortos, será salvo. Pois com o coração se crê para a justiça, e com a boca se confessa para a salvação.&rdquo;
                  </blockquote>
                </div>

                <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
                  <p className={`font-semibold text-slate-100 ${headingClass}`}>
                    &ldquo;O que você entende através desse texto?&rdquo;
                  </p>
                  <p className="text-xs text-slate-400 italic">
                    <strong>Guia para você:</strong> Garanta que ele perceba que a fé não é só teoria intelectual, mas entrega de confiança e vida.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
                  <p className={`font-semibold text-slate-100 ${headingClass}`}>
                    &ldquo;Quando você pensa em Jesus, você consegue entender que Ele quer cuidar dos problemas de hoje, mas também da sua eternidade? Você está disposto a deixar Jesus direcionar as suas escolhas? Por quê?&rdquo;
                  </p>
                  <p className="text-xs text-slate-400 italic">
                    <strong>Guia para você:</strong> Mostre com amor que Jesus não é apenas um refúgio para emergências, mas o Senhor e Mestre das nossas decisões, planos e caminhos.
                  </p>
                </div>
              </div>

              {/* PARTE B: 2 CORÍNTIOS */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      2 Coríntios 5:17
                    </span>
                    <button 
                      onClick={() => copyText('2 Coríntios 5:17', 'Portanto, se alguém está em Cristo, é nova criação. As coisas antigas já passaram; eis que surgiram coisas novas!')}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 active:scale-95 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </button>
                  </div>
                  <blockquote className={`text-slate-200 italic leading-relaxed border-l-2 border-amber-500 pl-3 ${fontClass}`}>
                    &ldquo;Portanto, se alguém está em Cristo, é nova criação. As coisas antigas já passaram; eis que surgiram coisas novas!&rdquo;
                  </blockquote>
                </div>

                <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
                  <p className={`font-semibold text-slate-100 ${headingClass}`}>
                    &ldquo;Hoje o seu passado te aprisiona? Como vencer isso?&rdquo;
                  </p>
                  <p className="text-xs text-slate-400 italic">
                    <strong>Guia para você:</strong> Firme a certeza de que a condenação do passado foi cravada na cruz. Vencemos a culpa firmando nossa mente no perdão e na verdade de que somos uma nova criação.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
                  <p className={`font-semibold text-slate-100 ${headingClass}`}>
                    &ldquo;Se um amigo ou parente te perguntar o motivo dessa decisão, o que você responderia?&rdquo;
                  </p>
                  <p className="text-xs text-slate-400 italic">
                    <strong>Guia para você:</strong> Incentive-o a expressar sem receios sua nova identidade e a razão de ter colocado sua esperança em Cristo.
                  </p>
                </div>
              </div>

            </div>
          )}
        </section>

        {/* PASSO 4: FECHAMENTO DO LÍDER */}
        <section className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden transition-all duration-200">
          <div 
            className="p-4 flex items-center justify-between cursor-pointer select-none"
            onClick={() => toggleStep(4)}
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center">
                4
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Fechamento do Líder</h3>
                <p className="text-[11px] text-slate-400">5 a 7 minutos • Encorajamento e Oração</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <input 
                type="checkbox"
                checked={completedSteps[4]}
                onChange={() => {}}
                onClick={(e) => toggleStepCompleted(4, e)}
                className="w-4 h-4 rounded text-amber-500 bg-slate-800 border-slate-700 focus:ring-0 cursor-pointer accent-amber-500"
              />
              {openSteps[4] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
          </div>

          {openSteps[4] && (
            <div className="px-4 pb-4 border-t border-slate-800/80 pt-3 space-y-3">
              <div className="bg-emerald-950/25 border border-emerald-500/30 p-3.5 rounded-xl text-xs text-emerald-200 leading-relaxed space-y-2">
                <span className="text-emerald-400 font-bold block text-sm flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4" />
                  Palavra de Fechamento:
                </span>
                <p className={`text-slate-200 ${fontClass}`}>
                  Encerre com uma palavra amarrando tudo o que a pessoa compartilhou ao longo da conversa.
                </p>
                <div className="p-3 bg-slate-950/60 rounded-lg border border-emerald-500/20 text-slate-200 space-y-1.5">
                  <p className="font-medium text-emerald-300">Ponto central para reforçar:</p>
                  <p className={fontClass}>
                    Mostre para ela que <strong>tudo o que ela viveu até aqui é necessário para a construção de quem ela é</strong>, e que <strong>Jesus tem todo o poder para tratar as feridas do coração dela</strong>, capacitando-a para enfrentar qualquer batalha que vier pela frente.
                  </p>
                </div>
              </div>

              <div className={`bg-slate-950/60 border border-slate-800 p-3 rounded-xl text-slate-300 ${fontClass}`}>
                <strong className="text-amber-400">Oração Final:</strong> Ore abençoando a vida dela, profetizando cura no coração, força para as decisões diárias e paz nessa nova caminhada com Jesus.
              </div>
            </div>
          )}
        </section>

        {/* BLOCO DE ANOTAÇÃO RÁPIDA (LOCALSTORAGE) */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="leaderNotes" className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <span>📝</span> Anotações do Líder (Salvo no celular)
            </label>
            <span className="text-[10px] text-slate-400">{noteStatus}</span>
          </div>
          <textarea 
            id="leaderNotes" 
            rows={3}
            value={notes}
            onChange={handleNotesChange}
            placeholder="Escreva aqui pedidos de oração, pontos sobre o passado ou reflexões para o próximo encontro..." 
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </section>

      </main>

      {/* BARRA DE AÇÃO INFERIOR FIXA */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-4 py-2.5">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleTimer}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold active:scale-95 transition-all shadow-sm flex items-center gap-1.5 ${
                isTimerRunning ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-950'
              }`}
            >
              {isTimerRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pausar</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>{secondsElapsed > 0 ? 'Retomar' : 'Iniciar'}</span>
                </>
              )}
            </button>

            <button 
              onClick={resetTimer}
              className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium active:scale-95 transition-all hover:text-white"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-400 block font-medium">
              {completedCount} de 4 etapas
            </span>
            <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
              {progressPercent === 100 ? '✅ Concluído' : 'Em andamento'}
            </span>
          </div>
        </div>
      </footer>

      {/* TOAST FLUTUANTE */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-slate-800 text-white border border-amber-500/50 text-xs px-4 py-2 rounded-full shadow-2xl z-50 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check className="w-3.5 h-3.5 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
