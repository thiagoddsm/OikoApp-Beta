
'use client';

import React from 'react';

// O componente da página agora é um componente simples que retorna o conteúdo.
// A tag <body> e o script de animação foram removidos, pois agora são da responsabilidade do layout.
export default function JantarDosNamoradosPage() {
  return (
    <>
        {/* NAVBAR */}
        <nav className="fixed w-full z-50 top-0 glass-nav border-b border-slate-100 h-20 flex items-center">
            <div className="container mx-auto px-6 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-indigo-900 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <i className="fas fa-heart text-xl text-rose-500"></i>
                    </div>
                    <span className="text-xl font-black tracking-tighter uppercase font-sans-bold">IBM <span className="text-rose-600">TWOGETHER</span></span>
                </div>
                <a href="https://gestaoweb.eklesiaonline.com.br/divulgacao/n/daaae7e93921e5ab9c21" className="bg-rose-600 text-white px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest hover:bg-rose-700 transition">
                    GARANTIR VAGA
                </a>
            </div>
        </nav>

        {/* HERO SECTION */}
        <header className="hero-bg min-h-screen flex items-center pt-20">
            <div className="container mx-auto px-6 text-center text-white">
                <span className="inline-block bg-rose-600 text-white px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.3em] mb-8 shadow-2xl animate-pulse">
                    Sexta, 12 de Junho às 19h
                </span>
                <h1 className="text-5xl md:text-8xl font-black leading-[0.95] mb-8 tracking-tighter">
                    O Riso que <br />
                    <span className="text-rose-400 italic text-6xl md:text-9xl">Restaura.</span>
                </h1>
                <p className="text-xl md:text-2xl text-slate-200 max-w-3xl mx-auto mb-12 font-light leading-relaxed">
                    Um jantar romântico exclusivo com Show de Stand-Up do humorista <span className="font-bold text-white underline decoration-rose-500">Welson Nunes</span>. Gastronomia, riso e aliança no mesmo altar.
                </p>
                <div className="flex flex-col sm:flex-row gap-5 justify-center">
                    <a href="https://gestaoweb.eklesiaonline.com.br/divulgacao/n/daaae7e93921e5ab9c21" className="cta-button bg-rose-600 text-white h-16 px-12 rounded-2xl flex items-center justify-center font-black text-sm uppercase tracking-widest">
                        RESERVAR MINHA MESA AGORA
                    </a>
                </div>
                <div className="mt-12 text-slate-400 text-xs font-bold uppercase tracking-widest">
                    <i className="fas fa-map-marker-alt text-rose-500 mr-2"></i> Templo IBM - Mutondo, São Gonçalo
                </div>
            </div>
        </header>

        {/* A EXPERIÊNCIA */}
        <section className="py-24 bg-white">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-8 uppercase text-indigo-950">Uma Noite <span className="text-rose-600 italic">Estratégica</span></h2>
                        <p className="text-slate-600 text-lg mb-8 leading-relaxed">
                            Esqueça os jantares comuns. Criamos uma experiência de <strong>comunhão estratégica</strong> onde o riso é a ferramenta para tratar a saúde do seu casamento. 
                        </p>
                        <p className="text-slate-600 text-lg mb-10 leading-relaxed">
                            Através da comédia cristã, quebramos barreiras e fortalecemos o que é mais precioso: a sua aliança. Tudo isso acompanhado de uma gastronomia de alto nível.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-50 text-indigo-900 rounded-xl flex items-center justify-center shadow-sm"><i className="fas fa-masks-theater text-xl"></i></div>
                                <span className="font-bold text-slate-800">Show de Stand-Up</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shadow-sm"><i className="fas fa-utensils text-xl"></i></div>
                                <span className="font-bold text-slate-800">Menu Gourmet</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shadow-sm"><i className="fas fa-wine-glass-alt text-xl"></i></div>
                                <span className="font-bold text-slate-800">Mesa Posta</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm"><i className="fas fa-camera text-xl"></i></div>
                                <span className="font-bold text-slate-800">Fotos Oficiais</span>
                            </div>
                        </div>
                    </div>
                    <div className="relative">
                        <div className="absolute -top-10 -left-10 w-32 h-32 bg-rose-100 rounded-full blur-3xl opacity-50"></div>
                        <div className="rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white">
                            <img src="https://images.unsplash.com/photo-1522673607200-16488321499b?q=80&w=800&auto=format&fit=crop" alt="Experiência Casal" className="w-full h-[500px] object-cover hover:scale-105 transition duration-700" />
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* O HUMORISTA */}
        <section className="py-24 bg-indigo-950 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-20 opacity-5 pointer-events-none"><i className="fas fa-laugh text-[20rem]"></i></div>
            <div className="container mx-auto px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h3 className="text-rose-400 font-bold uppercase tracking-[0.3em] mb-4 text-sm">Atração Especial</h3>
                    <h2 className="text-5xl md:text-7xl font-black mb-12 tracking-tighter">Welson Nunes</h2>
                    <div className="bg-white/5 border border-white/10 p-8 md:p-12 rounded-[3rem] backdrop-blur-sm">
                        <p className="text-xl md:text-2xl italic text-slate-300 leading-relaxed mb-8">
                            "O humor que edifica a família. Situações reais que todo casal vive, transformadas em gargalhadas que curam."
                        </p>
                        <div className="flex justify-center gap-4">
                            <span className="bg-white/10 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">Stand-Up Cristão</span>
                            <span className="bg-white/10 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">Saúde do Casamento</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* O CARDÁPIO */}
        <section className="py-24 bg-slate-50">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-6xl font-black text-indigo-950 tracking-tighter uppercase mb-4 text-center">Gastronomia <span className="text-rose-600 italic">AR Eventos</span></h2>
                    <p className="text-slate-500 font-medium">Um menu completo preparado pelos chefes André e Regina.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Entradas */}
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border-t-8 border-amber-500 card-menu transition-all">
                        <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-8 transition-all"><i className="fas fa-cheese text-2xl"></i></div>
                        <h4 className="font-black text-xl mb-6 uppercase">Entradas</h4>
                        <ul className="text-sm text-slate-600 space-y-4">
                            <li className="flex items-center gap-3"><i className="fas fa-check text-amber-500"></i> Bolinho de feijoada</li>
                            <li className="flex items-center gap-3"><i className="fas fa-check text-amber-500"></i> Pérola de queijo c/ mel</li>
                            <li className="flex items-center gap-3"><i className="fas fa-check text-amber-500"></i> Mini quiche alho-poró</li>
                            <li className="flex items-center gap-3"><i className="fas fa-check text-amber-500"></i> Pastel de camarão</li>
                        </ul>
                    </div>
                    {/* Prato Principal */}
                    <div className="bg-indigo-900 p-10 rounded-[2.5rem] shadow-2xl border-t-8 border-rose-500 text-white card-menu scale-105 relative z-10 transition-all">
                        <div className="w-14 h-14 bg-rose-500 text-white rounded-2xl flex items-center justify-center mb-8"><i className="fas fa-hotdog text-2xl text-white"></i></div>
                        <h4 className="font-black text-xl mb-6 uppercase">Prato Principal</h4>
                        <ul className="text-sm text-slate-300 space-y-4">
                            <li><strong className="text-white block">Lagarto ao Molho Madeira</strong></li>
                            <li><strong className="text-white block">Frango ao Molho Branco</strong></li>
                            <li className="text-xs italic opacity-80">Arroz com Nozes, Batata Rústica, Salada Tropical e Farofa.</li>
                        </ul>
                    </div>
                    {/* Sobremesa */}
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border-t-8 border-indigo-950 card-menu transition-all">
                        <div className="w-14 h-14 bg-indigo-50 text-indigo-950 rounded-2xl flex items-center justify-center mb-8 transition-all"><i className="fas fa-ice-cream text-2xl"></i></div>
                        <h4 className="font-black text-xl mb-6 uppercase">Sobremesa</h4>
                        <p className="text-sm text-slate-600 leading-relaxed mb-6">
                            <strong>Brownie Especial:</strong> Servido com chantilly e calda de morango.
                        </p>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Bebidas Inclusas:</p>
                        <p className="text-[11px] text-slate-400 mt-1">Água, Sucos e Refrigerantes.</p>
                    </div>
                </div>
            </div>
        </section>

        {/* INVESTIMENTO & LOTES */}
        <section id="lotes" className="py-24 bg-white">
            <div className="container mx-auto px-6 max-w-4xl">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-black text-indigo-950 tracking-tighter uppercase mb-4">Escolha seu <span className="text-rose-600 italic">Lote</span></h2>
                    <p className="text-slate-500">Valor referente ao convite individual por casal (All-inclusive).</p>
                </div>

                <div className="space-y-4">
                    {/* Promocional */}
                    <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-emerald-50 rounded-3xl border-2 border-emerald-500 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-emerald-500 text-white px-4 py-1 text-[10px] font-black uppercase tracking-widest rounded-bl-xl">MAIS VANTAJOSO</div>
                        <div className="mb-4 md:mb-0">
                            <h4 className="text-lg font-black text-emerald-950 uppercase">PROMOCIONAL IBM</h4>
                            <p className="text-xs text-emerald-700 font-bold">Os primeiros 35 casais • Até 10/04</p>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-sm font-bold text-emerald-900">R$</span>
                            <span className="text-4xl font-black text-emerald-900">190,00</span>
                        </div>
                    </div>
                    {/* 1 Lote */}
                    <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-200">
                        <div className="mb-4 md:mb-0 text-center md:text-left">
                            <h4 className="text-lg font-black text-slate-800 uppercase">1º LOTE</h4>
                            <p className="text-xs text-slate-500 font-bold">Início em 11/04 • Até 30/04</p>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-sm font-bold text-slate-700">R$</span>
                            <span className="text-4xl font-black text-slate-800">200,00</span>
                        </div>
                    </div>
                    {/* 2 Lote */}
                    <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-200 opacity-60">
                        <div className="mb-4 md:mb-0 text-center md:text-left">
                            <h4 className="text-lg font-black text-slate-800 uppercase">2º LOTE</h4>
                            <p className="text-xs text-slate-500 font-bold">Início em 01/05 • Até 15/05</p>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-sm font-bold text-slate-700">R$</span>
                            <span className="text-4xl font-black text-slate-800">220,00</span>
                        </div>
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <a href="https://gestaoweb.eklesiaonline.com.br/divulgacao/n/daaae7e93921e5ab9c21" className="cta-button inline-flex bg-rose-600 text-white h-20 px-16 rounded-[2rem] items-center justify-center font-black text-xl uppercase tracking-widest shadow-2xl mb-6">
                        QUERO MEU INGRESSO
                    </a>
                    <p className="text-slate-400 text-sm font-medium italic">
                        Pagamento via PIX ou em 2x no cartão de crédito via App.
                    </p>
                </div>
            </div>
        </section>

        {/* FAQ */}
        <section className="py-24 bg-indigo-950 text-white">
            <div className="container mx-auto px-6 max-w-4xl">
                <h2 className="text-3xl md:text-4xl font-black text-center mb-16 uppercase tracking-tighter">Perguntas <span className="text-rose-400 italic">Frequentes</span></h2>
                <div className="space-y-6">
                    <div className="border-b border-white/10 pb-6">
                        <h4 className="font-bold text-lg mb-2">Posso levar meus filhos?</h4>
                        <p className="text-slate-400 text-sm leading-relaxed">Não haverá Kids Care neste evento. O propósito é 100% de atenção mútua entre o casal. Pedimos que se organizem com antecedência.</p>
                    </div>
                    <div className="border-b border-white/10 pb-6">
                        <h4 className="font-bold text-lg mb-2">Posso convidar casais visitantes?</h4>
                        <p className="text-slate-400 text-sm leading-relaxed">Com certeza! Este é o evento ideal para apresentar a IBM a novos casais através de uma noite leve e divertida.</p>
                    </div>
                    <div className="border-b border-white/10 pb-6">
                        <h4 className="font-bold text-lg mb-2">Qual o traje sugerido?</h4>
                        <p className="text-slate-400 text-sm leading-relaxed">Sugerimos Esporte Fino. Uma noite elegante pede um visual especial.</p>
                    </div>
                </div>
            </div>
        </section>

        {/* FOOTER */}
        <footer className="bg-white border-t border-slate-100 pt-16 pb-10">
            <div className="container mx-auto px-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="w-8 h-8 bg-indigo-900 rounded-lg flex items-center justify-center text-white shadow-lg">
                        <i className="fas fa-sun text-sm"></i>
                    </div>
                    <span className="text-lg font-black tracking-tighter uppercase font-sans-bold">IBM <span className="text-indigo-600">Manhã</span></span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed mb-8 max-w-xs mx-auto">
                    Travessa Maria Alice, 121 - Mutondo, São Gonçalo - RJ<br />
                    contato@ibmanha.com.br
                </p>
                <div className="flex justify-center gap-6 text-slate-400 mb-12">
                    <a href="https://instagram.com/ibmanha" className="hover:text-rose-600 transition"><i className="fab fa-instagram text-2xl"></i></a>
                    <a href="#" className="hover:text-blue-600 transition"><i className="fab fa-facebook-f text-xl"></i></a>
                    <a href="#" className="hover:text-red-600 transition"><i className="fab fa-youtube text-xl"></i></a>
                </div>
                <div className="pt-8 border-t text-slate-400 text-[10px] uppercase font-bold tracking-widest">
                    © 2026 Igreja Batista da Manhã • Ano da Visão • IBM Core
                </div>
            </div>
        </footer>
    </>
  );
}
