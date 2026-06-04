'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Script from 'next/script';

export default function QuemSomosPage() {
  const openNeemiasWidget = () => {
    const fab = document.querySelector('#chatbot-fab') as HTMLElement;
    if (fab) {
      fab.click();
    } else {
      window.open("https://widget.endless.zaia.app/widget/channel/d6aff9b1-6d05-42c6-8f16-20a13ee7d7c0?theme=dark&locale=pt-BR", "_blank");
    }
  };

  useEffect(() => {
    // Reveal on scroll logic
    const observerOptions = {
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, observerOptions);

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach(el => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="bg-surface text-on-surface selection:bg-primary/20 antialiased overflow-x-hidden min-h-screen">
      {/* Custom styles & styles for Neemias widget */}
      <style dangerouslySetInnerHTML={{ __html: `
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
        .reveal-on-scroll {
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-on-scroll.active {
            opacity: 1;
            transform: translateY(0);
        }
        .timeline-card {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .timeline-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
        }
        #chatbot-fab {
            display: none !important;
        }
      ` }} />
      
      {/* Fonts and widget stylesheet */}
      <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
      <link rel="stylesheet" href="https://widget.endless.zaia.app/script/style.css" />

      {/* Tailwind CDN for runtime compilation of this custom template */}
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
                    "DEFAULT": "0.25rem",
                    "lg": "0.5rem",
                    "xl": "0.75rem",
                    "2xl": "1.5rem",
                    "full": "9999px"
                  },
                  "spacing": {
                    "section-gap": "80px",
                    "container-margin": "24px",
                    "gutter": "16px",
                    "base": "8px"
                  },
                  "fontFamily": {
                    "display-lg": ["Hanken Grotesk"],
                    "label-sm": ["Inter"],
                    "display-lg-mobile": ["Hanken Grotesk"],
                    "body-lg": ["Inter"],
                    "label-md": ["Inter"],
                    "headline-sm": ["Hanken Grotesk"],
                    "headline-md": ["Hanken Grotesk"],
                    "body-md": ["Inter"]
                  },
                  "fontSize": {
                    "display-lg": ["48px", {"lineHeight": "1.1", "letterSpacing": "-0.03em", "fontWeight": "700"}],
                    "label-sm": ["12px", {"lineHeight": "1", "fontWeight": "600"}],
                    "display-lg-mobile": ["36px", {"lineHeight": "1.2", "letterSpacing": "-0.02em", "fontWeight": "700"}],
                    "body-lg": ["18px", {"lineHeight": "1.6", "fontWeight": "400"}],
                    "label-md": ["14px", {"lineHeight": "1", "letterSpacing": "0.01em", "fontWeight": "500"}],
                    "headline-sm": ["24px", {"lineHeight": "1.3", "fontWeight": "600"}],
                    "headline-md": ["32px", {"lineHeight": "1.2", "letterSpacing": "-0.01em", "fontWeight": "600"}],
                    "body-md": ["16px", {"lineHeight": "1.5", "fontWeight": "400"}]
                  }
                },
              },
            };
          }
        }}
      />

      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 bg-surface/70 backdrop-blur-xl border-b border-outline-variant/20 shadow-[0_4px_30px_rgb(0,0,0,0.03)]">
        <div className="flex justify-between items-center max-w-[1440px] mx-auto px-container-margin h-20">
          <div className="flex items-center">
            <Link href="/">
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/studio-1424813022-71754.firebasestorage.app/o/C%C3%B3pia%20de%20LOGO%20IBM%20BRANCO.PNG?alt=media&token=85d35afe-f7f6-40d6-a9cd-c138c6a326fa" 
                alt="Logo IBM" 
                className="h-10 w-auto object-contain brightness-0 cursor-pointer"
              />
            </Link>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <Link className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant hover:text-primary transition-all" href="/#jornada">Jornada</Link>
            <Link className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant hover:text-primary transition-all" href="/#igreja-em-celulas">Igreja em Células</Link>
            <Link className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant hover:text-primary transition-all" href="/#trilha-discipulado">Trilha Discipulado</Link>
            <a className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant hover:text-primary transition-all" href="https://projeto-luz-para-a-cidade-757083107524.us-west1.run.app/" target="_blank" rel="noopener noreferrer">Ação Social</a>
            <Link className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant hover:text-primary transition-all" href="/#visita">Visite-nos</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/public/enrollment" className="border border-primary text-primary px-6 py-2.5 rounded-full font-label-md text-label-md hover:bg-primary/5 hover:scale-105 transition-all active:scale-95">
              Inscrições
            </Link>
            <Link href="/login" className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-label-md text-label-md hover:opacity-90 hover:scale-105 transition-all active:scale-95 shadow-md shadow-primary/10">
              Área do Membro
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative h-[55vh] flex items-center justify-center overflow-hidden trellis-grid">
          <div className="absolute inset-0">
            <img 
              alt="Igreja Batista da Manhã Congregação" 
              className="w-full h-full object-cover scale-105 opacity-20 mix-blend-overlay" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCr7oCzPUs2mX7afBncE0nr5wSnybt-OgYrRaLzitN2IOhu2y12dt7ekqqETYj6yavxX8Ab_9IU2DOmEqAGnsa9Q7dZPsMxACQNvKYbRXFJ4E-JEMGJqXrxnBiEOYjjMvVy4o7c22fgUtMMayRxpr3KzrCIwKjyPzU9mg_wh599VzUD23hCCLjcZh31VfvBQQPiyMty4foaZ_SkJW-VaUKTfhDIdmk4V9KIuMJT8XAmLCZOdnpjoEzIdqTJywQjc7m1oPdi-fzNkkw"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-surface/40 via-surface/85 to-surface"></div>
          </div>
          <div className="relative z-10 text-center px-6 max-w-4xl mx-auto reveal-on-scroll">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/5 rounded-full border border-primary/20 mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest">Conheça nossa identidade</span>
            </div>
            <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg leading-[1.05] mb-6">
              Quem <span className="text-primary italic">Somos</span>
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
              Uma igreja fundamentada na Palavra, vivendo em comunidade e apaixonada por servir.
            </p>
          </div>
        </section>

        {/* Quem Somos - Visão e Cultura */}
        <section className="py-20 bg-surface-container-lowest" id="visao">
          <div className="max-w-[1440px] mx-auto px-container-margin">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="reveal-on-scroll">
                <span className="text-primary font-bold text-xs uppercase tracking-widest mb-3 block">Nossa Essência</span>
                <h2 className="font-headline-md text-headline-md text-primary mb-6 leading-tight">
                  Mudar a cidade através do discipulado.
                </h2>
                <p className="text-on-surface-variant body-lg mb-6 leading-relaxed">
                  A Igreja Batista da Manhã (IBM) preserva a herança teológica dos batistas, mas se comunica com a cidade através de uma linguagem totalmente atual e contextualizada. Nós acreditamos que a verdadeira igreja não acontece apenas no domingo de manhã.
                </p>
                <div className="p-6 rounded-2xl bg-surface-container border border-outline-variant/20 flex gap-4">
                  <span className="material-symbols-outlined text-primary text-3xl flex-shrink-0">groups</span>
                  <div>
                    <h4 className="font-headline-sm text-lg text-primary mb-2">Igreja EM Células</h4>
                    <p className="text-on-surface-variant text-sm leading-relaxed">
                      O cuidado pastoral é distribuído e vivido diariamente através dos Grupos de Crescimento (GCs) nas casas, formando discípulos que cuidam uns dos outros no dia a dia.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-surface-container border border-outline-variant/20 p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden reveal-on-scroll" style={{ transitionDelay: '200ms' }}>
                <div className="relative z-10">
                  <span className="text-primary font-bold text-xs uppercase tracking-widest mb-3 block">Nossa Cultura</span>
                  <h3 className="font-headline-md text-2xl font-bold text-primary mb-6">
                    O DNA S.E.R.V.I.R.
                  </h3>
                  <p className="text-on-surface-variant body-md leading-relaxed mb-8">
                    Aqui, o nosso maior título é a <strong className="text-primary font-bold">toalha de servir</strong>. Rejeitamos o ativismo vazio e valorizamos as pessoas acima de qualquer processo.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-xl shadow-sm border border-outline-variant/10">
                      <span className="text-primary font-black text-base block mb-1">S — Serviço</span>
                      <span className="text-xs text-on-surface-variant/70 block leading-tight">A toalha antes do título.</span>
                    </div>
                    <div className="p-4 bg-white rounded-xl shadow-sm border border-outline-variant/10">
                      <span className="text-primary font-black text-base block mb-1">E — Excelência</span>
                      <span className="text-xs text-on-surface-variant/70 block leading-tight">Fazer o melhor com os recursos que temos hoje.</span>
                    </div>
                    <div className="p-4 bg-white rounded-xl shadow-sm border border-outline-variant/10">
                      <span className="text-primary font-black text-base block mb-1">R — Relacionamento</span>
                      <span className="text-xs text-on-surface-variant/70 block leading-tight">Troca franca, honesta e com discrição.</span>
                    </div>
                    <div className="p-4 bg-white rounded-xl shadow-sm border border-outline-variant/10">
                      <span className="text-primary font-black text-base block mb-1">V — Valorização do Outro</span>
                      <span className="text-xs text-on-surface-variant/70 block leading-tight">Cultura de honra em todo tempo.</span>
                    </div>
                    <div className="p-4 bg-white rounded-xl shadow-sm border border-outline-variant/10">
                      <span className="text-primary font-black text-base block mb-1">I — Intencionalidade</span>
                      <span className="text-xs text-on-surface-variant/70 block leading-tight">Tudo o que fazemos tem um propósito espiritual.</span>
                    </div>
                    <div className="p-4 bg-white rounded-xl shadow-sm border border-outline-variant/10">
                      <span className="text-primary font-black text-base block mb-1">R — Responsabilidade</span>
                      <span className="text-xs text-on-surface-variant/70 block leading-tight">Mentalidade de dono, não de visitante.</span>
                    </div>
                  </div>
                </div>
                <div className="absolute -right-16 -bottom-16 w-48 h-48 bg-primary/5 rounded-full blur-2xl"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Nossa História Timeline */}
        <section className="py-20 bg-surface border-y border-outline-variant/20" id="historia">
          <div className="max-w-[1440px] mx-auto px-container-margin">
            <div className="text-center mb-20 reveal-on-scroll">
              <span className="text-primary font-bold text-xs uppercase tracking-widest mb-3 block">Nossa Origem</span>
              <h2 className="font-display-lg text-display-lg-mobile md:text-headline-md mb-6">
                Tudo começou com o cuidado por uma única vida
              </h2>
              <p className="text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
                Nossa origem não está em um grande projeto arquitetônico, mas no amor pastoral. Nascemos do desejo de cuidar de uma pessoa que precisava de atenção.
              </p>
            </div>

            <div className="relative border-l-2 border-primary/20 ml-4 md:ml-32 space-y-12 max-w-4xl mx-auto">
                
              {/* 1998 */}
              <div className="relative pl-8 md:pl-12 reveal-on-scroll">
                <div className="absolute -left-[17px] top-1.5 w-8 h-8 rounded-full bg-white border-2 border-primary flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-primary text-sm">home</span>
                </div>
                <div className="absolute -left-36 top-2 hidden md:block text-right w-28">
                  <span className="font-display-lg text-lg text-primary">1998</span>
                  <span className="text-xs text-on-surface-variant/70 block">18 de Fevereiro</span>
                </div>
                <div className="bg-white p-6 md:p-8 rounded-2xl border border-outline-variant/20 shadow-sm timeline-card">
                  <div className="md:hidden mb-2">
                    <span className="font-display-lg text-primary">1998 — 18 de Fev</span>
                  </div>
                  <h3 className="font-headline-sm text-xl font-bold text-primary mb-4 flex items-center gap-2">
                    O Início na Sala de Casa
                  </h3>
                  <p className="text-on-surface-variant leading-relaxed text-sm mb-6">
                    A Primeira Igreja Batista em Alcântara (nossa igreja mãe) iniciou uma pequena congregação na casa da irmã Anna da Silva Abreu, no bairro do Mutondo. Devido à sua idade avançada, ela já não conseguia ir aos cultos. O trabalho começou focado unicamente em servir a uma família.
                  </p>
                  <div className="bg-surface-container border border-outline-variant/20 rounded-xl p-6 flex flex-col md:flex-row gap-6 items-center">
                    <svg className="w-24 h-20 text-outline-variant flex-shrink-0" viewBox="0 0 100 80" fill="currentColor">
                      <path d="M10 70 h80 v5 h-80 z" fill="#CBD5E1" />
                      <path d="M20 70 c0 -20 10 -25 15 -25 s15 5 15 25 z" fill="#94A3B8" />
                      <path d="M30 45 c-5 -5 -5 -15 0 -20 s15 0 15 20 z" fill="#64748B" />
                      <circle cx="70" cy="40" r="10" fill="#a63b00" opacity="0.4" />
                      <path d="M65 40 h10 v30 h-10 z" fill="#475569" />
                      <path d="M60 40 l10 -15 l10 15 z" fill="#E2E8F0" />
                    </svg>
                    <span className="text-xs text-on-surface-variant italic">
                      "A essência da nossa igreja nasceu na simplicidade de uma sala de estar, focada em cuidar e acolher vidas."
                    </span>
                  </div>
                </div>
              </div>

              {/* 2015 */}
              <div className="relative pl-8 md:pl-12 reveal-on-scroll">
                <div className="absolute -left-[17px] top-1.5 w-8 h-8 rounded-full bg-white border-2 border-primary flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-primary text-sm">handshake</span>
                </div>
                <div className="absolute -left-36 top-2 hidden md:block text-right w-28">
                  <span className="font-display-lg text-lg text-primary">2015</span>
                  <span className="text-xs text-on-surface-variant/70 block">09 de Maio</span>
                </div>
                <div className="bg-white p-6 md:p-8 rounded-2xl border border-outline-variant/20 shadow-sm timeline-card">
                  <div className="md:hidden mb-2">
                    <span className="font-display-lg text-primary">2015 — 09 de Mai</span>
                  </div>
                  <h3 className="font-headline-sm text-xl font-bold text-primary mb-4">
                    Nossa Organização
                  </h3>
                  <p className="text-on-surface-variant leading-relaxed text-sm">
                    Fomos oficialmente organizados como uma igreja autônoma, adotando o nome "Igreja Batista em Mutondo". O saudoso Pastor Gelson Sardinha foi o nosso primeiro pastor presidente.
                  </p>
                </div>
              </div>

              {/* 2021 */}
              <div className="relative pl-8 md:pl-12 reveal-on-scroll">
                <div className="absolute -left-[17px] top-1.5 w-8 h-8 rounded-full bg-white border-2 border-primary flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-primary text-sm">supervisor_account</span>
                </div>
                <div className="absolute -left-36 top-2 hidden md:block text-right w-28">
                  <span className="font-display-lg text-lg text-primary">2021</span>
                  <span className="text-xs text-on-surface-variant/70 block">18 de Junho</span>
                </div>
                <div className="bg-white p-6 md:p-8 rounded-2xl border border-outline-variant/20 shadow-sm timeline-card">
                  <div className="md:hidden mb-2">
                    <span className="font-display-lg text-primary">2021 — 18 de Jun</span>
                  </div>
                  <h3 className="font-headline-sm text-xl font-bold text-primary mb-4">
                    Um Novo Tempo
                  </h3>
                  <p className="text-on-surface-variant leading-relaxed text-sm">
                    O Pastor Hugo Campos de Souza assumiu a liderança da igreja, mantendo vivo o propósito de servir às famílias, estruturar o discipulado e honrar ao Senhor.
                  </p>
                </div>
              </div>

              {/* 2023 */}
              <div className="relative pl-8 md:pl-12 reveal-on-scroll">
                <div className="absolute -left-[17px] top-1.5 w-8 h-8 rounded-full bg-white border-2 border-primary flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-primary text-sm">wb_sunny</span>
                </div>
                <div className="absolute -left-36 top-2 hidden md:block text-right w-28">
                  <span className="font-display-lg text-lg text-primary">2023</span>
                  <span className="text-xs text-on-surface-variant/70 block">09 de Dezembro</span>
                </div>
                <div className="bg-white p-6 md:p-8 rounded-2xl border border-outline-variant/20 shadow-sm timeline-card">
                  <div className="md:hidden mb-2">
                    <span className="font-display-lg text-primary">2023 — 09 de Dez</span>
                  </div>
                  <h3 className="font-headline-sm text-xl font-bold text-primary mb-4">
                    O Nascer da "Manhã"
                  </h3>
                  <p className="text-on-surface-variant leading-relaxed text-sm">
                    Alteramos nosso nome para <strong>Igreja Batista da Manhã</strong>. O motivo é especial: "Mutondo" significa "pela manhã" em dialeto africano local. Essa mudança expressa a renovação que buscamos refletir em cada amanhecer.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Nossa Liderança e Estrutura */}
        <section className="py-20 bg-surface-container-lowest" id="lideranca">
          <div className="max-w-[1440px] mx-auto px-container-margin">
            <div className="text-center mb-20 reveal-on-scroll">
              <span className="text-primary font-bold text-xs uppercase tracking-widest mb-3 block">Nossos Líderes</span>
              <h2 className="font-display-lg text-display-lg-mobile md:text-headline-md mb-6">
                Liderança e Governança
              </h2>
              <p className="text-on-surface-variant max-w-2xl mx-auto leading-relaxed text-sm md:text-base">
                Na IBM, seguimos o <strong>Governo Congregacional</strong>. A maior autoridade humana é a Assembleia formada pelos membros, sob a liderança suprema de Cristo. Para que o cuidado funcione, trabalhamos com duas frentes:
              </p>
            </div>

            {/* A Treliça e a Videira visual container */}
            <div className="grid md:grid-cols-2 gap-12 mb-24 max-w-5xl mx-auto">
              {/* Videira Card */}
              <div className="p-8 rounded-3xl border border-outline-variant/20 bg-secondary/5 hover:bg-secondary/10 transition-all duration-300 reveal-on-scroll">
                <div className="flex justify-between items-start mb-6">
                  <span className="px-3 py-1 bg-secondary/20 text-secondary font-bold text-xs uppercase rounded-full">Organismo Vivo</span>
                  <span className="material-symbols-outlined text-secondary text-3xl">spa</span>
                </div>
                <h3 className="font-headline-sm text-2xl font-bold text-on-surface mb-4">🌿 A Videira</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
                  A vida do discipulado e comunhão que acontece nas casas através dos GCs.
                </p>
                {/* Custom SVG Vine graphic */}
                <div className="w-full h-32 flex items-center justify-center bg-white rounded-2xl border border-outline-variant/10 p-4">
                  <svg className="w-full h-full text-secondary" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 30 C 50 10, 80 50, 110 30 C 140 10, 170 40, 190 30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="50" cy="22" r="6" fill="currentColor" />
                    <path d="M50 22 C 45 10, 55 10, 50 22" fill="currentColor" />
                    <circle cx="110" cy="30" r="6" fill="currentColor" />
                    <circle cx="150" cy="23" r="6" fill="currentColor" />
                    <path d="M110 30 L 100 20" stroke="currentColor" strokeWidth="2" />
                    <path d="M150 23 L 158 12" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>
              </div>

              {/* Treliça Card */}
              <div className="p-8 rounded-3xl border border-outline-variant/20 bg-surface-container hover:bg-surface-container-high transition-all duration-300 reveal-on-scroll" style={{ transitionDelay: '200ms' }}>
                <div className="flex justify-between items-start mb-6">
                  <span className="px-3 py-1 bg-primary/10 text-primary font-bold text-xs uppercase rounded-full">Estrutura & Suporte</span>
                  <span className="material-symbols-outlined text-primary text-3xl">grid_view</span>
                </div>
                <h3 className="font-headline-sm text-2xl font-bold text-on-surface mb-4">🧱 A Treliça</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
                  O suporte administrativo, tecnológico e de infraestrutura que permite ao organismo crescer saudável.
                </p>
                {/* Custom SVG Trellis graphic */}
                <div className="w-full h-32 flex items-center justify-center bg-white rounded-2xl border border-outline-variant/10 p-4">
                  <svg className="w-full h-full text-primary/40" viewBox="0 0 200 60" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
                    <line x1="20" y1="10" x2="20" y2="50" />
                    <line x1="60" y1="10" x2="60" y2="50" />
                    <line x1="100" y1="10" x2="100" y2="50" />
                    <line x1="140" y1="10" x2="140" y2="50" />
                    <line x1="180" y1="10" x2="180" y2="50" />
                    <line x1="10" y1="20" x2="190" y2="20" />
                    <line x1="10" y1="40" x2="190" y2="40" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Removido temporariamente o container de cartões individuais da equipe */}
          </div>
        </section>

        {/* Action CTAs */}
        <section className="py-20 bg-inverse-surface text-inverse-on-surface relative overflow-hidden text-center">
          <div className="relative z-10 max-w-4xl mx-auto px-6 reveal-on-scroll">
            <span className="text-primary font-bold text-xs uppercase tracking-widest mb-4 block">Faça Parte</span>
            <h2 className="font-display-lg text-display-lg-mobile md:text-headline-md mb-8">Queremos caminhar com você!</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link className="px-8 py-4 bg-primary text-on-primary rounded-full font-bold hover:bg-primary-container transition-all shadow-xl" href="/enrollment">
                Quero fazer uma visita no próximo domingo
              </Link>
              <Link className="px-8 py-4 bg-transparent border border-outline-variant/30 text-inverse-on-surface rounded-full font-bold hover:bg-white/10 transition-all" href="/gc">
                Conhecer um GC perto de mim
              </Link>
            </div>
          </div>
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-primary/20 rounded-full blur-[100px]"></div>
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-secondary/10 rounded-full blur-[100px]"></div>
        </section>
      </main>

      {/* Floating Chat Button for Neemias widget */}
      <div className="fixed bottom-8 right-8 z-[60]">
        <button className="bg-primary w-16 h-16 rounded-full flex items-center justify-center apple-shadow hover:scale-110 hover:rotate-6 transition-all text-white animate-bounce" onClick={openNeemiasWidget} title="Fale com Neemias">
          <span className="material-symbols-outlined text-3xl">smart_toy</span>
        </button>
      </div>

      {/* Footer */}
      <footer className="bg-surface py-16 md:py-24 border-t border-outline-variant/30">
        <div className="max-w-[1440px] mx-auto px-container-margin">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-16 mb-20">
            <div className="md:col-span-4">
              <span className="font-headline-sm text-2xl text-on-surface font-bold tracking-tighter mb-6 block">IGREJA BATISTA DA MANHÃ</span>
              <p className="font-body-md text-on-surface-variant mb-8 leading-relaxed">
                Mudar a cidade através do discipulado. Nossa missão é refletir a luz da manhã em cada coração gonçalense.
              </p>
              <div className="flex gap-4">
                <a className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all" href="https://www.youtube.com/@ibmanha" target="_blank" rel="noopener noreferrer" title="YouTube"><span className="material-symbols-outlined text-xl">videocam</span></a>
                <a className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all" href="https://www.instagram.com/ibmanha/" target="_blank" rel="noopener noreferrer" title="Instagram"><span className="material-symbols-outlined text-xl">groups</span></a>
              </div>
            </div>
            
            <div className="md:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="flex flex-col gap-5">
                <span className="font-label-sm uppercase tracking-[0.2em] text-primary font-bold">SOBRE</span>
                <Link className="text-body-md text-on-surface-variant hover:text-primary transition-colors" href="/quem-somos">Quem Somos</Link>
                <Link className="text-body-md text-on-surface-variant hover:text-primary transition-colors" href="/quem-somos#historia">Nossa História</Link>
                <Link className="text-body-md text-on-surface-variant hover:text-primary transition-colors" href="/quem-somos#lideranca">Nossa Liderança</Link>
              </div>
              <div className="flex flex-col gap-5">
                <span className="font-label-sm uppercase tracking-[0.2em] text-primary font-bold">IGREJA</span>
                <Link className="text-body-md text-on-surface-variant hover:text-primary transition-colors" href="/gc">Células (GC)</Link>
                <Link className="text-body-md text-on-surface-variant hover:text-primary transition-colors" href="/enrollment">Escola Lumine</Link>
                <a className="text-body-md text-on-surface-variant hover:text-primary transition-colors" href="https://projeto-luz-para-a-cidade-757083107524.us-west1.run.app/" target="_blank" rel="noopener noreferrer">Ação Social</a>
                <a className="text-body-md text-on-surface-variant hover:text-primary transition-colors" href="https://ibmcamp.com.br" target="_blank" rel="noopener noreferrer">IBM CAMP</a>
                <a className="text-body-md text-on-surface-variant hover:text-primary transition-colors" href="#">Ministérios</a>
              </div>
              <div className="flex flex-col gap-5">
                <span className="font-label-sm uppercase tracking-[0.2em] text-primary font-bold">CONECTE</span>
                <Link className="text-body-md text-on-surface-variant hover:text-primary transition-colors" href="/enrollment">Sou Visitante</Link>
                <a className="text-body-md text-on-surface-variant hover:text-primary transition-colors" href="https://www.instagram.com/ibmanha/" target="_blank" rel="noopener noreferrer">Instagram</a>
                <a className="text-body-md text-on-surface-variant hover:text-primary transition-colors" href="https://www.youtube.com/@ibmanha" target="_blank" rel="noopener noreferrer">YouTube</a>
                <a className="text-body-md text-on-surface-variant hover:text-primary transition-colors" href="https://www.facebook.com/ibmanha/" target="_blank" rel="noopener noreferrer">Facebook</a>
              </div>
              <div className="flex flex-col gap-5">
                <span className="font-label-sm uppercase tracking-[0.2em] text-primary font-bold">LEGAL</span>
                <a className="text-body-md text-on-surface-variant hover:text-primary transition-colors" href="#">Privacidade</a>
                <a className="text-body-md text-on-surface-variant hover:text-primary transition-colors" href="#">Cookies</a>
              </div>
            </div>
          </div>

          {/* History Timeline */}
          <div className="pt-12 border-t border-outline-variant/20">
            <div className="flex justify-between items-start overflow-x-auto pb-8 gap-16 no-scrollbar">
              <div className="flex-shrink-0 min-w-[200px] group">
                <span className="block font-bold text-primary text-2xl mb-1 group-hover:scale-110 transition-transform origin-left">1998</span>
                <span className="text-[11px] text-on-surface font-bold uppercase tracking-widest block mb-2">Fundação</span>
                <span className="text-xs text-on-surface-variant leading-relaxed block">Congregação na casa da irmã Anna da Silva Abreu</span>
              </div>
              <div className="h-[1px] flex-grow bg-primary/10 mt-4 min-w-[40px] relative">
                <div className="absolute top-1/2 left-0 w-2 h-2 bg-primary/20 rounded-full -translate-y-1/2"></div>
              </div>
              <div className="flex-shrink-0 min-w-[200px] group">
                <span className="block font-bold text-on-surface text-2xl mb-1 group-hover:text-primary transition-colors">2015</span>
                <span className="text-[11px] text-on-surface font-bold uppercase tracking-widest block mb-2">Autonomia</span>
                <span className="text-xs text-on-surface-variant leading-relaxed block">Organização oficial como igreja autônoma</span>
              </div>
              <div className="h-[1px] flex-grow bg-primary/10 mt-4 min-w-[40px]"></div>
              <div className="flex-shrink-0 min-w-[200px] group">
                <span className="block font-bold text-on-surface text-2xl mb-1 group-hover:text-primary transition-colors">2021</span>
                <span className="text-[11px] text-on-surface font-bold uppercase tracking-widest block mb-2">Transição</span>
                <span className="text-xs text-on-surface-variant leading-relaxed block">Início da nova liderança pastoral contemporânea</span>
              </div>
              <div className="h-[1px] flex-grow bg-primary/10 mt-4 min-w-[40px]"></div>
              <div className="flex-shrink-0 min-w-[200px] group">
                <span className="block font-bold text-primary text-2xl mb-1 group-hover:scale-110 transition-transform origin-left">2023</span>
                <span className="text-[11px] text-on-surface font-bold uppercase tracking-widest block mb-2">Renascimento</span>
                <span className="text-xs text-on-surface-variant leading-relaxed block">Mudança de nome para Igreja Batista da Manhã</span>
              </div>
            </div>
            <div className="mt-12 text-center text-xs text-on-surface-variant/50">
              © {new Date().getFullYear()} IBM. Mudar a cidade através do discipulado.
            </div>
          </div>
        </div>
      </footer>

      {/* Scripts do Widget Neemias */}
      <Script id="neemias-widget-config" strategy="afterInteractive">
        {`
          window.ZV2Widget = {
            ChannelURL: "https://widget.endless.zaia.app/widget/channel/d6aff9b1-6d05-42c6-8f16-20a13ee7d7c0?theme=dark&locale=pt-BR",
          };
        `}
      </Script>
      <Script 
        src="https://widget.endless.zaia.app/script/widget-loader.js" 
        strategy="afterInteractive"
      />
    </div>
  );
}
