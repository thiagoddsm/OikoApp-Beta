
"use client";

import React from 'react';

export default function PublicHomePage() {
  return (
    <>
      <head>
        <meta charSet="utf-8"/>
        <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
        <title>Igreja Batista da Manhã | Digital Sanctuary</title>
        <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet"/>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
        <script dangerouslySetInnerHTML={{ __html: `
          tailwind.config = {
            darkMode: "class",
            theme: {
              extend: {
                colors: {
                  "primary": "#0F172A",
                  "accent": "#2563EB",
                  "surface": "#F8FAFC",
                  "surface-dim": "#F1F5F9",
                  "on-surface": "#1E293B",
                  "outline-variant": "#E2E8F0",
                },
                fontFamily: {
                  "headline": ["Manrope", "sans-serif"],
                  "body": ["Inter", "sans-serif"],
                },
                borderRadius: {"DEFAULT": "0.5rem", "xl": "1rem", "2xl": "1.5rem", "full": "9999px"},
              },
            },
          }
        ` }}></script>
        <style dangerouslySetInnerHTML={{ __html: `
            .material-symbols-outlined {
                font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
            }
            .hero-overlay {
                background: linear-gradient(to bottom, rgba(15, 23, 42, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%);
            }
            .dropdown-menu {
                display: none;
                opacity: 0;
                transform: translateY(10px);
                transition: all 0.3s ease;
            }
            .dropdown-trigger:hover .dropdown-menu {
                display: block;
                opacity: 1;
                transform: translateY(0);
            }
            .tonal-card {
                background-color: #F8FAFC;
                transition: background-color 0.3s ease, transform 0.3s ease;
            }
            .tonal-card:hover {
                background-color: #F1F5F9;
                transform: translateY(-4px);
            }
            body { scroll-behavior: smooth; }
        ` }}></style>
      </head>
      <body className="bg-white font-body text-on-surface antialiased">
        <header className="fixed w-full top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
                <div className="flex items-center gap-12">
                    <a className="flex items-center gap-3" href="#">
                        <span className="material-symbols-outlined text-primary text-3xl">church</span>
                        <span className="font-headline font-bold text-xl tracking-tight text-primary">Igreja Batista da Manhã</span>
                    </a>
                    <nav className="hidden lg:flex items-center gap-8">
                        <a className="text-sm font-semibold text-primary/70 hover:text-primary transition-colors" href="#">Início</a>
                        <div className="relative dropdown-trigger group">
                            <button className="flex items-center gap-1 text-sm font-semibold text-primary/70 group-hover:text-primary transition-colors">
                                Ministérios <span className="material-symbols-outlined text-sm">expand_more</span>
                            </button>
                            <div className="dropdown-menu absolute top-full left-0 w-64 pt-4">
                                <div className="bg-white rounded-xl shadow-2xl border border-slate-100 p-4 grid gap-2">
                                    <a className="p-3 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-3" href="#">
                                        <span className="material-symbols-outlined text-accent">waves</span>
                                        <span className="text-sm font-medium">Ministério Wave</span>
                                    </a>
                                    <a className="p-3 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-3" href="#">
                                        <span className="material-symbols-outlined text-accent">child_care</span>
                                        <span className="text-sm font-medium">Kids & Juniores</span>
                                    </a>
                                    <a className="p-3 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-3" href="#">
                                        <span className="material-symbols-outlined text-accent">volunteer_activism</span>
                                        <span className="text-sm font-medium">Ação Social</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div className="relative dropdown-trigger group">
                            <button className="flex items-center gap-1 text-sm font-semibold text-primary/70 group-hover:text-primary transition-colors">
                                Grupos <span className="material-symbols-outlined text-sm">expand_more</span>
                            </button>
                            <div className="dropdown-menu absolute top-full left-0 w-64 pt-4">
                                <div className="bg-white rounded-xl shadow-2xl border border-slate-100 p-4 grid gap-2">
                                    <a className="p-3 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-3" href="#">
                                        <span className="material-symbols-outlined text-accent">location_on</span>
                                        <span className="text-sm font-medium">Encontrar um GC</span>
                                    </a>
                                    <a className="p-3 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-3" href="#">
                                        <span className="material-symbols-outlined text-accent">school</span>
                                        <span className="text-sm font-medium">Cursos TheoFlix</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                        <a className="text-sm font-semibold text-primary/70 hover:text-primary transition-colors" href="#">Eventos</a>
                    </nav>
                </div>
                <div className="flex items-center gap-6">
                    <a className="hidden sm:block text-sm font-bold text-accent tracking-wide uppercase hover:opacity-80 transition-opacity" href="#">Contribuir</a>
                    <button className="px-6 py-2.5 bg-primary text-white rounded-full text-sm font-bold hover:shadow-lg hover:shadow-primary/20 transition-all">Portal do Membro</button>
                </div>
            </div>
        </header>
        <main>
            <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0">
                    <img alt="Igreja Batista da Manhã Hero" className="w-full h-full object-cover scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCr7oCzPUs2mX7afBncE0nr5wSnybt-OgYrRaLzitN2IOhu2y12dt7ekqqETYj6yavxX8Ab_9IU2DOmEqAGnsa9Q7dZPsMxACQNvKYbRXFJ4E-JEMGJqXrxnBiEOYjjMvVy4o7c22fgUtMMayRxpr3KzrCIwKjyPzU9mg_wh599VzUD23hCCLjcZh31VfvBQQPiyMty4foaZ_SkJW-VaUKTfhDIdmk4V9KIuMJT8XAmLCZOdnpjoEzIdqTJywQjc7m1oPdi-fzNkkw"/>
                    <div className="absolute inset-0 hero-overlay"></div>
                </div>
                <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
                    <p className="text-white/80 uppercase tracking-[0.3em] font-bold text-xs mb-6">Acolhimento & Propósito</p>
                    <h1 className="font-headline text-5xl md:text-7xl lg:text-8xl font-extrabold text-white tracking-tighter mb-8 leading-[0.9]">
                        movimento<br/>igreja
                    </h1>
                    <div className="w-24 h-1 bg-accent mx-auto mb-10"></div>
                    <p className="text-lg md:text-xl text-white/90 font-light max-w-2xl mx-auto mb-12 leading-relaxed">
                        Onde a organização serve ao organismo. Uma família que vive o evangelho de forma prática e relevante.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button className="px-10 py-4 bg-white text-primary rounded-full font-bold hover:bg-slate-50 transition-all shadow-xl">Fazer parte de um GC</button>
                        <button className="px-10 py-4 bg-transparent border border-white/40 text-white rounded-full font-bold hover:bg-white/10 transition-all backdrop-blur-sm">Conhecer a Visão</button>
                    </div>
                </div>
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
                    <span className="material-symbols-outlined text-white/50 text-3xl">keyboard_double_arrow_down</span>
                </div>
            </section>
            <section className="py-32 px-8 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="font-headline text-4xl font-extrabold text-primary mb-4 tracking-tight">Nossos Pilares</h2>
                        <p className="text-slate-500 max-w-xl mx-auto">Fundamentados em valores que transformam vidas e comunidades.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-12">
                        <div className="tonal-card p-10 rounded-2xl">
                            <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center mb-8 shadow-sm">
                                <span className="material-symbols-outlined text-accent text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>groups</span>
                            </div>
                            <h3 className="font-headline text-2xl font-bold text-primary mb-4">Comunhão</h3>
                            <p className="text-slate-600 leading-relaxed mb-6">Pequenos grupos (GCs) que se reúnem nas casas para cuidado mútuo, amizade e oração.</p>
                            <a className="inline-flex items-center gap-2 text-accent font-bold text-sm uppercase tracking-wider" href="#">Explorar GCs <span className="material-symbols-outlined text-sm">arrow_forward</span></a>
                        </div>
                        <div className="tonal-card p-10 rounded-2xl">
                            <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center mb-8 shadow-sm">
                                <span className="material-symbols-outlined text-accent text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>menu_book</span>
                            </div>
                            <h3 className="font-headline text-2xl font-bold text-primary mb-4">Ensino</h3>
                            <p className="text-slate-600 leading-relaxed mb-6">Uma trilha de discipulado profunda através da nossa Escola de Líderes e TheoFlix.</p>
                            <a className="inline-flex items-center gap-2 text-accent font-bold text-sm uppercase tracking-wider" href="#">Ver Cursos <span className="material-symbols-outlined text-sm">arrow_forward</span></a>
                        </div>
                        <div className="tonal-card p-10 rounded-2xl">
                            <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center mb-8 shadow-sm">
                                <span className="material-symbols-outlined text-accent text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>music_note</span>
                            </div>
                            <h3 className="font-headline text-2xl font-bold text-primary mb-4">Adoração</h3>
                            <p className="text-slate-600 leading-relaxed mb-6">Celebrações focadas em uma adoração que toca o coração de Deus e o nosso espírito.</p>
                            <a className="inline-flex items-center gap-2 text-accent font-bold text-sm uppercase tracking-wider" href="#">Ministério Wave <span className="material-symbols-outlined text-sm">arrow_forward</span></a>
                        </div>
                    </div>
                </div>
            </section>
            <section className="py-32 px-8 bg-slate-50">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-end justify-between mb-16">
                        <div className="max-w-lg">
                            <h2 className="font-headline text-4xl font-extrabold text-primary mb-4">Destaques da Semana</h2>
                            <p className="text-slate-500">Acompanhe as principais frentes de atuação e o que está acontecendo agora.</p>
                        </div>
                        <button className="hidden md:flex items-center gap-2 font-bold text-primary hover:text-accent transition-colors">
                            Ver todos ministérios <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="group relative aspect-[16/9] rounded-2xl overflow-hidden cursor-pointer">
                            <img alt="Wave School" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD5pC4YjEex27xOgOZ89kgyWfTaB7AbSVKpBvp1EMwp0KfsvoLcL3h59lQVoz-Ynm7n9PRiKo1U-mvvX4X0Md_Vd1Z37VSmHbje9dY-wM4kOS0kEs8S1buI88CWGfGTeK27NByLXX8PSgr-Ji-PDWFaEcmapW5rMObnhgzL8JhOs9scqfj-2_vWIKOIFhGUgxFrd8rSVUvJpAPKCrQVADPlVS_i9aaYOv0RzV1eQG1YayG78Fm9x5axBqovuhFluH1fC4x0tj9Zrpw"/>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-10 flex flex-col justify-end">
                                <span className="text-accent font-bold text-xs uppercase tracking-widest mb-3">Artes & Adoração</span>
                                <h3 className="text-white text-3xl font-headline font-bold mb-4">Wave School: Inscrições Abertas</h3>
                                <p className="text-white/70 max-w-md">Desenvolva seus talentos musicais e técnicos para servir no reino.</p>
                            </div>
                        </div>
                        <div className="group relative aspect-[16/9] rounded-2xl overflow-hidden cursor-pointer">
                            <img alt="Social Project" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCWQxQdbUfyPv6delVCo3bmtbhtbyM1aQtTK_qi68aitfQ68RkkgrhUTPXUDbZit9di6LGtRW1AkmLTimqX3m6AG6Hml8LqQp-BmvHNU-PFNwED7X49UtQ2ND0ReBfQb5TwcTfHDUwcgnw9qjqqZ6sh453QnRcAokZuBXLsRoYqtaskEAqTFgzvBCHXyaQurfNHJGg_VePuVLaxW2gy9EuFxbRMKbh5h29OBDGbOkb-CLTDcvfrAYxtNGgIZCp5IrJxOtSe_8WxaQo"/>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-10 flex flex-col justify-end">
                                <span className="text-accent font-bold text-xs uppercase tracking-widest mb-3">Missão Urbana</span>
                                <h3 className="text-white text-3xl font-headline font-bold mb-4">Projeto mãos que Servem</h3>
                                <p className="text-white/70 max-w-md">Impactando nossa cidade através de ações práticas de amor e cuidado.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            <section className="py-32 px-8 bg-white">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-20">
                    <div className="lg:col-span-5">
                        <h2 className="font-headline text-4xl font-extrabold text-primary mb-8 tracking-tight">Próximos Eventos</h2>
                        <div className="space-y-6">
                            <div className="flex gap-6 p-6 rounded-2xl bg-slate-50 border border-slate-100">
                                <div className="flex-shrink-0 w-16 h-16 bg-white rounded-xl flex flex-col items-center justify-center border border-slate-200 shadow-sm">
                                    <span className="text-xs font-bold text-accent uppercase">Out</span>
                                    <span className="text-2xl font-black text-primary leading-none">28</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-primary mb-1">Conferência Legado</h4>
                                    <p className="text-sm text-slate-500 flex items-center gap-1 mb-3">
                                        <span className="material-symbols-outlined text-sm">schedule</span> 19:30 • Auditório Principal
                                    </p>
                                    <button className="text-sm font-bold text-accent">Garantir Ingresso</button>
                                </div>
                            </div>
                            <div className="flex gap-6 p-6 rounded-2xl hover:bg-slate-50 transition-colors">
                                <div className="flex-shrink-0 w-16 h-16 bg-white rounded-xl flex flex-col items-center justify-center border border-slate-100">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Nov</span>
                                    <span className="text-2xl font-black text-slate-700 leading-none">05</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-primary mb-1">Intercâmbio de GCs</h4>
                                    <p className="text-sm text-slate-500 flex items-center gap-1 mb-3">
                                        <span className="material-symbols-outlined text-sm">schedule</span> 20:00 • Diversos Locais
                                    </p>
                                    <button className="text-sm font-bold text-slate-400">Ver detalhes</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-7 bg-primary rounded-3xl p-12 text-white relative overflow-hidden">
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div>
                                <span className="text-accent font-bold text-xs uppercase tracking-widest mb-6 block">Contribuição</span>
                                <h2 className="font-headline text-4xl font-extrabold mb-6 leading-tight">Generosidade que transforma.</h2>
                                <p className="text-white/70 text-lg leading-relaxed mb-10 max-w-md">Suas ofertas e dízimos possibilitam que continuemos alcançando vidas e cuidando da nossa comunidade.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <button className="bg-white text-primary px-8 py-4 rounded-full font-bold hover:bg-slate-100 transition-all text-center">Doar via PIX</button>
                                <button className="bg-white/10 border border-white/20 text-white px-8 py-4 rounded-full font-bold hover:bg-white/20 transition-all text-center">Outras Formas</button>
                            </div>
                        </div>
                        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-accent/20 rounded-full blur-[100px]"></div>
                    </div>
                </div>
            </section>
            <section className="py-24 px-8 bg-slate-50">
                <div className="max-w-4xl mx-auto text-center">
                    <h3 className="font-headline text-3xl font-extrabold text-primary mb-6">Mantenha-se Conectado</h3>
                    <p className="text-slate-600 mb-10 max-w-xl mx-auto">Receba nossa agenda semanal, devocionais e avisos importantes diretamente no seu celular.</p>
                    <form className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
                        <input className="flex-1 px-8 py-4 rounded-full border-none bg-white ring-1 ring-slate-200 focus:ring-2 focus:ring-accent outline-none transition-all" placeholder="(00) 00000-0000" type="tel"/>
                        <button className="px-10 py-4 bg-primary text-white font-bold rounded-full hover:shadow-xl hover:shadow-primary/20 transition-all">Assinar</button>
                    </form>
                </div>
            </section>
        </main>
        <footer className="bg-white border-t border-slate-100 pt-24 pb-12 px-8">
            <div className="max-w-7xl mx-auto">
                <div className="grid md:grid-cols-4 gap-12 mb-20">
                    <div className="col-span-1 md:col-span-1">
                        <div className="flex items-center gap-3 mb-8">
                            <span className="material-symbols-outlined text-primary text-3xl">church</span>
                            <span className="font-headline font-bold text-xl tracking-tight text-primary">IBM</span>
                        </div>
                        <p className="text-slate-500 text-sm leading-relaxed mb-8">
                            Uma comunidade centrada no evangelho, focada em pessoas e apaixonada pela missão de Deus.
                        </p>
                        <div className="flex gap-4">
                            <a className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-accent hover:text-white transition-all" href="#">
                                <span className="material-symbols-outlined text-lg">public</span>
                            </a>
                            <a className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-accent hover:text-white transition-all" href="#">
                                <span className="material-symbols-outlined text-lg">share</span>
                            </a>
                        </div>
                    </div>
                    <div>
                        <h5 className="font-bold text-primary mb-6">Navegação</h5>
                        <ul className="space-y-4 text-sm text-slate-500">
                            <li><a className="hover:text-accent transition-colors" href="#">Nossa Visão</a></li>
                            <li><a className="hover:text-accent transition-colors" href="#">Ministérios</a></li>
                            <li><a className="hover:text-accent transition-colors" href="#">Células (GCs)</a></li>
                            <li><a className="hover:text-accent transition-colors" href="#">Eventos</a></li>
                        </ul>
                    </div>
                    <div>
                        <h5 className="font-bold text-primary mb-6">Recursos</h5>
                        <ul className="space-y-4 text-sm text-slate-500">
                            <li><a className="hover:text-accent transition-colors" href="#">TheoFlix</a></li>
                            <li><a className="hover:text-accent transition-colors" href="#">Portal do Membro</a></li>
                            <li><a className="hover:text-accent transition-colors" href="#">Pedidos de Oração</a></li>
                            <li><a className="hover:text-accent transition-colors" href="#">Dízimos e Ofertas</a></li>
                        </ul>
                    </div>
                    <div>
                        <h5 className="font-bold text-primary mb-6">Localização</h5>
                        <p className="text-sm text-slate-500 mb-4 leading-relaxed">
                            Av. Principal, 1000<br/>
                            Bairro Central, Cidade - UF<br/>
                            CEP: 00000-000
                        </p>
                        <a className="text-accent text-sm font-bold flex items-center gap-2" href="#">
                            <span className="material-symbols-outlined text-sm">map</span> Ver no Google Maps
                        </a>
                    </div>
                </div>
                <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">© 2024 Igreja Batista da Manhã. Architectural Serenity.</p>
                    <div className="flex gap-8 text-xs text-slate-400 font-medium">
                        <a className="hover:text-primary transition-colors" href="#">Termos de Uso</a>
                        <a className="hover:text-primary transition-colors" href="#">Privacidade</a>
                    </div>
                </div>
            </div>
        </footer>
      </body>
    </>
  );
}
