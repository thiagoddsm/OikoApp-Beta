
'use client';

import React from 'react';
import Script from 'next/script';

const retreatHtmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Retiro IBM 2026: Cronograma & Trilha</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap');
        
        body {
            font-family: 'Inter', sans-serif;
            background-color: #f8fafc;
        }
        
        /* --- ESTILOS GERAIS --- */
        .card-shadow {
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .card-shadow:hover {
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            transform: translateY(-2px);
        }

        .active-tab {
            border-bottom: 3px solid #0ea5e9;
            color: #0ea5e9;
            font-weight: 700;
            background-color: #f0f9ff;
        }

        .inactive-tab {
            border-bottom: 3px solid transparent;
            color: #64748b;
        }

        /* --- ANIMAÇÕES DE DETALHES --- */
        .details-content {
            max-height: 0;
            opacity: 0;
            overflow: hidden;
            transition: all 0.5s ease-in-out;
        }
        
        .details-open {
            max-height: 2000px;
            opacity: 1;
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid #e2e8f0;
        }

        .chevron-icon {
            transition: transform 0.3s ease;
        }

        .rotate-180 {
            transform: rotate(180deg);
        }

        /* --- LINHAS DO TEMPO --- */
        .timeline-line {
            position: absolute;
            left: 24px;
            top: 0;
            bottom: 0;
            width: 2px;
            background-color: #e2e8f0;
            z-index: 0;
        }

        .metro-line {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            width: 4px;
            height: 100%;
            background: linear-gradient(to bottom, #94a3b8 0%, #0ea5e9 25%, #f43f5e 50%, #8b5cf6 75%, #10b981 100%);
            z-index: 0;
            border-radius: 4px;
        }

        /* --- TAGS E BADGES (SISTEMA DE CORES) --- */
        .badge-base {
            display: inline-flex;
            align-items: center;
            font-size: 0.65rem;
            font-weight: 800;
            text-transform: uppercase;
            padding: 3px 8px;
            border-radius: 4px;
            margin-right: 6px;
            margin-bottom: 6px;
            letter-spacing: 0.025em;
        }

        /* STATUS (Verde) - O que eu sou */
        .badge-status {
            background-color: #ecfdf5; /* emerald-50 */
            color: #047857; /* emerald-700 */
            border: 1px solid #a7f3d0; /* emerald-200 */
        }

        /* CURSO (Azul) - O que eu estudo */
        .badge-course {
            background-color: #eef2ff; /* indigo-50 */
            color: #4338ca; /* indigo-700 */
            border: 1px solid #c7d2fe; /* indigo-200 */
        }

        /* DISCIPULADO (Laranja) - Com quem eu ando (7 Passos) */
        .badge-discipulado {
            background-color: #fffbeb; /* amber-50 */
            color: #b45309; /* amber-700 */
            border: 1px solid #fde68a; /* amber-200 */
        }

        .info-row {
            display: flex;
            align-items: flex-start;
            margin-bottom: 8px;
            font-size: 0.85rem;
            color: #475569;
        }
        
        .info-row i {
            width: 20px;
            margin-top: 3px;
            flex-shrink: 0;
        }

        /* Animação do anel central */
        @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 0.5; }
            100% { transform: scale(2); opacity: 0; }
        }
        
        .animate-ring::before {
            content: '';
            position: absolute;
            left: 0; top: 0;
            width: 100%; height: 100%;
            border-radius: 50%;
            background-color: inherit;
            animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
            z-index: -1;
        }
    </style>
</head>
<body class="text-gray-800">

    <!-- Header -->
    <header class="bg-gradient-to-r from-slate-900 to-slate-800 text-white pb-6 pt-8 px-4 shadow-lg sticky top-0 z-50">
        <div class="max-w-4xl mx-auto text-center">
            <div class="inline-block bg-sky-600 text-[10px] font-bold px-2 py-1 rounded-full mb-2 tracking-wide uppercase">
                Planejamento Estratégico
            </div>
            <h1 class="text-2xl md:text-3xl font-bold mb-1">Retiro IBM 2026</h1>
            <p class="text-sky-200 text-sm font-light">"Pela Visão: Crescimento Saudável"</p>
        </div>
    </header>

    <!-- Navigation Tabs -->
    <div class="sticky top-[110px] md:top-[120px] z-40 bg-white shadow-md border-t border-slate-100">
        <div class="max-w-4xl mx-auto flex">
            <button onclick="switchTab('day1')" id="tab-day1" class="flex-1 py-3 text-center active-tab transition-colors focus:outline-none">
                <span class="block text-sm font-bold uppercase tracking-wider">Sáb</span>
                <span class="text-[10px] text-gray-500">03 JAN</span>
            </button>
            <button onclick="switchTab('day2')" id="tab-day2" class="flex-1 py-3 text-center inactive-tab transition-colors focus:outline-none">
                <span class="block text-sm font-bold uppercase tracking-wider">Dom</span>
                <span class="text-[10px] text-gray-500">04 JAN</span>
            </button>
            <button onclick="switchTab('trilha')" id="tab-trilha" class="flex-1 py-3 text-center inactive-tab transition-colors focus:outline-none bg-slate-50 border-l border-slate-100">
                <span class="block text-sm font-bold uppercase tracking-wider text-sky-700"><i class="fas fa-map-signs mr-1"></i> Jornada</span>
                <span class="text-[10px] text-sky-600">Trilha 2026</span>
            </button>
        </div>
    </div>

    <!-- Main Content -->
    <main class="max-w-4xl mx-auto px-4 py-8 relative min-h-screen">
        
        <!-- ================= ABA SÁBADO (DIA 1) ================= -->
        <div id="content-day1" class="relative tab-content">
            <div class="timeline-line"></div>

            <!-- Item 1: Café -->
            <div class="relative pl-12 mb-8 group cursor-pointer" onclick="toggleDetails('d1-i1')">
                <div class="absolute left-4 top-2 w-4 h-4 rounded-full bg-amber-200 border-2 border-white z-10 group-hover:bg-amber-400 transition-colors"></div>
                <div class="bg-white rounded-xl p-5 card-shadow border-l-4 border-amber-300">
                    <div class="flex justify-between items-center">
                        <div>
                            <span class="text-xs font-bold text-amber-600 mb-1 block">08:30 - 09:30</span>
                            <h3 class="text-lg font-bold text-slate-800"><i class="fas fa-coffee mr-2 text-amber-500"></i>Café de Abertura</h3>
                        </div>
                        <i id="icon-d1-i1" class="fas fa-chevron-down text-slate-300 chevron-icon"></i>
                    </div>
                    <div id="d1-i1" class="details-content">
                        <p class="text-sm text-slate-600">Momento de comunhão, chegada, check-in e retirada dos materiais (Kit do Líder). Começamos o dia conectando pessoas.</p>
                    </div>
                </div>
            </div>

            <!-- Item 2: CULTO MANHÃ -->
            <div class="relative pl-12 mb-8 group cursor-pointer" onclick="toggleDetails('d1-i2')">
                <div class="absolute left-2 top-2 w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center z-10 shadow-md">
                    <i class="fas fa-church text-xs"></i>
                </div>
                <div class="bg-white rounded-xl p-5 card-shadow border-l-4 border-sky-600">
                    <div class="flex justify-between items-center">
                        <div>
                            <span class="text-xs font-bold text-sky-600 mb-1 block">09:30 - 12:00 • INSPIRAÇÃO</span>
                            <h3 class="text-lg font-bold text-slate-800">Culto: O Coração do Discipulado</h3>
                        </div>
                        <i id="icon-d1-i2" class="fas fa-chevron-down text-slate-300 chevron-icon"></i>
                    </div>
                    <div id="d1-i2" class="details-content">
                        <div class="space-y-2 text-sm text-slate-600">
                            <p><strong>Ministrante:</strong> Pr. Hugo</p>
                            <p><strong>Tema:</strong> "Formando Líderes como Jesus".</p>
                            <p>Uma imersão profunda na visão bíblica de discipulado. Antes de falarmos de métodos, precisamos alinhar o coração e a visão espiritual para 2026.</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Item 3: Almoço -->
            <div class="relative pl-12 mb-8">
                <div class="absolute left-4 top-2 w-4 h-4 rounded-full bg-amber-500 border-2 border-white z-10"></div>
                <div class="flex items-center text-slate-500 text-sm font-semibold bg-amber-50 px-3 py-2 rounded-lg w-max shadow-sm border border-amber-100">
                    <span class="mr-2">12:00 - 14:00</span> <i class="fas fa-utensils mr-2 text-amber-500"></i> Almoço
                </div>
            </div>

            <!-- Item 4: Intervalo -->
            <div class="relative pl-12 mb-8">
                <div class="absolute left-4 top-2 w-4 h-4 rounded-full bg-slate-300 border-2 border-white z-10"></div>
                <div class="flex items-center text-slate-400 text-sm italic">
                    <span class="font-bold mr-2">14:00 - 16:30</span> <i class="fas fa-bed mr-2"></i> Intervalo / Tempo Livre
                </div>
            </div>

            <!-- Item 4.5: Reativação -->
            <div class="relative pl-12 mb-8 group cursor-pointer" onclick="toggleDetails('d1-i45')">
                <div class="absolute left-4 top-2 w-4 h-4 rounded-full bg-orange-400 border-2 border-white z-10 group-hover:bg-orange-500 transition-colors"></div>
                <div class="bg-white rounded-xl p-5 card-shadow border-l-4 border-orange-400">
                    <div class="flex justify-between items-center">
                        <div>
                            <span class="text-xs font-bold text-orange-600 mb-1 block">16:30 - 17:00</span>
                            <h3 class="text-lg font-bold text-slate-800"><i class="fas fa-bolt mr-2 text-orange-500"></i>Reativação & Café</h3>
                        </div>
                        <i id="icon-d1-i45" class="fas fa-chevron-down text-slate-300 chevron-icon"></i>
                    </div>
                    <div id="d1-i45" class="details-content">
                        <p class="text-sm text-slate-600">Momento estratégico para "acordar" o cérebro pós-intervalo. Café forte e uma dinâmica rápida de interação para preparar o ambiente para o Hackathon.</p>
                    </div>
                </div>
            </div>

            <!-- Item 5: HACKATHON TRILHA -->
            <div class="relative pl-12 mb-8 group cursor-pointer" onclick="toggleDetails('d1-i5')">
                <div class="absolute left-2 top-2 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center z-10 shadow-md">
                    <i class="fas fa-route text-xs"></i>
                </div>
                <div class="bg-white rounded-xl p-5 card-shadow border-l-4 border-indigo-600 relative overflow-hidden">
                    <div class="absolute top-0 right-0 bg-indigo-100 text-indigo-800 text-[9px] font-bold px-2 py-1 rounded-bl">SPRINT 1</div>
                    <div class="flex justify-between items-center">
                        <div>
                            <span class="text-xs font-bold text-indigo-600 mb-1 block">17:00 - 18:30 • A TRILHA</span>
                            <h3 class="text-lg font-bold text-slate-800">Hackathon: A Jornada do Membro</h3>
                        </div>
                        <i id="icon-d1-i5" class="fas fa-chevron-down text-slate-300 chevron-icon"></i>
                    </div>
                    <div id="d1-i5" class="details-content">
                        <div class="space-y-4 text-sm text-slate-600">
                            
                            <!-- Bloco de Conteúdo (Teoria) -->
                            <div class="bg-indigo-50 p-4 rounded-lg border border-indigo-100 shadow-sm">
                                <h4 class="font-bold text-indigo-900 mb-2 flex items-center">
                                    <i class="fas fa-lightbulb text-yellow-500 mr-2"></i>Conceito Chave: "De Consumidor a Catalisador"
                                </h4>
                                <p class="text-xs text-indigo-800 mb-3 leading-relaxed">
                                    Não queremos apenas membros que "passam de fase", mas que se tornam <strong>Abençoadores</strong>. O objetivo é sair da pergunta <em>"O que eu ganho?"</em> para <em>"Quem eu posso abençoar hoje?"</em>.
                                </p>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                    <div class="bg-white p-3 rounded border border-indigo-100">
                                        <strong class="block text-indigo-700 mb-1"><i class="fas fa-tint mr-1"></i>1. A Fonte</strong>
                                        Nós somos canal, não fonte. Só transbordamos o que recebemos de Deus.
                                    </div>
                                    <div class="bg-white p-3 rounded border border-indigo-100">
                                        <strong class="block text-indigo-700 mb-1"><i class="fas fa-hand-holding-heart mr-1"></i>2. A Atitude</strong>
                                        Sair da postura de "Convidado" (espera ser servido) para "Anfitrião" (garante o bem-estar).
                                    </div>
                                    <div class="bg-white p-3 rounded border border-indigo-100">
                                        <strong class="block text-indigo-700 mb-1"><i class="fas fa-users mr-1"></i>3. A Prática</strong>
                                        O "GC 24/7". O cuidado mútuo acontece antes, durante e depois da reunião semanal.
                                    </div>
                                </div>
                            </div>

                            <!-- Bloco de Instruções Práticas (Dinâmica) -->
                            <div class="border-t pt-4 border-slate-200">
                                <p class="font-bold text-slate-700 mb-2"><i class="fas fa-hammer mr-1 text-indigo-600"></i> Dinâmica Prática:</p>
                                <ol class="list-decimal pl-5 space-y-2 text-xs">
                                    <li><strong>Análise do Mapa:</strong> Cada grupo recebe a "Trilha 2026" impressa. Analisem criticamente o fluxo.</li>
                                    <li><strong>O Check Humano (F.D.E.):</strong> Validar o critério para aprovação dupla:
                                        <ul class="list-disc pl-4 text-slate-500 mt-1">
                                            <li>Para passar de fase, o membro precisa da aprovação do <strong>Mentor</strong> e do <strong>Supervisor</strong>.</li>
                                            <li><strong>Critério:</strong> F.D.E. (Fiel, Disponível, Ensinável). O membro demonstra isso na prática?</li>
                                        </ul>
                                    </li>
                                    <li><strong>Co-criação:</strong> Escrevam em post-its sugestões para melhorar a retenção em cada fase.</li>
                                </ol>
                                <div class="bg-indigo-600 text-white p-2 rounded mt-3 text-center text-xs font-bold">
                                    OBJETIVO FINAL: Validar o fluxo da Trilha e os critérios de Aprovação Humana para o App.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Item 6: SWOT PARTE 1 (EXTERNO) -->
            <div class="relative pl-12 mb-8 group cursor-pointer" onclick="toggleDetails('d1-i6')">
                <div class="absolute left-2 top-2 w-8 h-8 rounded-full bg-slate-600 text-white flex items-center justify-center z-10 shadow-md">
                    <i class="fas fa-globe text-xs"></i>
                </div>
                <div class="bg-white rounded-xl p-5 card-shadow border-l-4 border-slate-600 relative overflow-hidden">
                    <div class="absolute top-0 right-0 bg-slate-200 text-slate-800 text-[9px] font-bold px-2 py-1 rounded-bl">SPRINT 2</div>
                    <div class="flex justify-between items-center">
                        <div>
                            <span class="text-xs font-bold text-slate-600 mb-1 block">18:30 - 20:00 • ESTRATÉGIA</span>
                            <h3 class="text-lg font-bold text-slate-800">SWOT Parte 1: O Cenário (Externo)</h3>
                        </div>
                        <i id="icon-d1-i6" class="fas fa-chevron-down text-slate-300 chevron-icon"></i>
                    </div>
                    <div id="d1-i6" class="details-content">
                        <div class="space-y-4 text-sm text-slate-600">
                            <p class="text-xs italic bg-slate-50 p-2 rounded">"Olhar para fora para sonhar grande. O que está acontecendo ao nosso redor?"</p>
                            <div>
                                <p class="font-bold text-slate-700 mb-2"><i class="fas fa-tasks mr-1 text-slate-600"></i> Dinâmica:</p>
                                <ul class="list-none space-y-2 text-xs">
                                    <li class="flex items-start">
                                        <div class="w-2 h-2 rounded-full bg-blue-500 mt-1 mr-2 flex-shrink-0"></div>
                                        <span><strong>Oportunidades:</strong> O que o bairro/cidade nos oferece? (Ex: Novos condomínios, Expansão escolar).</span>
                                    </li>
                                    <li class="flex items-start">
                                        <div class="w-2 h-2 rounded-full bg-orange-500 mt-1 mr-2 flex-shrink-0"></div>
                                        <span><strong>Ameaças:</strong> O que pode nos parar? (Ex: Crise econômica, Competição, Esfriamento).</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

             <!-- Item 7: Jantar -->
             <div class="relative pl-12 mb-8">
                <div class="absolute left-4 top-2 w-4 h-4 rounded-full bg-amber-600 border-2 border-white z-10"></div>
                <div class="flex items-center text-slate-500 text-sm font-semibold bg-amber-50 px-3 py-2 rounded-lg w-max shadow-sm border border-amber-100">
                    <span class="mr-2">20:00 - 21:00</span> <i class="fas fa-utensils mr-2 text-amber-600"></i> Jantar
                </div>
            </div>

            <!-- Item 8: CULTO NOITE -->
            <div class="relative pl-12 mb-8 group cursor-pointer" onclick="toggleDetails('d1-i8')">
                <div class="absolute left-4 top-2 w-4 h-4 rounded-full bg-slate-800 border-2 border-white z-10"></div>
                <div class="bg-slate-800 rounded-xl p-5 card-shadow text-white">
                    <div class="flex justify-between items-center">
                        <div>
                            <span class="text-xs font-bold text-slate-400 mb-1 block">21:00 - 22:30</span>
                            <h3 class="text-lg font-bold">Culto de Inspiração & Adoração</h3>
                        </div>
                        <i id="icon-d1-i8" class="fas fa-chevron-down text-slate-400 chevron-icon"></i>
                    </div>
                    <div id="d1-i8" class="details-content">
                        <p class="text-sm text-slate-300 mt-2">
                            Corujão de Adoração. Consagração do dia de trabalho. Um momento para recarregar as energias espirituais e alinhar o propósito para o Domingo.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- ================= ABA DOMINGO (DIA 2) ================= -->
        <div id="content-day2" class="relative hidden tab-content">
            <div class="timeline-line"></div>

            <!-- Item 0: Café Domingo -->
            <div class="relative pl-12 mb-8 group cursor-pointer" onclick="toggleDetails('d2-i0')">
                <div class="absolute left-4 top-2 w-4 h-4 rounded-full bg-amber-200 border-2 border-white z-10 group-hover:bg-amber-400 transition-colors"></div>
                <div class="bg-white rounded-xl p-5 card-shadow border-l-4 border-amber-300">
                    <div class="flex justify-between items-center">
                        <div>
                            <span class="text-xs font-bold text-amber-600 mb-1 block">08:00 - 09:00</span>
                            <h3 class="text-lg font-bold text-slate-800"><i class="fas fa-coffee mr-2 text-amber-500"></i>Café da Manhã</h3>
                        </div>
                        <i id="icon-d2-i0" class="fas fa-chevron-down text-slate-300 chevron-icon"></i>
                    </div>
                    <div id="d2-i0" class="details-content">
                        <p class="text-sm text-slate-600">Comunhão e preparação para um dia estratégico.</p>
                    </div>
                </div>
            </div>

            <!-- Item 1: SWOT PARTE 2 (INTERNO) -->
            <div class="relative pl-12 mb-8 group cursor-pointer" onclick="toggleDetails('d2-i1')">
                <div class="absolute left-2 top-2 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center z-10 shadow-md">
                    <i class="fas fa-chart-pie text-xs"></i>
                </div>
                <div class="bg-white rounded-xl p-5 card-shadow border-l-4 border-indigo-600 relative overflow-hidden">
                    <div class="absolute top-0 right-0 bg-indigo-100 text-indigo-800 text-[9px] font-bold px-2 py-1 rounded-bl">SPRINT 3</div>
                    <div class="flex justify-between items-center">
                        <div>
                            <span class="text-xs font-bold text-indigo-600 mb-1 block">09:00 - 10:30 • DIAGNÓSTICO</span>
                            <h3 class="text-lg font-bold text-slate-800">SWOT Parte 2: O Espelho (Interno + Ação)</h3>
                        </div>
                        <i id="icon-d2-i1" class="fas fa-chevron-down text-slate-300 chevron-icon"></i>
                    </div>
                    <div id="d2-i1" class="details-content">
                        <div class="space-y-4 text-sm text-slate-600">
                            
                            <div class="bg-indigo-50 p-3 rounded border border-indigo-100">
                                <p class="font-bold text-indigo-900 mb-1"><i class="fas fa-globe mr-1"></i> Objetivo Macro:</p>
                                <p class="text-xs">Realizar um diagnóstico <strong>Institucional (Geral)</strong> da Igreja IBM como um todo, não por departamentos isolados. Olhar para o corpo completo.</p>
                            </div>

                            <div>
                                <p class="font-bold text-slate-700 mb-2"><i class="fas fa-users mr-1 text-indigo-600"></i> Dinâmica "O Grande Espelho":</p>
                                <ol class="list-decimal pl-5 space-y-2 text-xs">
                                    <li><strong>Visão Sistêmica:</strong> Esqueçam seus cargos específicos. Pensem como "Donos" da IBM.</li>
                                    <li><strong>Preenchimento da Matriz Geral (45min):</strong> Identificar Forças, Fraquezas, Oportunidades e Ameaças.</li>
                                    <li class="mt-2"><strong>Ação (45min):</strong> Para cada Fraqueza crítica identificada, sugerir 1 solução prática.</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Item 2: Coffee -->
            <div class="relative pl-12 mb-8">
                <div class="absolute left-4 top-2 w-4 h-4 rounded-full bg-amber-200 border-2 border-white z-10"></div>
                <div class="flex items-center text-slate-500 text-sm italic">
                    <span class="font-bold mr-2">10:30 - 10:50</span> <i class="fas fa-coffee mr-2"></i> Coffee Break Rápido
                </div>
            </div>

            <!-- Item 3: HACKATHON CULTURA -->
            <div class="relative pl-12 mb-8 group cursor-pointer" onclick="toggleDetails('d2-i3')">
                <div class="absolute left-2 top-2 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center z-10 shadow-md">
                    <i class="fas fa-fingerprint text-xs"></i>
                </div>
                <div class="bg-white rounded-xl p-5 card-shadow border-l-4 border-emerald-600 relative overflow-hidden">
                    <div class="absolute top-0 right-0 bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-1 rounded-bl">SPRINT 4</div>
                    <div class="flex justify-between items-center">
                        <div>
                            <span class="text-xs font-bold text-emerald-600 mb-1 block">10:50 - 12:15 • CULTURA</span>
                            <h3 class="text-lg font-bold text-slate-800">Hackathon: O DNA da IBM</h3>
                        </div>
                        <i id="icon-d2-i3" class="fas fa-chevron-down text-slate-300 chevron-icon"></i>
                    </div>
                    <div id="d2-i3" class="details-content">
                        <div class="space-y-4 text-sm text-slate-600">
                            
                            <!-- PONTE DE ESPERANÇA -->
                            <div class="bg-emerald-50 p-4 rounded border-l-4 border-emerald-500">
                                <h4 class="font-bold text-emerald-900 mb-1"><i class="fas fa-bridge mr-2"></i>A Ponte de Esperança (Pr. Hugo)</h4>
                                <p class="text-xs text-emerald-800 italic">
                                    "A SWOT mostrou quem somos hoje (com falhas). A Cultura vai definir quem seremos amanhã para vencer essas falhas. Não deixe o luto da realidade matar o sonho do futuro."
                                </p>
                            </div>

                            <div class="mt-4">
                                <p class="font-bold text-slate-700 mb-2"><i class="fas fa-tasks mr-1 text-emerald-600"></i> Dinâmica: "O Que Fica e O Que Sai"</p>
                                <ul class="list-none space-y-2 text-xs">
                                    <li class="flex items-start">
                                        <div class="w-2 h-2 rounded-full bg-green-500 mt-1 mr-2 flex-shrink-0"></div>
                                        <span><strong>Verde (O que fica):</strong> Comportamentos atuais que reforçam os valores e queremos manter.</span>
                                    </li>
                                    <li class="flex items-start">
                                        <div class="w-2 h-2 rounded-full bg-red-500 mt-1 mr-2 flex-shrink-0"></div>
                                        <span><strong>Vermelho (O que sai):</strong> Comportamentos que toleramos hoje, mas precisamos eliminar (Ex: Fofoca, Atraso, Falta de Excelência).</span>
                                    </li>
                                    <li class="flex items-start">
                                        <div class="w-2 h-2 rounded-full bg-slate-500 mt-1 mr-2 flex-shrink-0"></div>
                                        <span><strong>Consolidação:</strong> Definir 5 Valores Centrais e 3 comportamentos práticos para cada um.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Item 4: Encerramento -->
            <div class="relative pl-12 mb-8 group cursor-pointer" onclick="toggleDetails('d2-i4')">
                <div class="absolute left-2 top-2 w-8 h-8 rounded-full bg-sky-800 text-white flex items-center justify-center z-10 shadow-md">
                    <i class="fas fa-dove text-xs"></i>
                </div>
                <div class="bg-white rounded-xl p-5 card-shadow border-l-4 border-sky-800 bg-sky-50">
                    <div class="flex justify-between items-center">
                        <div>
                            <span class="text-xs font-bold text-sky-800 mb-1 block">12:15 - 13:00</span>
                            <h3 class="text-lg font-bold text-slate-800">Encerramento & Unção</h3>
                        </div>
                        <i id="icon-d2-i4" class="fas fa-chevron-down text-slate-400 chevron-icon"></i>
                    </div>
                    <div id="d2-i4" class="details-content">
                        <p class="text-sm text-slate-600">
                            Consagração da liderança, oração pelos planos traçados e envio oficial para o ano de 2026.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Item 5: Almoço Final -->
             <div class="relative pl-12 mb-8">
                <div class="absolute left-4 top-2 w-4 h-4 rounded-full bg-amber-500 border-2 border-white z-10"></div>
                <div class="flex items-center text-slate-500 text-sm font-semibold bg-amber-50 px-3 py-2 rounded-lg w-max shadow-sm border border-amber-100">
                    <span class="mr-2">13:00</span> <i class="fas fa-flag-checkered mr-2 text-amber-600"></i> Almoço de Encerramento
                </div>
            </div>
        </div>

        <!-- ================= ABA JORNADA (TRILHA DETALHADA) ================= -->
        <div id="content-trilha" class="relative hidden tab-content">
            <!-- LEGENDA DE CORES -->
            <div class="flex justify-center flex-wrap gap-4 mb-6 px-4">
                <div class="flex items-center text-[10px] text-emerald-800 font-bold uppercase tracking-wide bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    <div class="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div> STATUS
                </div>
                <div class="flex items-center text-[10px] text-indigo-800 font-bold uppercase tracking-wide bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                    <div class="w-2 h-2 rounded-full bg-indigo-500 mr-2"></div> CURSO/TEORIA
                </div>
                <div class="flex items-center text-[10px] text-amber-800 font-bold uppercase tracking-wide bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                    <div class="w-2 h-2 rounded-full bg-amber-500 mr-2"></div> DISCIPULADO
                </div>
            </div>

            <div class="text-center mb-8">
                <h2 class="text-2xl font-bold text-slate-800">Jornada do Membro 2026</h2>
                <p class="text-sm text-slate-500 mt-1">"Do banco para o serviço, da multidão para a liderança"</p>
            </div>

            <div class="relative pb-16">
                <!-- Linha Central -->
                <div class="hidden md:block metro-line rounded-full"></div>

                <!-- 1. FASE DE ENTRADA -->
                <div class="mb-12 relative">
                    <div class="flex justify-center mb-6">
                        <span class="bg-gray-100 text-gray-800 text-xs font-bold px-4 py-1.5 rounded-full uppercase border border-gray-300 tracking-wider shadow-sm">1. Entrada e Conversão</span>
                    </div>
                    
                    <!-- PASSO 1: NOVO CONVERTIDO -->
                    <div class="flex flex-col md:flex-row items-center justify-between mb-8 group" onclick="toggleDetails('trilha-1')">
                        <div class="w-full md:w-5/12 order-2 md:order-1 md:text-right pr-0 md:pr-10 flex flex-col gap-2 md:items-end cursor-pointer">
                            <span class="bg-white border border-gray-200 text-gray-500 text-[10px] uppercase font-bold px-3 py-1 rounded-full shadow-sm">Não Alcançado</span>
                            <span class="bg-white border border-gray-200 text-gray-500 text-[10px] uppercase font-bold px-3 py-1 rounded-full shadow-sm">Vindo de GC</span>
                            <span class="bg-white border border-gray-200 text-gray-500 text-[10px] uppercase font-bold px-3 py-1 rounded-full shadow-sm">Recém Chegado</span>
                        </div>
                        <div class="order-1 md:order-2 w-12 h-12 rounded-full bg-gray-400 border-4 border-white shadow-lg flex items-center justify-center z-10 animate-ring relative my-4 md:my-0 cursor-pointer group-hover:scale-110 transition-transform">
                            <i class="fas fa-door-open text-white text-sm"></i>
                        </div>
                        <div class="w-full md:w-5/12 order-3 pl-0 md:pl-10">
                            <div class="bg-white p-5 rounded-2xl shadow-md border-l-4 border-emerald-400 step-card relative text-left cursor-pointer group-hover:shadow-lg transition-all">
                                <div class="flex justify-between items-center">
                                    <div>
                                        <span class="badge-base badge-status">NOVO CONVERTIDO</span>
                                    </div>
                                    <i id="icon-trilha-1" class="fas fa-chevron-down text-gray-300 chevron-icon"></i>
                                </div>
                                <div class="mt-2">
                                    <span class="badge-base badge-discipulado">7 ENCONTROS QUINZENAIS</span>
                                    <div id="trilha-1" class="details-content">
                                        <div class="info-row mt-2"><i class="fas fa-bullseye text-sky-500"></i> <span><strong>Objetivo:</strong> Acolher e conectar.</span></div>
                                        <div class="info-row"><i class="fas fa-user-friends text-sky-500"></i> <span><strong>Responsável:</strong> Co-líder ou Consolidador.</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 2. FASE DE FUNDAMENTOS -->
                <div class="mb-12 relative">
                    <div class="flex justify-center mb-6">
                        <span class="bg-sky-100 text-sky-800 text-xs font-bold px-4 py-1.5 rounded-full uppercase border border-sky-300 tracking-wider shadow-sm">2. Fundamentos</span>
                    </div>

                    <!-- PASSO 2: BATISMO -->
                    <div class="flex flex-col md:flex-row items-center justify-between mb-8 group" onclick="toggleDetails('trilha-2')">
                        <div class="w-full md:w-5/12 order-2 md:order-1"></div>
                        <div class="order-1 md:order-2 w-12 h-12 rounded-full bg-sky-500 border-4 border-white shadow-lg flex items-center justify-center z-10 my-2 cursor-pointer group-hover:scale-110 transition-transform">
                            <i class="fas fa-water text-white text-sm"></i>
                        </div>
                        <div class="w-full md:w-5/12 order-3 pl-0 md:pl-10">
                            <div class="bg-white p-5 rounded-2xl shadow-md border-r-4 border-emerald-500 step-card relative text-left cursor-pointer group-hover:shadow-lg transition-all">
                                <div class="flex justify-between items-center">
                                    <span class="badge-base badge-status">BATISMO</span>
                                    <i id="icon-trilha-2" class="fas fa-chevron-down text-slate-300 chevron-icon"></i>
                                </div>
                                <div class="mt-2">
                                    <span class="badge-base badge-course">ANEXO: IMERSÃO</span>
                                    <span class="badge-base badge-discipulado">7 ENCONTROS QUINZENAIS</span>
                                    <div id="trilha-2" class="details-content">
                                        <div class="info-row mt-2"><i class="fas fa-book text-sky-500"></i> <span><strong>Conteúdo:</strong> Salvação, Batismo e Ceia.</span></div>
                                        <div class="bg-sky-50 p-2 rounded text-xs text-sky-800 mt-2 border border-sky-100">
                                            <strong>Marco:</strong> Testemunho público nas águas.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- PASSO 3: MEMBRO -->
                    <div class="flex flex-col md:flex-row items-center justify-between mb-8 group" onclick="toggleDetails('trilha-3')">
                        <div class="w-full md:w-5/12 order-2 md:order-1 md:text-right pr-0 md:pr-10">
                            <div class="bg-white p-5 rounded-2xl shadow-md border-l-4 border-emerald-500 step-card relative cursor-pointer group-hover:shadow-lg transition-all">
                                <div class="flex justify-between items-center md:flex-row-reverse">
                                    <span class="badge-base badge-status">MEMBRO</span>
                                    <i id="icon-trilha-3" class="fas fa-chevron-down text-slate-300 chevron-icon"></i>
                                </div>
                                <div class="mt-2 flex flex-col md:items-end">
                                    <div class="flex gap-1 flex-wrap justify-end">
                                        <span class="badge-base badge-course">CURSO DE MEMBRO</span>
                                        <span class="badge-base badge-status">MIN. CELEBRAÇÃO</span>
                                    </div>
                                    <span class="badge-base badge-discipulado self-end">7 ENCONTROS QUINZENAIS</span>
                                    <div id="trilha-3" class="details-content text-left md:text-right w-full">
                                        <div class="info-row mt-2 md:flex-row-reverse"><i class="fas fa-handshake text-sky-500 md:ml-2 md:mr-0"></i> <span><strong>Foco:</strong> Aliança e DNA da Igreja.</span></div>
                                        <div class="info-row md:flex-row-reverse"><i class="fas fa-users text-sky-500 md:ml-2 md:mr-0"></i> <span><strong>Requisito:</strong> Estar ativo em um GC.</span></div>
                                        <div class="info-row md:flex-row-reverse"><i class="fas fa-laptop text-sky-500 md:ml-2 md:mr-0"></i> <span><strong>Flexibilidade:</strong> Disponível EAD/Mentoria.</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="order-1 md:order-2 w-12 h-12 rounded-full bg-sky-500 border-4 border-white shadow-lg flex items-center justify-center z-10 my-2 cursor-pointer group-hover:scale-110 transition-transform">
                            <i class="fas fa-id-card text-white text-sm"></i>
                        </div>
                        <div class="w-full md:w-5/12 order-3"></div>
                    </div>
                </div>

                <!-- 3. CONSOLIDAÇÃO -->
                <div class="mb-12 relative">
                    <div class="flex justify-center mb-6">
                        <span class="bg-rose-100 text-rose-800 text-xs font-bold px-4 py-1.5 rounded-full uppercase border border-rose-300 tracking-wider shadow-sm">3. Consolidação e Liderança</span>
                    </div>

                    <!-- PASSO 4: CONSOLIDAÇÃO -->
                    <div class="flex flex-col md:flex-row items-center justify-between mb-8 group" onclick="toggleDetails('trilha-4')">
                        <div class="w-full md:w-5/12 order-2 md:order-1"></div>
                        <div class="order-1 md:order-2 w-12 h-12 rounded-full bg-rose-500 border-4 border-white shadow-lg flex items-center justify-center z-10 my-2 cursor-pointer group-hover:scale-110 transition-transform">
                            <i class="fas fa-shield-alt text-white text-sm"></i>
                        </div>
                        <div class="w-full md:w-5/12 order-3 pl-0 md:pl-10">
                            <div class="bg-white p-5 rounded-2xl shadow-md border-r-4 border-emerald-500 step-card relative text-left cursor-pointer group-hover:shadow-lg transition-all">
                                <div class="flex justify-between items-center">
                                    <h3 class="font-bold text-slate-800"><span class="badge-base badge-status">CONSOLIDAÇÃO</span></h3>
                                    <i id="icon-trilha-4" class="fas fa-chevron-down text-slate-300 chevron-icon"></i>
                                </div>
                                <div class="mt-2">
                                    <span class="badge-base badge-course">ANEXO: CRESÇA</span>
                                    <span class="badge-base badge-discipulado">7 ENCONTROS MENSAIS</span>
                                    <div id="trilha-4" class="details-content">
                                        <div class="info-row mt-2"><i class="fas fa-heart text-rose-500"></i> <span><strong>Foco:</strong> Cura interior e fundamentos.</span></div>
                                        <div class="info-row"><i class="fas fa-hands-helping text-rose-500"></i> <span><strong>Ação:</strong> Entrada no Serviço/Ministério.</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- PASSO 5: COLÍDER -->
                    <div class="flex flex-col md:flex-row items-center justify-between mb-8 group" onclick="toggleDetails('trilha-5')">
                        <div class="w-full md:w-5/12 order-2 md:order-1 md:text-right pr-0 md:pr-10">
                            <div class="bg-white p-5 rounded-2xl shadow-md border-l-4 border-emerald-500 step-card relative cursor-pointer group-hover:shadow-lg transition-all">
                                <div class="flex justify-between items-center md:flex-row-reverse">
                                    <span class="badge-base badge-status">COLÍDER</span>
                                    <i id="icon-trilha-5" class="fas fa-chevron-down text-slate-300 chevron-icon"></i>
                                </div>
                                <p class="text-xs text-slate-500 italic mt-1 mb-1">"Fazer com outros"</p>
                                <div class="mt-2 flex flex-col md:items-end">
                                    <span class="badge-base badge-discipulado self-end">7 ENCONTROS MENSAIS</span>
                                    <div id="trilha-5" class="details-content text-left md:text-right w-full">
                                        <div class="info-row mt-2 md:flex-row-reverse"><i class="fas fa-chalkboard-teacher text-rose-500 md:ml-2 md:mr-0"></i> <span><strong>Mentoria:</strong> Pelo Líder de GC.</span></div>
                                        <div class="info-row md:flex-row-reverse"><i class="fas fa-rocket text-rose-500 md:ml-2 md:mr-0"></i> <span><strong>Missão:</strong> Assumir um "Não Alcançado".</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="order-1 md:order-2 w-12 h-12 rounded-full bg-rose-500 border-4 border-white shadow-lg flex items-center justify-center z-10 my-2 cursor-pointer group-hover:scale-110 transition-transform">
                            <i class="fas fa-user-friends text-white text-sm"></i>
                        </div>
                        <div class="w-full md:w-5/12 order-3"></div>
                    </div>

                    <!-- PASSO 6: LÍDER 1 -->
                    <div class="flex flex-col md:flex-row items-center justify-between mb-8 group" onclick="toggleDetails('trilha-6')">
                        <div class="w-full md:w-5/12 order-2 md:order-1"></div>
                        <div class="order-1 md:order-2 w-12 h-12 rounded-full bg-rose-500 border-4 border-white shadow-lg flex items-center justify-center z-10 my-2 cursor-pointer group-hover:scale-110 transition-transform">
                            <i class="fas fa-star-half-alt text-white text-sm"></i>
                        </div>
                        <div class="w-full md:w-5/12 order-3 pl-0 md:pl-10">
                            <div class="bg-white p-5 rounded-2xl shadow-md border-r-4 border-emerald-500 step-card relative text-left cursor-pointer group-hover:shadow-lg transition-all">
                                <div class="flex justify-between items-center">
                                    <span class="badge-base badge-status">LÍDER 1</span>
                                    <i id="icon-trilha-6" class="fas fa-chevron-down text-slate-300 chevron-icon"></i>
                                </div>
                                <div class="mt-2">
                                    <span class="badge-base badge-course">ANEXO: MOLDE DE SERVO (OPCIONAL)</span>
                                    <div id="trilha-6" class="details-content">
                                        <div class="info-row mt-2"><i class="fas fa-search text-rose-500"></i> <span><strong>Foco:</strong> Descoberta de Vocação Específica (Opcional).</span></div>
                                        <div class="info-row"><i class="fas fa-graduation-cap text-rose-500"></i> <span><strong>Requisito:</strong> Ter concluído Consolidação + Check F.D.E.</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- PASSO 7: LÍDER GC (Lidere 2) -->
                    <div class="flex flex-col md:flex-row items-center justify-between mb-8 group" onclick="toggleDetails('trilha-7')">
                        <div class="w-full md:w-5/12 order-2 md:order-1 md:text-right pr-0 md:pr-10">
                            <div class="bg-white p-5 rounded-2xl shadow-md border-l-4 border-rose-500 step-card relative cursor-pointer group-hover:shadow-lg transition-all">
                                <div class="flex justify-between items-center md:flex-row-reverse">
                                    <span class="badge-base badge-status">LÍDER DE GC</span>
                                    <i id="icon-trilha-7" class="fas fa-chevron-down text-slate-300 chevron-icon"></i>
                                </div>
                                <div class="mt-2 flex flex-col md:items-end">
                                    <span class="badge-base badge-course">ANEXO: LIDERE 2</span>
                                    <span class="badge-base badge-discipulado self-end">7 ENCONTROS MENSAIS</span>
                                    <div id="trilha-7" class="details-content text-left md:text-right w-full">
                                        <div class="mt-3 text-xs">
                                            <p class="text-rose-600 font-bold mb-1"><i class="fas fa-lock mr-1"></i>Regra de Ouro:</p>
                                            <p class="text-slate-500">É pré-requisito obrigatório para ser Líder de Ministério.</p>
                                            <div class="bg-rose-50 p-2 rounded text-rose-800 border border-rose-100 inline-block mt-2 text-left">
                                                <strong class="block text-xs mb-1">Critérios de Aprovação:</strong>
                                                <ul class="list-disc pl-3">
                                                    <li>Curso: Conteúdo Técnico</li>
                                                    <li>Discipulado: Caráter F.D.E. (Dupla Aprovação)</li>
                                                </ul>
                                            </div>
                                            <div class="mt-2 text-right">
                                                <span class="badge-base badge-course">OPÇÃO: LIDERE KIDS</span>
                                                <span class="badge-base badge-status">LÍDER KIDS</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="order-1 md:order-2 w-12 h-12 rounded-full bg-rose-500 border-4 border-white shadow-lg flex items-center justify-center z-10 my-2 cursor-pointer group-hover:scale-110 transition-transform">
                            <i class="fas fa-star text-white text-sm"></i>
                        </div>
                        <div class="w-full md:w-5/12 order-3"></div>
                    </div>
                </div>

                <!-- 4. SUPERVISÃO E GESTÃO -->
                <div class="mb-4 relative">
                    <div class="flex justify-center mb-6">
                        <span class="bg-emerald-100 text-emerald-800 text-xs font-bold px-4 py-1.5 rounded-full uppercase border border-emerald-300 tracking-wider shadow-sm">4. Supervisão e Gestão</span>
                    </div>

                    <!-- PASSO 8: LÍDER DE ÁREA -->
                    <div class="flex flex-col md:flex-row items-center justify-between mb-8 group" onclick="toggleDetails('trilha-8')">
                        <div class="w-full md:w-5/12 order-2 md:order-1"></div>
                        <div class="order-1 md:order-2 w-12 h-12 rounded-full bg-emerald-500 border-4 border-white shadow-lg flex items-center justify-center z-10 my-2 cursor-pointer group-hover:scale-110 transition-transform">
                            <i class="fas fa-sitemap text-white text-sm"></i>
                        </div>
                        <div class="w-full md:w-5/12 order-3 pl-0 md:pl-10">
                            <div class="bg-white p-5 rounded-2xl shadow-md border-r-4 border-emerald-500 step-card relative text-left cursor-pointer group-hover:shadow-lg transition-all">
                                <div class="flex justify-between items-center">
                                    <div>
                                        <div class="text-[9px] text-emerald-600 font-bold mb-1 uppercase">Contexto: Min. de Alcance</div>
                                        <span class="badge-base badge-status">LÍDER DE ÁREA</span>
                                    </div>
                                    <i id="icon-trilha-8" class="fas fa-chevron-down text-slate-300 chevron-icon"></i>
                                </div>
                                <div class="mt-2">
                                    <span class="badge-base badge-course">ANEXO: SUPERVISIONE 1</span>
                                    <span class="badge-base badge-discipulado">7 ENCONTROS MENSAIS</span>
                                    <div id="trilha-8" class="details-content">
                                        <div class="info-row mt-2"><i class="fas fa-users-cog text-emerald-500"></i> <span><strong>Foco:</strong> Gestão de múltiplos GCs.</span></div>
                                        <div class="mt-2 text-xs text-slate-500 bg-emerald-50 p-2 rounded border border-emerald-100">
                                            <strong>Aprovação:</strong> Curso + Validação F.D.E.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- PASSO 9: LÍDER DE REDE -->
                    <div class="flex flex-col md:flex-row items-center justify-between mb-8 group" onclick="toggleDetails('trilha-9')">
                        <div class="w-full md:w-5/12 order-2 md:order-1 md:text-right pr-0 md:pr-10">
                            <div class="bg-white p-5 rounded-2xl shadow-md border-l-4 border-emerald-500 step-card relative cursor-pointer group-hover:shadow-lg transition-all">
                                <div class="flex justify-between items-center md:flex-row-reverse">
                                    <span class="badge-base badge-status">LÍDER DE REDE</span>
                                    <i id="icon-trilha-9" class="fas fa-chevron-down text-slate-300 chevron-icon"></i>
                                </div>
                                <div class="mt-2 flex flex-col md:items-end">
                                    <span class="badge-base badge-course">ANEXO: SUPERVISIONE 2</span>
                                    <span class="badge-base badge-discipulado self-end">7 ENCONTROS MENSAIS</span>
                                    <div id="trilha-9" class="details-content text-left md:text-right w-full">
                                        <div class="info-row mt-2 md:flex-row-reverse"><i class="fas fa-network-wired text-emerald-500 md:ml-2 md:mr-0"></i> <span><strong>Foco:</strong> Liderança de Líderes.</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="order-1 md:order-2 w-12 h-12 rounded-full bg-emerald-500 border-4 border-white shadow-lg flex items-center justify-center z-10 my-2 cursor-pointer group-hover:scale-110 transition-transform">
                            <i class="fas fa-network-wired text-white text-sm"></i>
                        </div>
                        <div class="w-full md:w-5/12 order-3"></div>
                    </div>

                    <!-- PASSO 10: PASTOR -->
                    <div class="flex flex-col justify-center items-center mt-12 text-center group" onclick="toggleDetails('trilha-10')">
                        <div class="w-20 h-20 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-2xl flex items-center justify-center z-20 mb-4 animate-ring relative cursor-pointer group-hover:scale-110 transition-transform">
                            <i class="fas fa-crown text-white text-2xl"></i>
                        </div>
                        <div class="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-emerald-500 max-w-xs relative cursor-pointer group-hover:shadow-2xl transition-all">
                            <h3 class="text-2xl font-black text-slate-800"><span class="badge-base badge-status">PASTOR</span></h3>
                            <div class="mt-3">
                                <span class="badge-base badge-course">ANEXO: AVANCE</span>
                                <div id="trilha-10" class="details-content mt-2">
                                    <p class="text-xs text-slate-500 font-semibold"><i class="fas fa-infinity text-emerald-500 mr-1"></i> Discipulado Mensal Contínuo</p>
                                    <p class="text-xs text-slate-400 mt-1">Nível estratégico e mentoria.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>

    </main>
</body>
</html>
`;

export default function RetreatPage() {
    return (
        <>
            <div className="w-full h-full">
                <iframe
                    srcDoc={retreatHtmlContent}
                    title="Retiro IBM 2026: Cronograma & Trilha"
                    className="w-full h-full border-0"
                    style={{ height: 'calc(100vh - 10rem)' }} // Adjust height to fit viewport minus header
                />
            </div>
            <Script id="retreat-script">
                {`
                    function switchTab(tabId) {
                        const contents = document.querySelectorAll('.tab-content');
                        contents.forEach(content => content.classList.add('hidden'));
                        
                        const tabs = ['day1', 'day2', 'trilha'];
                        tabs.forEach(t => {
                            const btn = document.getElementById('tab-' + t);
                            if (btn) {
                                btn.classList.remove('active-tab');
                                btn.classList.add('inactive-tab');
                                if(t === 'trilha') {
                                    btn.classList.remove('bg-slate-50', 'text-sky-700');
                                    btn.classList.add('text-gray-500'); 
                                }
                            }
                        });

                        const activeContent = document.getElementById('content-' + tabId);
                        if (activeContent) {
                            activeContent.classList.remove('hidden');
                        }
                        
                        const activeBtn = document.getElementById('tab-' + tabId);
                        if (activeBtn) {
                            activeBtn.classList.remove('inactive-tab');
                            activeBtn.classList.add('active-tab');
                        }
                    }

                    function toggleDetails(id) {
                        const element = document.getElementById(id);
                        const icon = document.getElementById('icon-' + id);
                        
                        if (element && icon) {
                            if (element.classList.contains('details-open')) {
                                element.classList.remove('details-open');
                                icon.classList.remove('rotate-180');
                            } else {
                                element.classList.add('details-open');
                                icon.classList.add('rotate-180');
                            }
                        }
                    }
                `}
            </Script>
        </>
    );
}

