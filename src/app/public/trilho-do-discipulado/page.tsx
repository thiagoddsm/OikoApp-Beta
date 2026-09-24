'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { 
  Leaf, 
  Armchair, 
  UtensilsCrossed, 
  Handshake, 
  BookOpen, 
  Heart, 
  Users, 
  Shield, 
  Rocket, 
  MonitorPlay, 
  UserCheck,
  ChevronRight,
  MessageCircle,
  GraduationCap
} from 'lucide-react';

export default function TrilhoDiscipuladoPage() {
  // Efeito de reveal on scroll idêntico ao do GC
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-surface selection:bg-primary/20 pb-20 md:pb-0">
      
      {/* 1. HERO SECTION */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden flex items-center justify-center min-h-[80vh]">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-surface-container/50 -z-10" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] -z-10 translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-[80px] -z-10 -translate-x-1/4 translate-y-1/4" />

        <div className="max-w-5xl mx-auto px-6 text-center reveal-on-scroll" style={{ opacity: 0, transform: 'translateY(25px)', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs tracking-[0.2em] uppercase mb-8 shadow-sm">
            <GraduationCap className="w-4 h-4" /> Academia Lumine • Trilha do Discipulado
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-black text-on-surface tracking-tight mb-6 leading-[1.1]">
            Mudar a cidade <br className="hidden md:block" />
            <span className="text-primary italic">através do discipulado.</span>
          </h1>
          <p className="text-lg md:text-xl text-on-surface-variant font-body max-w-3xl mx-auto mb-10 leading-relaxed">
            Descubra o seu propósito e desenvolva o caráter de Cristo através de uma jornada de aprendizado, comunhão e serviço na Igreja Batista da Manhã.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Link 
              href="/public/enrollment?utm_source=academia_lumine" 
              className="bg-primary hover:bg-primary/90 text-white font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 flex items-center gap-2 w-full sm:w-auto justify-center text-lg"
            >
              Garantir Minha Vaga no Próximo Ciclo <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant bg-white px-5 py-2.5 rounded-full border border-outline-variant/30 shadow-sm">
            <Shield className="w-4 h-4 text-secondary shrink-0" />
            <span className="text-left sm:text-center">Formação ministerial com acompanhamento discipulador humano.</span>
          </div>
        </div>
      </section>

      {/* 2. A VISÃO DA CASA */}
      <section className="py-24 bg-white border-y border-outline-variant/20 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 reveal-on-scroll" style={{ opacity: 0, transform: 'translateY(25px)', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <h2 className="text-3xl md:text-4xl font-display font-black tracking-tight mb-4 text-on-surface">A Visão da Casa</h2>
            <p className="text-on-surface-variant font-body text-lg leading-relaxed">
              Na IBM, utilizamos a figura de uma casa para ilustrar o processo natural do discipulado. Entendemos que ninguém foi chamado para morar na varanda. A nossa igreja é uma Igreja EM Células, onde cada ambiente representa uma fase do seu crescimento:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Varanda */}
            <div className="bg-surface-container rounded-3xl p-8 border border-outline-variant/20 hover:border-primary/30 transition-all hover:-translate-y-1 reveal-on-scroll apple-shadow group" style={{ opacity: 0, transform: 'translateY(25px)', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)', transitionDelay: '0ms' }}>
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform">
                <Leaf className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold font-display text-on-surface mb-2">A Varanda <br/><span className="text-emerald-600 font-black text-lg">(Iluminar)</span></h3>
              <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-4">Onde tudo começa.</p>
              <p className="text-on-surface-variant mb-6 leading-relaxed flex-1">
                Ambiente de evangelização, acolhimento e primeiro contato para um novo começo.
              </p>
              <div className="bg-white p-4 rounded-xl border border-outline-variant/30 mt-auto">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Cursos</p>
                <p className="font-semibold text-on-surface">Identidade (Batismo) & Pertencer</p>
              </div>
            </div>

            {/* Sala */}
            <div className="bg-surface-container rounded-3xl p-8 border border-outline-variant/20 hover:border-primary/30 transition-all hover:-translate-y-1 reveal-on-scroll apple-shadow group" style={{ opacity: 0, transform: 'translateY(25px)', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)', transitionDelay: '100ms' }}>
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform">
                <Armchair className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold font-display text-on-surface mb-2">A Sala <br/><span className="text-blue-600 font-black text-lg">(Buscar)</span></h3>
              <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-4">Criando raízes.</p>
              <p className="text-on-surface-variant mb-6 leading-relaxed flex-1">
                Onde vivemos em família. Foco em comunhão profunda, consolidação e ativação no voluntariado.
              </p>
              <div className="bg-white p-4 rounded-xl border border-outline-variant/30 mt-auto">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Cursos</p>
                <p className="font-semibold text-on-surface">Crescer</p>
              </div>
            </div>

            {/* Cozinha */}
            <div className="bg-surface-container rounded-3xl p-8 border border-outline-variant/20 hover:border-primary/30 transition-all hover:-translate-y-1 reveal-on-scroll apple-shadow group" style={{ opacity: 0, transform: 'translateY(25px)', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)', transitionDelay: '200ms' }}>
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform">
                <UtensilsCrossed className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold font-display text-on-surface mb-2">A Cozinha <br/><span className="text-amber-600 font-black text-lg">(Mudar)</span></h3>
              <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-4">A mão na massa.</p>
              <p className="text-on-surface-variant mb-6 leading-relaxed flex-1">
                Foco em liderança, discipulado prático e multiplicação de vidas para transformar a cidade.
              </p>
              <div className="bg-white p-4 rounded-xl border border-outline-variant/30 mt-auto">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Cursos</p>
                <p className="font-semibold text-on-surface text-sm">Cuidar, Discipular, Apoiar e Enviar</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. O TRILHO DO DISCIPULADO EM DETALHES */}
      <section className="py-24 relative overflow-hidden bg-surface">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-20 reveal-on-scroll" style={{ opacity: 0, transform: 'translateY(25px)', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <span className="text-primary font-bold tracking-widest text-xs uppercase mb-3 block">Detalhes da Academia Lumine</span>
            <h2 className="text-3xl md:text-5xl font-display font-black tracking-tight text-on-surface mb-4">O Trilho do Discipulado</h2>
            <p className="text-on-surface-variant font-body text-lg">Seis etapas claras para o seu desenvolvimento contínuo.</p>
          </div>

          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[2.25rem] md:before:ml-[50%] before:-translate-x-px md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-outline-variant/30 before:to-transparent">
            
            {[
              { id: 1, icon: Handshake, title: "PERTENCER", obj: "Integração oficial, batismo e alinhamento com a visão da igreja.", para: "Visitantes frequentes e novos decididos.", req: "Conclusão do curso, batismo nas águas e estar ativamente inserido em um GC." },
              { id: 2, icon: BookOpen, title: "CRESCER", obj: "Aprofundar a maturidade espiritual, desenvolver a vida devocional e aprender a cultura da casa.", para: "Membros oficiais da igreja.", req: "Conclusão do curso, 7 encontros mensais de consolidação e ativação no voluntariado." },
              { id: 3, icon: Heart, title: "CUIDAR", obj: "Preparação prática para cuidar de pessoas, pastorear e acompanhar vidas no GC.", para: "Líderes em Treinamento (LTs).", req: "Conclusão do curso e estágio prático com a indicação do líder do grupo." },
              { id: 4, icon: Users, title: "DISCIPULAR", obj: "Assumir a liderança de um Grupo de Crescimento para formar novos discípulos.", para: "Futuros Líderes de GC.", req: "Conclusão do curso e avaliação baseada no perfil F.D.E. (Fiel, Disponível e Ensinável)." },
              { id: 5, icon: Shield, title: "APOIAR", obj: "Passar a cuidar de líderes, acompanhar células e contribuir para o crescimento saudável da igreja.", para: "Líderes Experientes e Supervisores.", req: "Conclusão do curso e fruto prático comprovado multiplicando um novo Líder de GC." },
              { id: 6, icon: Rocket, title: "ENVIAR", obj: "Expandir a visão da igreja, fortalecer redes e levantar novas lideranças na cidade.", para: "Coordenadores e Pastores de Rede.", req: "Conclusão do curso e indicação com alinhamento direto do Conselho Pastoral." },
            ].map((step, idx) => (
              <div key={step.id} className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group reveal-on-scroll`} style={{ opacity: 0, transform: 'translateY(25px)', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                {/* Ícone central */}
                <div className="flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full border-4 border-surface bg-white shadow-md text-primary z-10 shrink-0 md:absolute md:left-1/2 md:-translate-x-1/2 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all">
                  <step.icon className="w-5 h-5 md:w-7 md:h-7" />
                </div>
                
                {/* Card */}
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-white p-6 md:p-8 rounded-3xl border border-outline-variant/20 apple-shadow hover:shadow-lg transition-all group-hover:border-primary/30 relative">
                  {/* Flechinha indicadora para desktop */}
                  <div className={`hidden md:block absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-outline-variant/20 rotate-45 ${idx % 2 === 0 ? 'border-l border-b -left-2' : 'border-t border-r -right-2'}`} />
                  
                  <div className="flex items-center gap-3 mb-5 border-b border-outline-variant/10 pb-4">
                    <span className="text-3xl font-black text-primary/20 font-display">{step.id}.</span>
                    <h3 className="text-xl md:text-2xl font-black font-display text-on-surface">{step.title}</h3>
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm md:text-base text-on-surface-variant leading-relaxed"><strong className="text-on-surface block mb-1">Objetivo:</strong> {step.obj}</p>
                    <p className="text-sm md:text-base text-on-surface-variant leading-relaxed"><strong className="text-on-surface block mb-1">Para quem é:</strong> {step.para}</p>
                    <div className="bg-surface-container p-4 rounded-xl mt-4">
                      <p className="text-sm text-on-surface-variant"><strong className="text-on-surface block mb-1 text-xs uppercase tracking-wider text-slate-500">Requisitos:</strong> {step.req}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. A DUPLA VALIDAÇÃO */}
      <section className="py-24 bg-surface-container border-y border-outline-variant/20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="reveal-on-scroll" style={{ opacity: 0, transform: 'translateY(25px)', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
              <span className="text-secondary font-bold tracking-widest text-xs uppercase mb-3 block">O Grande Diferencial</span>
              <h2 className="text-3xl md:text-5xl font-display font-black tracking-tight text-on-surface mb-6 leading-[1.1]">
                O caráter vem <br/><span className="text-primary italic">antes da função.</span>
              </h2>
              <p className="text-lg text-on-surface-variant font-body leading-relaxed mb-8">
                Nossos cursos oferecem um preparo teológico e prático de excelência, mas eles não funcionam como uma certificação automática para liderar. A aprovação para o próximo passo no seu chamado exige o que chamamos de <strong>Dupla Validação</strong>:
              </p>
            </div>

            <div className="space-y-6 reveal-on-scroll" style={{ opacity: 0, transform: 'translateY(25px)', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)', transitionDelay: '150ms' }}>
              <div className="bg-white p-6 rounded-3xl border border-outline-variant/30 flex gap-5 apple-shadow">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                  <MonitorPlay className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-xl text-on-surface mb-2">1. Capacitação (Técnica)</h4>
                  <p className="text-on-surface-variant text-sm leading-relaxed">Acesso à Academia Lumine, conclusão de aulas, realização de treinamentos práticos e uso das ferramentas ministeriais.</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-outline-variant/30 flex gap-5 apple-shadow">
                <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                  <UserCheck className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-xl text-on-surface mb-2">2. Confirmação (Humana)</h4>
                  <p className="text-on-surface-variant text-sm leading-relaxed">Acompanhamento próximo do seu discipulador, atestando o relacionamento saudável, o caráter, a prestação de contas e os frutos gerados.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. A RÉGUA DE ENGAJAMENTO */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 text-center reveal-on-scroll" style={{ opacity: 0, transform: 'translateY(25px)', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <h2 className="text-3xl font-display font-black tracking-tight text-on-surface mb-4">Da Varanda à Cozinha: A Jornada Contínua</h2>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto mb-16">
            Ninguém cresce sozinho. O discipulado acontece de forma progressiva, e cada etapa prepara você para a próxima responsabilidade na casa de Deus.
          </p>

          <div className="flex flex-wrap justify-center items-center gap-2 md:gap-4 font-display font-bold text-base md:text-xl text-on-surface">
            {['Frequento', 'Pertenço', 'Cresço', 'Cuido', 'Discipulo', 'Apoio', 'Envio'].map((item, i, arr) => (
              <React.Fragment key={item}>
                <span className="px-5 py-3 bg-surface-container rounded-2xl border border-outline-variant/20 apple-shadow hover:bg-primary/5 transition-colors">{item}</span>
                {i < arr.length - 1 && <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-primary opacity-50 shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* 6. CHAMADA FINAL E SUPORTE */}
      <section className="py-24 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10 reveal-on-scroll" style={{ opacity: 0, transform: 'translateY(25px)', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <h2 className="text-3xl md:text-5xl font-display font-black text-white tracking-tight mb-6">
            Pronto para dar o próximo passo no seu crescimento espiritual?
          </h2>
          <p className="text-white/80 text-lg md:text-xl mb-12 max-w-2xl mx-auto">
            As vagas para o novo ciclo da Academia Lumine estão abertas. Escolha o seu módulo correspondente e faça sua inscrição agora mesmo.
          </p>
          
          <Link 
            href="/public/enrollment?utm_source=academia_lumine_bottom"
            className="inline-flex items-center justify-center gap-2 bg-white text-primary hover:bg-slate-50 font-bold py-5 px-10 rounded-full shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 text-lg mb-12 w-full sm:w-auto"
          >
            Fazer Minha Inscrição para o Ciclo 2026.2 <ChevronRight className="w-5 h-5" />
          </Link>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 bg-black/10 p-6 rounded-3xl backdrop-blur-sm border border-white/10 max-w-xl mx-auto">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-white font-bold text-lg">Dúvidas sobre qual curso escolher?</p>
              <p className="text-white/80 text-sm">Fale direto com o Agente Neemias no WhatsApp:</p>
              <a href="https://wa.me/5521997558801" target="_blank" rel="noreferrer" className="text-white font-black text-xl hover:underline mt-1 inline-block">
                (21) 99755-8801
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Helper style para as animações rodarem client-side */}
      <style dangerouslySetInnerHTML={{__html: `
        .reveal-on-scroll.active {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
      `}} />
    </div>
  );
}
