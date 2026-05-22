'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Script from 'next/script';

export default function GCPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
          }
        });
      },
      {
        threshold: 0.1,
      }
    );

    document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-surface text-on-surface selection:bg-primary/20 antialiased overflow-x-hidden min-h-screen">
      <style dangerouslySetInnerHTML={{ __html: `
        html {
          scroll-behavior: smooth;
        }
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .trellis-grid {
            background-image: linear-gradient(#e5e5e5 0.5px, transparent 0.5px), linear-gradient(90deg, #e5e5e5 0.5px, transparent 0.5px);
            background-size: 40px 40px;
        }
        .glass-card {
            background: rgba(255, 255, 255, 0.6);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .apple-shadow {
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.04);
        }
        .hero-overlay {
          background: 
            radial-gradient(circle at top left, rgba(166, 59, 0, 0.08), transparent 45%),
            radial-gradient(circle at bottom right, rgba(0, 109, 55, 0.06), transparent 40%),
            linear-gradient(to bottom, rgba(252, 249, 248, 0.6), rgba(252, 249, 248, 0.95));
        }
        .floating {
          animation: floating 6s ease-in-out infinite;
        }
        @keyframes floating {
          0% { transform: translateY(0px) }
          50% { transform: translateY(-10px) }
          100% { transform: translateY(0px) }
        }
        .reveal-on-scroll {
          opacity: 0;
          transform: translateY(25px);
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-on-scroll.active {
          opacity: 1;
          transform: translateY(0);
        }
        .glow {
          box-shadow: 0 10px 30px rgba(166, 59, 0, 0.15);
        }
      ` }} />

      {/* Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>

      {/* Tailwind CDN configuration */}
      <Script 
        src="https://cdn.tailwindcss.com?plugins=forms,container-queries" 
        strategy="afterInteractive" 
        onLoad={() => {
          const w = window as any;
          if (w.tailwind) {
            w.tailwind.config = {
              darkMode: "class",
              theme: {
                extend: {
                  "colors": {
                    "tertiary-container": "#cea700",
                    "outline": "#8d7166",
                    "surface": "#fcf9f8",
                    "on-primary-fixed-variant": "#7f2b00",
                    "on-error": "#ffffff",
                    "tertiary-fixed": "#ffe084",
                    "secondary-fixed": "#6bfe9c",
                    "surface-bright": "#fcf9f8",
                    "outline-variant": "#e1bfb3",
                    "primary": "#a63b00",
                    "on-tertiary-fixed-variant": "#574500",
                    "on-primary": "#ffffff",
                    "inverse-surface": "#313030",
                    "surface-container": "#f0edec",
                    "on-error-container": "#93000a",
                    "surface-dim": "#dcd9d9",
                    "on-secondary-fixed-variant": "#005228",
                    "on-tertiary": "#ffffff",
                    "surface-container-highest": "#e5e2e1",
                    "primary-fixed": "#ffdbce",
                    "on-secondary": "#ffffff",
                    "error": "#ba1a1a",
                    "error-container": "#ffdad6",
                    "on-background": "#1c1b1b",
                    "tertiary-fixed-dim": "#eec209",
                    "inverse-on-surface": "#f3f0ef",
                    "tertiary": "#735c00",
                    "surface-container-lowest": "#ffffff",
                    "on-surface-variant": "#594138",
                    "on-primary-fixed": "#370e00",
                    "surface-container-high": "#ebe7e7",
                    "primary-container": "#f26522",
                    "on-tertiary-container": "#4e3d00",
                    "secondary": "#006d37",
                    "secondary-container": "#6bfe9c",
                    "background": "#fcf9f8",
                    "on-primary-container": "#4f1800",
                    "surface-container-low": "#f6f3f2",
                    "secondary-fixed-dim": "#4ae183",
                    "surface-tint": "#a63b00",
                    "on-secondary-fixed": "#00210c",
                    "on-tertiary-fixed": "#231b00",
                    "on-secondary-container": "#00743a",
                    "primary-fixed-dim": "#ffb599",
                    "surface-variant": "#e5e2e1",
                    "on-surface": "#1c1b1b",
                    "inverse-primary": "#ffb599"
                  },
                  "borderRadius": {
                    "DEFAULT": "0.5rem",
                    "lg": "0.5rem",
                    "xl": "0.75rem",
                    "2xl": "1.5rem",
                    "3xl": "2rem",
                    "full": "9999px"
                  },
                  "fontFamily": {
                    "display": ["Hanken Grotesk"],
                    "body": ["Inter"]
                  }
                },
              },
            };
          }
        }}
      />

      {/* NAVBAR */}
      <header className="fixed top-0 left-0 w-full z-50 bg-surface/75 backdrop-blur-xl border-b border-outline-variant/20 shadow-[0_4px_30px_rgb(0,0,0,0.02)]">
        <div className="max-w-[1440px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center">
            {/* Logotipo escalado em 50% (h-16 no lugar de h-10) e sem o texto "IBM" */}
            <Link href="/">
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/studio-1424813022-71754.firebasestorage.app/o/C%C3%B3pia%20de%20LOGO%20IBM%20BRANCO.PNG?alt=media&token=85d35afe-f7f6-40d6-a9cd-c138c6a326fa" 
                alt="Logo IBM" 
                className="h-16 w-auto object-contain brightness-0 hover:scale-105 transition-transform"
              />
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className="text-on-surface-variant hover:text-primary transition-colors text-sm font-semibold uppercase tracking-wider hidden sm:block"
            >
              Voltar ao Início
            </Link>
            <a 
              href="https://wa.me/5521997558801"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-primary hover:opacity-90 text-white px-6 py-3 rounded-full font-bold transition-all hover:scale-105 shadow-md shadow-primary/10 text-sm"
            >
              <span>Encontrar um GC</span>
              <span className="material-symbols-outlined text-base">near_me</span>
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center overflow-hidden trellis-grid pt-20">
        <div className="absolute inset-0 hero-overlay"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 w-full">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-8 text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border-primary/20 text-primary">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>
                <span className="text-xs font-bold uppercase tracking-widest font-body">
                  Pessoas cuidando de pessoas
                </span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-extrabold leading-[1.05] text-on-surface tracking-tight">
                Você não precisa viver a fé <span className="text-primary">sozinho.</span>
              </h1>

              <p className="text-lg sm:text-xl text-on-surface-variant leading-relaxed max-w-2xl font-body">
                Os GCs da IBM são lugares onde amizades reais nascem, pessoas são cuidadas
                e a vida acontece além do domingo.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <a 
                  href="https://wa.me/5521997558801"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-primary hover:opacity-95 text-white px-8 py-4 sm:py-5 rounded-full font-bold text-base sm:text-lg transition-all hover:scale-105 shadow-lg shadow-primary/20 text-center flex items-center justify-center gap-3"
                >
                  <span>Quero conhecer um GC</span>
                  <span className="material-symbols-outlined">chat</span>
                </a>
                <a 
                  href="#como-funciona"
                  className="glass-card hover:bg-white px-8 py-4 sm:py-5 rounded-full font-bold text-base sm:text-lg transition-all text-on-surface border border-outline-variant/50 text-center flex items-center justify-center"
                >
                  Como funciona?
                </a>
              </div>
            </div>

            <div className="lg:col-span-5 relative hidden lg:block">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white rotate-2 hover:rotate-0 transition-all duration-500">
                <img
                  src="https://live.staticflickr.com/65535/55103975739_f1e1c478f7_b.jpg"
                  className="w-full h-auto object-cover"
                  alt="Comunidade IBM"
                />
              </div>
              <div className="absolute -bottom-8 -left-8 glass-card p-6 rounded-3xl max-w-xs floating border border-primary/10 shadow-lg">
                <p className="text-base font-semibold leading-relaxed text-on-surface italic font-body">
                  “Aqui, ninguém caminha sozinho.”
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DOR / BENEFICIOS */}
      <section className="py-24 bg-surface-container/30 relative overflow-hidden border-t border-b border-outline-variant/10">
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20 reveal-on-scroll">
            <span className="text-primary uppercase tracking-[0.25em] text-xs font-extrabold font-body">
              Talvez você esteja procurando...
            </span>
            <h2 className="text-3xl sm:text-5xl font-display font-bold text-on-surface mt-4 tracking-tight">
              Um lugar para <span className="text-secondary">pertencer.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 reveal-on-scroll">
            {[
              { icon: '🤝', title: 'Amigos Reais', desc: 'Pessoas que caminham com você além do culto vivendo uma comunhão profunda — koinonia.' },
              { icon: '🙏', title: 'Apoio Espiritual', desc: 'Um ambiente seguro para oração, cuidado mútuo e compartilhamento da palavra.' },
              { icon: '☕', title: 'Vida Compartilhada', desc: 'Conversas leves, cafés, risadas, momentos de lazer e conexão sincera.' },
              { icon: '🌱', title: 'Crescimento', desc: 'Cresça na fé de forma prática e saudável, aplicando as Escrituras na sua rotina.' }
            ].map((item, i) => (
              <div key={i} className="glass-card rounded-3xl p-8 apple-shadow border border-outline-variant/20 hover:scale-[1.02] transition-transform">
                <div className="text-4xl mb-6">{item.icon}</div>
                <h3 className="text-lg sm:text-xl font-bold text-on-surface mb-3 font-display">{item.title}</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed font-body">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EXPERIÊNCIA / COMO FUNCIONA */}
      <section id="como-funciona" className="py-24 relative overflow-hidden trellis-grid">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-12 gap-16 items-center">
            <div className="lg:col-span-6 space-y-6 text-left reveal-on-scroll">
              <span className="text-secondary uppercase tracking-[0.25em] text-xs font-extrabold font-body">
                Funcionamento
              </span>
              <h2 className="text-3xl sm:text-5xl font-display font-bold text-on-surface tracking-tight">
                Mais que uma reunião. <span className="text-primary">Uma família.</span>
              </h2>
              <p className="text-on-surface-variant text-base sm:text-lg leading-relaxed font-body">
                Na IBM, não somos apenas uma igreja com células. Somos uma <strong>Igreja EM células</strong>.<br /><br />
                Acreditamos em uma igreja viva durante a semana, e o GC (Grupo de Crescimento) é o coração do nosso cuidado pastoral e discipulado.
              </p>

              <div className="space-y-4 pt-6">
                {[
                  { icon: 'home', title: 'Reuniões nas casas', desc: 'Louvor, conversa, aplicação prática da Bíblia e lanche em um ambiente acolhedor.' },
                  { icon: 'forum', title: 'Conexão semanal', desc: 'O relacionamento continua no dia a dia, com suporte em oração e amizade constante.' },
                  { icon: 'rocket_launch', title: 'Jornada de discipulado', desc: 'De alguém que é cuidado para alguém que aprende a cuidar e liderar outros.' }
                ].map((step, idx) => (
                  <div key={idx} className="glass-card rounded-2xl p-5 border border-outline-variant/30 flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-xl">{step.icon}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-on-surface text-base font-display">{step.title}</h4>
                      <p className="text-on-surface-variant text-xs mt-1 font-body leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6 reveal-on-scroll relative">
              <div className="relative rounded-[32px] overflow-hidden shadow-2xl border-8 border-white">
                <img
                  src="https://live.staticflickr.com/65535/55103975739_f1e1c478f7_b.jpg"
                  className="w-full h-auto object-cover"
                  alt="Grupo de crescimento IBM"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BAIRROS & MAPA */}
      <section className="py-24 bg-surface-container/50 relative overflow-hidden border-t border-outline-variant/20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <span className="uppercase tracking-[0.25em] text-xs font-extrabold text-primary font-body">
            Temos um GC perto de você
          </span>
          <h2 className="text-3xl sm:text-5xl font-display font-bold text-on-surface mt-4 tracking-tight">
            GCs espalhados por <span className="text-primary">São Gonçalo.</span>
          </h2>
          <p className="text-on-surface-variant text-base mt-4 max-w-2xl mx-auto font-body">
            Temos grupos focados em diferentes idades e fases da vida espalhados por toda a cidade.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mt-10 reveal-on-scroll">
            {["ALCÂNTARA", "COLUBANDÊ", "GALO BRANCO", "ITAÚNA", "JARDIM CATARINA", "LARANJAL", "MONJOLOS", "MUTONDO", "MUTUÁ", "PORTO NOVO", "SÃO MIGUEL", "TRINDADE"].map((bairro) => (
              <span 
                key={bairro} 
                className="bg-white/80 border border-outline-variant/40 px-5 py-2.5 rounded-full text-xs font-bold text-on-surface-variant apple-shadow"
              >
                {bairro}
              </span>
            ))}
          </div>

          <div className="mt-16 glass-card rounded-[32px] overflow-hidden shadow-2xl border border-outline-variant/40 max-w-5xl mx-auto reveal-on-scroll">
            <iframe 
              src="https://gestaoweb.eklesiaonline.com.br/mapas/pgs/Q6Ob"  
              name="iframe-celula" 
              scrolling="no" 
              frameBorder="0" 
              marginHeight={0} 
              marginWidth={0} 
              className="w-full h-[500px] sm:h-[650px] border-0"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </section>

      {/* SEU PRÓXIMO PASSO */}
      <section className="py-24 relative overflow-hidden trellis-grid">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16 reveal-on-scroll">
            <span className="text-secondary uppercase tracking-[0.25em] text-xs font-extrabold font-body">
              Como fazer parte?
            </span>
            <h2 className="text-3xl sm:text-5xl font-display font-bold text-on-surface mt-4 tracking-tight">
              Seu próximo passo.
            </h2>
          </div>

          <div className="grid gap-6 reveal-on-scroll">
            {[
              { num: '1', title: 'Chame no WhatsApp', desc: 'Nossa equipe de recepção vai conversar com você para entender sua localização e fase de vida.', color: 'bg-primary text-white' },
              { num: '2', title: 'Conecte-se com o líder', desc: 'Indicaremos um GC ideal e te colocaremos em contato direto com o líder para tirar dúvidas.', color: 'bg-secondary text-white' },
              { num: '3', title: 'Faça uma visita livre', desc: 'Participe de uma reunião na casa sem compromisso ou pressão. Apenas venha e conheça as pessoas.', color: 'bg-tertiary-container text-white' }
            ].map((step, i) => (
              <div key={i} className="glass-card rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start border border-outline-variant/35 shadow-sm">
                <div className={`w-12 h-12 rounded-2xl ${step.color} font-display font-black flex items-center justify-center text-xl shrink-0`}>
                  {step.num}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-on-surface mb-2 font-display">{step.title}</h3>
                  <p className="text-on-surface-variant text-sm sm:text-base leading-relaxed font-body">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 relative overflow-hidden bg-primary/5 border-t border-outline-variant/10 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-display font-extrabold text-on-surface leading-tight mb-8">
            Sua vida não foi feita para ser vivida sozinho.
          </h2>
          <p className="text-lg text-on-surface-variant leading-relaxed max-w-xl mx-auto font-body">
            Sempre existe um GC e uma família de fé de portas abertas esperando por você.
          </p>
          <a 
            href="https://wa.me/5521997558801"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 mt-10 bg-primary hover:opacity-95 text-white px-10 py-5 rounded-full font-black text-lg transition-all hover:scale-105 shadow-xl shadow-primary/20"
          >
            <span>Quero encontrar meu GC</span>
            <span className="material-symbols-outlined">near_me</span>
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-surface py-16 border-t border-outline-variant/20">
        <div className="max-w-[1440px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-12">
            <div className="md:col-span-5 space-y-4">
              <span className="font-display font-bold text-2xl text-on-surface tracking-tight block">
                IGREJA BATISTA DA MANHÃ
              </span>
              <p className="font-body text-sm text-on-surface-variant leading-relaxed max-w-sm">
                Mudar a cidade através do discipulado. Nossa missão é refletir a luz da manhã em cada coração gonçalense.
              </p>
            </div>
            
            <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
              <div className="flex flex-col gap-4">
                <span className="font-display text-xs uppercase tracking-widest text-primary font-bold">SOBRE</span>
                <a className="text-sm font-body text-on-surface-variant hover:text-primary transition-colors" href="#">Quem Somos</a>
                <a className="text-sm font-body text-on-surface-variant hover:text-primary transition-colors" href="#">Nossa Liderança</a>
              </div>
              <div className="flex flex-col gap-4">
                <span className="font-display text-xs uppercase tracking-widest text-primary font-bold">IGREJA</span>
                <Link className="text-sm font-body text-on-surface-variant hover:text-primary transition-colors" href="/gc">Células (GC)</Link>
                <Link className="text-sm font-body text-on-surface-variant hover:text-primary transition-colors" href="/enrollment">Escola Lumine</Link>
              </div>
              <div className="flex flex-col gap-4">
                <span className="font-display text-xs uppercase tracking-widest text-primary font-bold">CONECTE</span>
                <a className="text-sm font-body text-on-surface-variant hover:text-primary transition-colors" href="https://wa.me/5521997558801" target="_blank" rel="noopener noreferrer">WhatsApp</a>
                <a className="text-sm font-body text-on-surface-variant hover:text-primary transition-colors" href="#" target="_blank" rel="noopener noreferrer">Instagram</a>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-outline-variant/10 text-center flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-xs text-on-surface-variant/60 font-body">
              © {new Date().getFullYear()} IBM — Experiência GC. Todos os direitos reservados.
            </div>
            <div className="text-xs text-on-surface-variant/40 font-body">
              Desenvolvido com excelência
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
