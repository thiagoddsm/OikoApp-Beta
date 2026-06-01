'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Script from 'next/script';

const gcNeighborhoods = [
  { name: 'Mutondo', top: '35%', left: '42%', delay: '0s', main: true },
  { name: 'Alcântara', top: '45%', left: '58%', delay: '0.2s' },
  { name: 'Colubandê', top: '60%', left: '68%', delay: '0.4s' },
  { name: 'Galo Branco', top: '62%', left: '35%', delay: '0.6s' },
  { name: 'Itaúna', top: '20%', left: '72%', delay: '0.8s' },
  { name: 'Jardim Catarina', top: '18%', left: '48%', delay: '1s' },
  { name: 'Laranjal', top: '28%', left: '82%', delay: '1.2s' },
  { name: 'Monjolos', top: '15%', left: '25%', delay: '1.4s' },
  { name: 'Mutuá', top: '40%', left: '22%', delay: '1.6s' },
  { name: 'Porto Novo', top: '75%', left: '18%', delay: '1.8s' },
  { name: 'São Miguel', top: '78%', left: '48%', delay: '2s' },
  { name: 'Trindade', top: '52%', left: '48%', delay: '2.2s' },
];

export default function LandingPage() {
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

    // Simple parallax on scroll for hero image
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      const network = document.getElementById('network-vines');
      if (network) {
        network.style.transform = `translateY(${scrolled * 0.05}px)`;
      }
    };
    window.addEventListener('scroll', handleScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
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
        @keyframes draw {
            to { stroke-dashoffset: 0; }
        }
        @keyframes pulse-soft {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.8; }
        }
        .animate-draw {
            stroke-dasharray: 1000;
            stroke-dashoffset: 1000;
            animation: draw 4s ease-out forwards;
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
        
        /* Oculta o botão flutuante padrão do Neemias (Zaia) */
        #chatbot-fab {
            display: none !important;
        }

        /* Garante afastamento robusto do rodapé para a seção visite-nos */
        #visita {
            padding-bottom: 120px !important;
        }
        @media (min-width: 768px) {
            #visita {
                padding-bottom: 180px !important;
            }
        }
        @media (min-width: 1024px) {
            #visita {
                padding-bottom: 240px !important;
            }
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
            <img 
              src="https://firebasestorage.googleapis.com/v0/b/studio-1424813022-71754.firebasestorage.app/o/C%C3%B3pia%20de%20LOGO%20IBM%20BRANCO.PNG?alt=media&token=85d35afe-f7f6-40d6-a9cd-c138c6a326fa" 
              alt="Logo IBM" 
              className="h-10 w-auto object-contain brightness-0"
            />
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant hover:text-primary transition-all" href="#jornada">Jornada</a>
            <a className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant hover:text-primary transition-all" href="#igreja-em-celulas">Igreja em Células</a>
            <a className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant hover:text-primary transition-all" href="#redes">Redes</a>
            <a className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant hover:text-primary transition-all" href="#trilha-discipulado">Trilha Discipulado</a>
            <a className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant hover:text-primary transition-all" href="https://projeto-luz-para-a-cidade-757083107524.us-west1.run.app/" target="_blank" rel="noopener noreferrer">Ação Social</a>
            <a className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant hover:text-primary transition-all" href="#visita">Visite-nos</a>
            <Link className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant hover:text-primary transition-all" href="/quem-somos">Quem Somos</Link>
          </div>
          <Link href="/login" className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-label-md text-label-md hover:opacity-90 hover:scale-105 transition-all active:scale-95 shadow-md shadow-primary/10">
            Área do Membro
          </Link>
        </div>
      </nav>

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden min-h-[90vh] flex items-center trellis-grid">
          <div className="max-w-[1440px] mx-auto px-container-margin grid grid-cols-1 lg:grid-cols-2 gap-gutter items-center w-full">
            <div className="relative z-10 space-y-8 reveal-on-scroll">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/5 rounded-full border border-primary/20">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest">DISCIPULADO QUE TRANSFORMA</span>
              </div>
              <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg leading-[1.05] max-w-xl">
                Mudar a cidade através do <span className="text-primary italic">discipulado</span>.
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg leading-relaxed">
                Somos uma igreja EM células, vivendo relacionamentos que transformam pessoas e cidades. Uma estrutura de ordem para o florescimento da vida.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <a href="#visita" className="bg-primary-container text-on-primary px-8 py-4 rounded-full font-headline-sm text-base hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center">
                  Quero visitar
                </a>
                <Link href="/gc" className="border border-primary/30 text-primary px-8 py-4 rounded-full font-headline-sm text-base hover:bg-primary/5 transition-all flex items-center justify-center">
                  Encontrar um GC
                </Link>
                <button onClick={openNeemiasWidget} className="text-on-surface-variant flex items-center gap-2 px-6 py-4 hover:text-primary transition-all group">
                  <span className="material-symbols-outlined transition-transform group-hover:rotate-12" data-icon="forum">forum</span>
                  Falar com Neemias
                </button>
              </div>
            </div>
            
            <div className="relative h-full flex justify-center lg:justify-end reveal-on-scroll" style={{ transitionDelay: '200ms' }}>
              <div className="relative w-full max-w-[620px] aspect-square rounded-3xl overflow-hidden bg-white apple-shadow">
                {/* Custom SVG Animation for Living Urban Network */}
                <svg className="absolute inset-0 w-full h-full opacity-60" viewBox="0 0 800 800">
                  <defs>
                    <linearGradient id="lineGrad" x1="0%" x2="100%" y1="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#a63b00', stopOpacity: 0.6 }} />
                      <stop offset="100%" style={{ stopColor: '#f26522', stopOpacity: 0.2 }} />
                    </linearGradient>
                  </defs>
                  <g className="stroke-[1.5] fill-none" id="network-vines">
                    <path className="animate-draw" d="M100 400 Q 250 350 400 400 T 700 400" stroke="url(#lineGrad)" />
                    <path className="animate-draw" d="M200 100 Q 300 400 200 700" stroke="url(#lineGrad)" style={{ animationDelay: '1s' }} />
                    <path className="animate-draw" d="M150 150 C 400 200 400 600 650 650" stroke="url(#lineGrad)" style={{ animationDelay: '2s' }} />
                    <circle className="animate-pulse-soft" cx={400} cy={400} fill="#a63b00" r={8} />
                    <circle className="animate-pulse-soft" cx={200} cy={100} fill="#a63b00" r={6} style={{ animationDelay: '0.5s' }} />
                    <circle className="animate-pulse-soft" cx={700} cy={400} fill="#f26522" r={6} style={{ animationDelay: '1.2s' }} />
                    <circle className="animate-pulse-soft" cx={150} cy={150} fill="#f26522" r={5} style={{ animationDelay: '0.8s' }} />
                    <circle className="animate-pulse-soft" cx={650} cy={650} fill="#a63b00" r={10} style={{ animationDelay: '1.5s' }} />
                  </g>
                </svg>
                <img alt="Church network visualization" className="w-full h-full object-cover mix-blend-overlay opacity-80" data-alt="Premium digital city network visualization" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_g3Fce7pwGFSpfiWtiSrvCX4t37IcoMTJFaokjAfIZRI64leYYbtIfV3flrlHX22A74fJYTvSGSYPjeGdoSE3bDjEOH1zZ9GWpalN_RvHClvhDfHX_RgGXoqack-7T9WqLC_XabAEUaAyCiqB_ISMLlAKhyjlxXivZtOifdT-dWYtrKkRZSNRmm6y0ZqQkXhmBw12_8Fyz92045OcTcTqdGrvoTs8yDc2OQnnovcB4yO102fIgsFtoq6LtM7Xu6dPVQOqP_iPVCYo"/>
              </div>
            </div>
          </div>
        </section>

        {/* Jornada IBM */}
        <section className="py-16 md:py-24 lg:py-28 bg-surface-container-lowest" id="jornada">
          <div className="max-w-[1440px] mx-auto px-container-margin">
            <div className="text-center mb-20 reveal-on-scroll">
              <h2 className="font-headline-md text-headline-md">Jornada IBM</h2>
              <p className="text-on-surface-variant mt-3 max-w-2xl mx-auto">O acróstico IBM orienta a maturidade dos discípulos e dos GC.</p>
            </div>
            <div className="relative flex flex-col md:flex-row justify-between items-center max-w-5xl mx-auto gap-12 md:gap-4 reveal-on-scroll">
              {/* Flow Line Background */}
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-primary/10 via-primary to-primary/10 -translate-y-1/2 hidden md:block"></div>
              
              {/* Step I */}
              <div className="relative z-10 group flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-white border-2 border-primary flex items-center justify-center apple-shadow group-hover:scale-110 group-hover:bg-primary transition-all duration-500 overflow-hidden">
                  <span className="text-4xl font-bold text-primary group-hover:text-white transition-colors">I</span>
                  <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div className="mt-8 space-y-2 max-w-[200px]">
                  <h3 className="font-bold text-lg text-primary tracking-tight">ILUMINAR</h3>
                  <p className="text-sm text-on-surface-variant font-medium">Ganhar pessoas, Evangelização, Alcance</p>
                  <div className="w-8 h-1 bg-primary/20 mx-auto rounded-full group-hover:w-16 transition-all"></div>
                </div>
              </div>
              
              {/* Step B */}
              <div className="relative z-10 group flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-white border-2 border-primary/40 flex items-center justify-center apple-shadow group-hover:scale-110 group-hover:border-primary group-hover:bg-primary transition-all duration-500 overflow-hidden">
                  <span className="text-4xl font-bold text-primary/40 group-hover:text-white transition-colors">B</span>
                  <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div className="mt-8 space-y-2 max-w-[200px]">
                  <h3 className="font-bold text-lg text-on-surface tracking-tight group-hover:text-primary transition-colors">BUSCAR</h3>
                  <p className="text-sm text-on-surface-variant font-medium">Comunhão, Capacitação, Consolidação</p>
                  <div className="w-8 h-1 bg-primary/10 mx-auto rounded-full group-hover:w-16 transition-all"></div>
                </div>
              </div>
              
              {/* Step M */}
              <div className="relative z-10 group flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-white border-2 border-primary/20 flex items-center justify-center apple-shadow group-hover:scale-110 group-hover:border-primary group-hover:bg-primary transition-all duration-500 overflow-hidden">
                  <span className="text-4xl font-bold text-primary/20 group-hover:text-white transition-colors">M</span>
                  <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div className="mt-8 space-y-2 max-w-[200px]">
                  <h3 className="font-bold text-lg text-on-surface tracking-tight group-hover:text-primary transition-colors">MUDAR</h3>
                  <p className="text-sm text-on-surface-variant font-medium">Enviar, Servir, Transformar a cidade</p>
                  <div className="w-8 h-1 bg-primary/5 mx-auto rounded-full group-hover:w-16 transition-all"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Igreja em Células */}
        <section className="py-16 md:py-24 lg:py-28 border-y border-outline-variant/20 bg-surface" id="igreja-em-celulas">
          <div className="max-w-[1440px] mx-auto px-container-margin grid grid-cols-1 md:grid-cols-2 items-center gap-16">
            <div className="reveal-on-scroll">
              <h2 className="font-display-lg text-display-lg-mobile md:text-headline-md leading-tight mb-8">
                A igreja não acontece apenas aos domingos. <span className="text-primary italic">Ela vive nas casas.</span>
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant mb-10 leading-relaxed">
                Através dos Grupos de Crescimento (GC), construímos comunidades profundas em cada bairro de São Gonçalo. Onde cada pessoa é cuidada e amada.
              </p>
              <Link href="/gc" className="inline-flex bg-primary text-white px-10 py-4 rounded-full font-bold shadow-lg shadow-primary/20 hover:-translate-y-1 hover:shadow-2xl transition-all">
                ENCONTRE SEU GC
              </Link>
            </div>
            
            <div className="bg-surface-container rounded-3xl p-1 md:p-8 relative overflow-hidden h-[550px] apple-shadow border border-white/50 reveal-on-scroll" style={{ transitionDelay: '200ms' }}>
              {/* Stylized Map Placeholder */}
              <div className="absolute inset-0 trellis-grid opacity-20"></div>
              <div className="relative z-10 w-full h-full bg-white/40 rounded-2xl backdrop-blur-sm border border-white p-6 flex flex-col justify-between overflow-hidden">
                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-widest text-primary font-bold">Mapa de Conexões</span>
                  <h3 className="font-headline-sm text-lg">São Gonçalo / RJ</h3>
                </div>
                <div className="relative flex-grow">
                  {/* Connecting Lines */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <line x1="42" y1="35" x2="58" y2="45" stroke="#a63b00" strokeWidth="0.3" strokeDasharray="1 1" className="opacity-40 animate-draw" />
                    <line x1="42" y1="35" x2="22" y2="40" stroke="#a63b00" strokeWidth="0.3" strokeDasharray="1 1" className="opacity-40 animate-draw" />
                    <line x1="42" y1="35" x2="48" y2="18" stroke="#a63b00" strokeWidth="0.3" strokeDasharray="1 1" className="opacity-40 animate-draw" />
                    <line x1="42" y1="35" x2="48" y2="52" stroke="#a63b00" strokeWidth="0.3" strokeDasharray="1 1" className="opacity-40 animate-draw" />
                    <line x1="58" y1="45" x2="68" y2="60" stroke="#a63b00" strokeWidth="0.3" strokeDasharray="1 1" className="opacity-40 animate-draw" />
                    <line x1="58" y1="45" x2="72" y2="20" stroke="#a63b00" strokeWidth="0.3" strokeDasharray="1 1" className="opacity-40 animate-draw" />
                    <line x1="72" y1="20" x2="82" y2="28" stroke="#a63b00" strokeWidth="0.3" strokeDasharray="1 1" className="opacity-40 animate-draw" />
                    <line x1="22" y1="40" x2="25" y2="15" stroke="#a63b00" strokeWidth="0.3" strokeDasharray="1 1" className="opacity-40 animate-draw" />
                    <line x1="22" y1="40" x2="18" y2="75" stroke="#a63b00" strokeWidth="0.3" strokeDasharray="1 1" className="opacity-40 animate-draw" />
                    <line x1="48" y1="52" x2="35" y2="62" stroke="#a63b00" strokeWidth="0.3" strokeDasharray="1 1" className="opacity-40 animate-draw" />
                    <line x1="48" y1="52" x2="48" y2="78" stroke="#a63b00" strokeWidth="0.3" strokeDasharray="1 1" className="opacity-40 animate-draw" />
                  </svg>
                  {/* Pins */}
                  {gcNeighborhoods.map((n) => (
                    <div 
                      key={n.name} 
                      className="absolute group transition-transform hover:scale-110" 
                      style={{ top: n.top, left: n.left }}
                    >
                      <div className={`w-3 h-3 rounded-full animate-ping absolute ${n.main ? 'bg-primary' : 'bg-primary/60'}`} style={{ animationDelay: n.delay }}></div>
                      <div className={`w-3 h-3 rounded-full relative shadow-md ${n.main ? 'bg-primary' : 'bg-primary/80'}`}></div>
                      <span className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white px-2 py-0.5 rounded-full text-[9px] font-bold shadow-sm border border-primary/10 text-on-surface select-none group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-colors">
                        {n.name}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-center font-label-sm text-on-surface-variant/70 italic">Navegue pelo ecossistema de discipulado da cidade</p>
              </div>
            </div>
          </div>
        </section>

        {/* Redes */}
        <section className="py-16 md:py-24 lg:py-28 bg-surface" id="redes">
          <div className="max-w-[1440px] mx-auto px-container-margin">
            <div className="mb-16 reveal-on-scroll">
              <h2 className="font-headline-md text-headline-md">Nossas Redes</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Card Kids */}
              <div className="glass-card p-10 rounded-[2rem] border-l-4 border-primary apple-shadow hover:-translate-y-2 transition-all bg-primary/[0.03] reveal-on-scroll">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-8">
                  <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>child_care</span>
                </div>
                <h3 className="font-headline-sm text-2xl mb-4">Kids</h3>
                <p className="text-on-surface-variant text-body-md leading-relaxed">Fundamentos sólidos para as próximas gerações com alegria e verdade.</p>
              </div>
              
              {/* Card Jovens */}
              <div className="glass-card p-10 rounded-[2rem] border-l-4 border-secondary apple-shadow hover:-translate-y-2 transition-all bg-secondary/[0.03] reveal-on-scroll" style={{ transitionDelay: '100ms' }}>
                <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mb-8">
                  <span className="material-symbols-outlined text-secondary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                </div>
                <h3 className="font-headline-sm text-2xl mb-4">Jovens</h3>
                <p className="text-on-surface-variant text-body-md leading-relaxed">Uma nova cultura vivenciada com intensidade e propósito radical.</p>
              </div>
              
              {/* Card Centrais */}
              <div className="glass-card p-10 rounded-[2rem] border-l-4 border-tertiary-container apple-shadow hover:-translate-y-2 transition-all bg-tertiary-container/[0.03] reveal-on-scroll" style={{ transitionDelay: '200ms' }}>
                <div className="w-16 h-16 rounded-2xl bg-tertiary-container/10 flex items-center justify-center mb-8">
                  <span className="material-symbols-outlined text-tertiary-container text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
                </div>
                <h3 className="font-headline-sm text-2xl mb-4">Centrais</h3>
                <p className="text-on-surface-variant text-body-md leading-relaxed">O coração da nossa maturidade espiritual e vida em família.</p>
              </div>
              
              {/* Card Periféricos */}
              <div className="glass-card p-10 rounded-[2rem] border-l-4 border-error apple-shadow hover:-translate-y-2 transition-all bg-error/[0.03] reveal-on-scroll" style={{ transitionDelay: '300ms' }}>
                <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center mb-8">
                  <span className="material-symbols-outlined text-error text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>outbound</span>
                </div>
                <h3 className="font-headline-sm text-2xl mb-4">Periféricos</h3>
                <p className="text-on-surface-variant text-body-md leading-relaxed">Expandindo as fronteiras do amor ao próximo nas margens da cidade.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Trilha de Discipulado */}
        <section className="py-16 md:py-24 lg:py-28 border-t border-outline-variant/20 bg-surface-container-low" id="trilha-discipulado">
          <div className="max-w-[1440px] mx-auto px-container-margin">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
              <div className="lg:col-span-8 reveal-on-scroll">
                <div className="mb-16">
                  <h2 className="font-headline-md text-headline-md mb-2">Trilha de Discipulado</h2>
                  <p className="text-on-surface-variant text-lg">A jornada estruturada para formar discípulos.</p>
                </div>
                
                {/* Vertical Timeline */}
                <div className="space-y-0 relative">
                  <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gradient-to-b from-primary via-primary/20 to-transparent"></div>
                  
                  {/* Ciclo ILUMINAR */}
                  <div className="flex gap-12 group pb-16 relative">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold z-10 shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-xl">lightbulb</span>
                    </div>
                    <div className="pt-1 flex-grow">
                      <h3 className="font-headline-sm text-xl mb-1 text-primary uppercase font-bold tracking-wider">ILUMINAR</h3>
                      <p className="text-on-surface-variant body-md mb-4 max-w-xl">Despertar a fé e integrar o novo discípulo na família espiritual.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                        <div className="bg-white/80 border border-outline-variant/30 hover:border-primary/30 p-4 rounded-2xl apple-shadow transition-all group/sub">
                          <span className="font-bold text-base text-on-surface group-hover/sub:text-primary transition-colors block mb-1">Batismo</span>
                          <p className="text-xs text-on-surface-variant leading-relaxed">Declaração pública de fé e início da jornada com Cristo.</p>
                        </div>
                        <div className="bg-white/80 border border-outline-variant/30 hover:border-primary/30 p-4 rounded-2xl apple-shadow transition-all group/sub">
                          <span className="font-bold text-base text-on-surface group-hover/sub:text-primary transition-colors block mb-1">Pertencer</span>
                          <p className="text-xs text-on-surface-variant leading-relaxed">Integração oficial, alinhamento com a visão e valores da igreja.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Ciclo BUSCAR */}
                  <div className="flex gap-12 group pb-16 relative">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white border-2 border-primary flex items-center justify-center text-primary font-bold z-10 apple-shadow group-hover:bg-primary group-hover:text-white transition-all">
                      <span className="material-symbols-outlined text-xl">search</span>
                    </div>
                    <div className="pt-1 flex-grow">
                      <h3 className="font-headline-sm text-xl mb-1 text-on-surface group-hover:text-primary transition-colors uppercase font-bold tracking-wider">BUSCAR</h3>
                      <p className="text-on-surface-variant body-md mb-4 max-w-xl">Aprofundar o relacionamento com Deus e com a comunidade.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
                        <div className="bg-white/80 border border-outline-variant/30 hover:border-primary/30 p-4 rounded-2xl apple-shadow transition-all group/sub">
                          <span className="font-bold text-base text-on-surface group-hover/sub:text-primary transition-colors block mb-1">Crescer</span>
                          <p className="text-xs text-on-surface-variant leading-relaxed">Maturidade espiritual através do estudo da Palavra e devocionais.</p>
                        </div>
                        <div className="bg-white/80 border border-outline-variant/30 hover:border-primary/30 p-4 rounded-2xl apple-shadow transition-all group/sub">
                          <span className="font-bold text-base text-on-surface group-hover/sub:text-primary transition-colors block mb-1">Cuidar</span>
                          <p className="text-xs text-on-surface-variant leading-relaxed">Pastoreio mútuo e amor prático nas relações cotidianas e nos GCs.</p>
                        </div>
                        <div className="bg-white/80 border border-outline-variant/30 hover:border-primary/30 p-4 rounded-2xl apple-shadow transition-all group/sub">
                          <span className="font-bold text-base text-on-surface group-hover/sub:text-primary transition-colors block mb-1">Discipular</span>
                          <p className="text-xs text-on-surface-variant leading-relaxed">Caminhar com outros, transmitindo ensinamentos e gerando líderes.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Ciclo MUDAR */}
                  <div className="flex gap-12 group relative">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white border-2 border-primary/20 flex items-center justify-center text-primary/30 font-bold z-10 apple-shadow group-hover:border-primary group-hover:text-primary transition-all">
                      <span className="material-symbols-outlined text-xl">rocket_launch</span>
                    </div>
                    <div className="pt-1 flex-grow">
                      <h3 className="font-headline-sm text-xl mb-1 text-on-surface group-hover:text-primary transition-colors uppercase font-bold tracking-wider">MUDAR</h3>
                      <p className="text-on-surface-variant body-md mb-4 max-w-xl">Impactar a sociedade e multiplicar o Reino através do envio.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                        <div className="bg-white/80 border border-outline-variant/30 hover:border-primary/30 p-4 rounded-2xl apple-shadow transition-all group/sub">
                          <span className="font-bold text-base text-on-surface group-hover/sub:text-primary transition-colors block mb-1">Apoiar</span>
                          <p className="text-xs text-on-surface-variant leading-relaxed">Servir ativamente nos ministérios locais e expandir o corpo.</p>
                        </div>
                        <div className="bg-white/80 border border-outline-variant/30 hover:border-primary/30 p-4 rounded-2xl apple-shadow transition-all group/sub">
                          <span className="font-bold text-base text-on-surface group-hover/sub:text-primary transition-colors block mb-1">Enviar</span>
                          <p className="text-xs text-on-surface-variant leading-relaxed">Multiplicação de células, plantação de igrejas e ação social na cidade.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="lg:col-span-4 flex flex-col justify-center reveal-on-scroll" style={{ transitionDelay: '300ms' }}>
                <div className="bg-white border border-primary/10 p-10 rounded-[2.5rem] apple-shadow relative overflow-hidden group hover:border-primary/30 transition-all">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-primary/[0.02] rounded-full -mr-20 -mt-20 group-hover:scale-110 transition-transform"></div>
                  <div className="relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-8">
                      <span className="material-symbols-outlined text-primary text-3xl">school</span>
                    </div>
                    <span className="font-label-sm text-label-sm text-primary uppercase mb-4 tracking-widest font-bold block">Braço Acadêmico</span>
                    <h3 className="font-headline-md text-3xl mb-6">Lumine College</h3>
                    <p className="text-on-surface-variant body-md mb-10 leading-relaxed">Nossa faculdade livre de teologia e formação ministerial. Prepare-se academicamente para os desafios do ministério contemporâneo.</p>
                    <Link href="/enrollment" className="inline-flex items-center gap-3 text-primary font-bold hover:gap-5 transition-all group/link">
                      <span>Conhecer o College</span>
                      <span className="material-symbols-outlined text-xl">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cultura Servir */}
        <section className="py-[120px] bg-white overflow-hidden" id="cultura-servir">
          <div className="max-w-[1440px] mx-auto px-container-margin text-center reveal-on-scroll">
            <div className="mb-24">
              <h2 className="font-display-lg text-display-lg-mobile md:text-headline-md mb-4">Cultura Servir</h2>
              <p className="font-headline-sm text-primary italic mb-2">"A toalha é maior que a túnica"</p>
              <p className="text-label-md text-on-surface-variant/70 uppercase tracking-widest">O DNA que sustenta nossa forma de amar.</p>
            </div>
            <div className="relative h-[650px] flex items-center justify-center">
              {/* Central Logo */}
              <div className="w-56 h-56 rounded-full bg-primary border-[12px] border-surface-container flex flex-col items-center justify-center apple-shadow z-30 group hover:scale-105 transition-transform duration-700">
                <span className="material-symbols-outlined text-white text-7xl mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>wash</span>
                <span className="text-white/80 font-bold text-[10px] tracking-tighter uppercase">IBM SERVIR</span>
              </div>
              {/* Orbital Elements */}
              <div className="absolute w-[580px] h-[580px] border border-primary/10 rounded-full animate-[spin_80s_linear_infinite]">
                {/* Orbital Dots Decor */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary/20 rounded-full"></div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary/20 rounded-full"></div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary/20 rounded-full"></div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary/20 rounded-full"></div>
              </div>
              {/* Orbiting Values */}
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Top */}
                <div className="absolute -translate-y-[260px] bg-white px-8 py-4 rounded-full apple-shadow border border-primary/10 flex items-center gap-3 hover:-translate-y-[270px] transition-all cursor-default">
                  <span className="text-primary text-xl">🧺</span>
                  <span className="font-bold text-lg"><span className="text-primary">S</span>erviço</span>
                </div>
                {/* Top Right */}
                <div className="absolute translate-x-[220px] -translate-y-[150px] bg-white px-8 py-4 rounded-full apple-shadow border border-primary/10 flex items-center gap-3 hover:translate-x-[230px] transition-all cursor-default">
                  <span className="text-primary text-xl">⭐</span>
                  <span className="font-bold text-lg"><span className="text-primary">E</span>xcelência</span>
                </div>
                {/* Bottom Right */}
                <div className="absolute translate-x-[220px] translate-y-[150px] bg-white px-8 py-4 rounded-full apple-shadow border border-primary/10 flex items-center gap-3 hover:translate-x-[230px] transition-all cursor-default">
                  <span className="text-primary text-xl">🤝</span>
                  <span className="font-bold text-lg"><span className="text-primary">R</span>elacionamento</span>
                </div>
                {/* Bottom */}
                <div className="absolute translate-y-[260px] bg-white px-8 py-4 rounded-full apple-shadow border border-primary/10 flex items-center gap-3 hover:translate-y-[270px] transition-all cursor-default">
                  <span className="text-primary text-xl">❤️</span>
                  <span className="font-bold text-lg"><span className="text-primary">V</span>alorização</span>
                </div>
                {/* Bottom Left */}
                <div className="absolute -translate-x-[220px] translate-y-[150px] bg-white px-8 py-4 rounded-full apple-shadow border border-primary/10 flex items-center gap-3 hover:-translate-x-[230px] transition-all cursor-default">
                  <span className="text-primary text-xl">🎯</span>
                  <span className="font-bold text-lg"><span className="text-primary">I</span>ntencionalidade</span>
                </div>
                {/* Top Left */}
                <div className="absolute -translate-x-[220px] -translate-y-[150px] bg-white px-8 py-4 rounded-full apple-shadow border border-primary/10 flex items-center gap-3 hover:-translate-x-[230px] transition-all cursor-default">
                  <span className="text-primary text-xl">🛡️</span>
                  <span className="font-bold text-lg"><span className="text-primary">R</span>esponsabilidade</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Setor de Visitas / Localização */}
        <section className="pt-16 pb-28 md:pt-24 md:pb-36 lg:pt-28 lg:pb-44 bg-surface-container border-t border-outline-variant/10" id="visita">
          <div className="max-w-[1440px] mx-auto px-container-margin">
            <div className="text-center mb-16 reveal-on-scroll">
              <h2 className="font-headline-md text-headline-md">Venha nos Visitar</h2>
              <p className="text-on-surface-variant mt-3 max-w-2xl mx-auto">Queremos te conhecer! Venha celebrar conosco e viver em comunidade.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch max-w-5xl mx-auto reveal-on-scroll">
              {/* Informações */}
              <div className="space-y-6 flex flex-col justify-between">
                <div className="glass-card p-8 rounded-3xl apple-shadow border border-primary/10 flex gap-6 items-start">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>map</span>
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-bold text-lg text-primary mb-2">Nosso Endereço</h3>
                    <p className="text-on-surface-variant font-medium">Travessa Maria Alice, 121</p>
                    <p className="text-on-surface-variant font-medium">Mutondo, São Gonçalo - RJ</p>
                    <p className="text-on-surface-variant/70 text-sm mb-4">CEP: 24452-140</p>
                    <a href="https://maps.google.com/?q=Travessa+Maria+Alice,+121+-+Mutondo,+São+Gonçalo+-+RJ" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 bg-primary text-on-primary px-6 py-3 rounded-full font-bold shadow-md shadow-primary/10 hover:opacity-90 hover:scale-105 transition-all text-sm">
                      <span>Como Chegar (Google Maps)</span>
                      <span className="material-symbols-outlined text-lg">navigation</span>
                    </a>
                  </div>
                </div>

                <div className="glass-card p-8 rounded-3xl apple-shadow border border-primary/10 flex gap-6 items-start">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-bold text-lg text-primary mb-3">Horários de Culto</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-on-surface-variant font-bold text-sm">07h30 — Culto Clássico</p>
                        <p className="text-on-surface-variant/70 text-xs mt-0.5">Hinos tradicionais e liturgia batista clássica.</p>
                      </div>
                      <div>
                        <p className="text-on-surface-variant font-bold text-sm">10h15 — Culto da Manhã / Família</p>
                        <p className="text-on-surface-variant/70 text-xs mt-0.5">Ambiente leve, com crianças e louvores conhecidos.</p>
                      </div>
                      <div>
                        <p className="text-on-surface-variant font-bold text-sm">17h30 — Culto da Tarde</p>
                        <p className="text-on-surface-variant/70 text-xs mt-0.5">Linguagem atual, focado em visitantes e na cidade.</p>
                      </div>
                      <div>
                        <p className="text-on-surface-variant font-bold text-sm">19h30 — Culto da Noite</p>
                        <p className="text-on-surface-variant/70 text-xs mt-0.5">Linguagem atual, focado em visitantes e na cidade.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mapa Stylized */}
              <div className="relative h-[350px] lg:h-full min-h-[350px] w-full rounded-3xl overflow-hidden bg-white apple-shadow border border-primary/10">
                <iframe 
                  src="https://maps.google.com/maps?q=Travessa%20Maria%20Alice,%20121%20-%20Mutondo,%20S%C3%A3o%20Gon%C3%A7alo%20-%20RJ&t=&z=15&ie=UTF8&iwloc=&output=embed" 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen={true} 
                  loading="lazy"
                ></iframe>
              </div>
            </div>
          </div>
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
