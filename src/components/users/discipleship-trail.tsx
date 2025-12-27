
'use client';

import React from 'react';
import Script from 'next/script';

const pageHTML = `
<div class="bg-slate-100 min-h-screen pb-20">

    <!-- Navbar / Header -->
    <header class="bg-indigo-900 text-white shadow-lg sticky top-0 z-50">
        <div class="max-w-5xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
                <h1 class="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <span class="material-symbols-outlined text-yellow-400">route</span>
                    TRILHA IBM 2026
                </h1>
                <p class="text-indigo-200 text-xs uppercase tracking-widest font-semibold mt-1">"Do banco para o serviço"</p>
            </div>
            <div class="flex items-center gap-3">
                <button class="bg-indigo-700 hover:bg-indigo-600 text-white text-sm font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-colors border border-indigo-500 shadow-sm" onclick="window.showSourceModal()">
                    <span class="material-symbols-outlined text-base">code</span>
                    Ver HTML &amp; Copiar
                </button>
            </div>
        </div>
    </header>

    <!-- Context & Philosophy Section -->
    <section class="bg-white border-b border-slate-200 py-8">
        <div class="max-w-4xl mx-auto px-4 text-center">
            <blockquote class="text-xl md:text-2xl font-semibold text-slate-700 italic mb-4">
                "Transformar o Membro Consumidor no Membro Abençoador."
            </blockquote>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 text-left max-w-3xl mx-auto">
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="material-symbols-outlined text-indigo-600">verified</span>
                        <h3 class="font-bold text-slate-800">Fiel</h3>
                    </div>
                    <p class="text-sm text-slate-600">Cumpre o que promete, tem constância nos propósitos.</p>
                </div>
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="material-symbols-outlined text-indigo-600">handshake</span>
                        <h3 class="font-bold text-slate-800">Disponível</h3>
                    </div>
                    <p class="text-sm text-slate-600">Prioriza o Reino e o serviço ao próximo.</p>
                </div>
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="material-symbols-outlined text-indigo-600">school</span>
                        <h3 class="font-bold text-slate-800">Ensinável</h3>
                    </div>
                    <p class="text-sm text-slate-600">Aceita correção, direção e mentoria.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Legend -->
    <div class="sticky top-[72px] z-40 bg-slate-50/95 backdrop-blur border-b border-slate-200 py-3 shadow-sm">
        <div class="max-w-5xl mx-auto px-4 flex flex-wrap justify-center gap-3 md:gap-6 text-xs font-bold uppercase tracking-wide">
            <div class="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-slate-200">
                <span class="w-3 h-3 rounded-full bg-indigo-600"></span> Status / Cargo
            </div>
            <div class="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-slate-200">
                <span class="w-3 h-3 rounded-full bg-emerald-500"></span> Curso / Teoria
            </div>
            <div class="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-slate-200">
                <span class="w-3 h-3 rounded-full bg-amber-500"></span> Discipulado
            </div>
        </div>
    </div>

    <!-- Timeline Container -->
    <main class="max-w-5xl mx-auto px-4 py-12 relative overflow-hidden">
        
        <!-- The Central Line (Metro Style) -->
        <div class="absolute left-4 md:left-1/2 top-0 bottom-0 w-1 md:w-2 bg-slate-200 -ml-0.5 md:-ml-1 z-0 rounded-full"></div>

        <!-- Render Target for JS -->
        <div class="space-y-8 md:space-y-0 relative" id="timeline-render">
            <!-- Items will be injected here -->
        </div>

    </main>

    <!-- Source Code Modal -->
    <div id="source-modal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm modal-enter hidden">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col mx-4 overflow-hidden">
            <!-- Modal Header -->
            <div class="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span class="material-symbols-outlined text-indigo-600">code</span>
                    Código Fonte HTML
                </h3>
                <button onclick="window.closeSourceModal()" class="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-200">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <!-- Modal Body -->
            <div class="flex-1 p-0 relative bg-slate-900 overflow-hidden">
                <textarea id="source-code-area" class="w-full h-full bg-slate-900 text-green-400 font-mono text-sm p-4 resize-none focus:outline-none" readonly></textarea>
            </div>
            <!-- Modal Footer -->
            <div class="p-4 border-t border-slate-200 bg-white flex justify-end gap-3">
                <button onclick="window.closeSourceModal()" class="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg transition-colors">
                    Fechar
                </button>
                <button onclick="window.copyToClipboard()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-2 transition-colors">
                    <span class="material-symbols-outlined text-lg">content_copy</span>
                    Copiar Código
                </button>
            </div>
        </div>
    </div>

    <!-- Copy Success Toast -->
    <div class="fixed bottom-5 right-5 bg-slate-800 text-white px-6 py-3 rounded-lg shadow-xl transform translate-y-24 transition-transform duration-300 flex items-center gap-3 z-[110]" id="toast">
        <span class="material-symbols-outlined text-green-400">check_circle</span>
        <div>
            <p class="font-bold text-sm">Copiado com Sucesso!</p>
            <p class="text-xs text-slate-400">O código está na sua área de transferência.</p>
        </div>
    </div>

`;

const pageScript = `
        // --- DATA SOURCE (Based on Manual IBM 2026) ---
        const timelineData = [
            // FASE 1
            {
                id: 1,
                phase: "FASE 1: ENTRADA E CONVERSÃO",
                phaseColor: "bg-indigo-100 text-indigo-800",
                title: "NOVO CONVERTIDO",
                type: "status", // status, course, discipulado
                badges: [
                    { label: "STATUS", type: "status" },
                    { label: "RITMO QUINZENAL", type: "neutral" }
                ],
                icon: "favorite",
                details: {
                    objective: "Acolhimento e apresentação clara do evangelho.",
                    duration: "7 Encontros Quinzenais (~3,5 meses)",
                    responsible: "Co-Líder ou Consolidador",
                    criteria: "Decisão por Cristo e vínculo inicial."
                }
            },
            // FASE 2
            {
                id: 2,
                phase: "FASE 2: FUNDAMENTOS",
                phaseColor: "bg-sky-100 text-sky-800",
                title: "BATISMO",
                subtitle: "Curso: Imersão",
                type: "course",
                badges: [
                    { label: "CURSO IMERSÃO", type: "course" }
                ],
                icon: "water_drop",
                details: {
                    objective: "Entendimento sobre Salvação, Batismo e Ceia.",
                    duration: "7 Encontros Quinzenais",
                    responsible: "Liderança de Ensino",
                    criteria: "Conclusão do curso e Batismo nas águas (Testemunho Público)."
                }
            },
            {
                id: 3,
                phase: "FASE 2: FUNDAMENTOS",
                phaseColor: "bg-sky-100 text-sky-800",
                title: "MEMBRO",
                subtitle: "Curso de Membros + GC Ativo",
                type: "status",
                badges: [
                    { label: "STATUS", type: "status" },
                    { label: "CURSO MEMBROS", type: "course" }
                ],
                icon: "badge",
                details: {
                    objective: "Compreensão da visão, cultura e mordomia da IBM.",
                    duration: "7 Encontros Quinzenais",
                    responsible: "Liderança GC / Ensino",
                    criteria: "OBRIGATÓRIO estar ativo em um GC. Conclusão EAD ou Mentoria."
                }
            },
            // FASE 3
            {
                id: 4,
                phase: "FASE 3: CONSOLIDAÇÃO E LIDERANÇA",
                phaseColor: "bg-emerald-100 text-emerald-800",
                title: "CONSOLIDAÇÃO",
                subtitle: "Curso: Cresça",
                type: "course",
                badges: [
                    { label: "CURSO CRESÇA", type: "course" },
                    { label: "RITMO MENSAL", type: "neutral" }
                ],
                icon: "spa",
                details: {
                    objective: "Cura Interior, Paternidade de Deus e Fundamentos da Fé.",
                    duration: "7 Encontros Mensais",
                    responsible: "Líder de GC",
                    criteria: "Começar a servir em alguma área se ainda não o faz."
                }
            },
            {
                id: 5,
                phase: "FASE 3: CONSOLIDAÇÃO E LIDERANÇA",
                phaseColor: "bg-emerald-100 text-emerald-800",
                title: "COLÍDER",
                type: "discipulado",
                badges: [
                    { label: "MENTORIA", type: "discipulado" },
                    { label: "PRÁTICA", type: "neutral" }
                ],
                icon: "group_add",
                details: {
                    objective: "'Fazer com outros'. Acompanhar o líder em tudo.",
                    duration: "7 Encontros Mensais",
                    responsible: "Mentor: Líder de GC",
                    criteria: "Adotar/Cuidar de um 'Não Alcançado' ou Novo Convertido."
                }
            },
            {
                id: 6,
                phase: "FASE 3: CONSOLIDAÇÃO E LIDERANÇA",
                phaseColor: "bg-emerald-100 text-emerald-800",
                title: "LÍDER 1 (DESCOBERTA)",
                subtitle: "Curso Opcional: Molde de Servo",
                type: "status",
                badges: [
                    { label: "STATUS", type: "status" },
                    { label: "VOCACIONAL", type: "course" }
                ],
                icon: "person_search",
                details: {
                    objective: "Descoberta de vocação específica e dons espirituais.",
                    duration: "Variável",
                    responsible: "Supervisão",
                    criteria: "Ter concluído a Consolidação + Validação F.D.E (Fiel, Disponível, Ensinável)."
                }
            },
            {
                id: 7,
                phase: "FASE 3: CONSOLIDAÇÃO E LIDERANÇA",
                phaseColor: "bg-emerald-100 text-emerald-800",
                title: "LÍDER DE GC (LIDERE 2)",
                subtitle: "Pré-requisito para Líder de Ministério",
                type: "status",
                badges: [
                    { label: "STATUS", type: "status" },
                    { label: "CURSO LIDERE 2", type: "course" }
                ],
                icon: "groups",
                details: {
                    objective: "Liderar um pequeno grupo e formar novos discípulos.",
                    duration: "7 Encontros Mensais",
                    responsible: "Supervisor de Área",
                    criteria: "Dupla Validação (Mentor + Supervisor). Obrigatório para assumir Ministérios."
                }
            },
            // FASE 4
            {
                id: 8,
                phase: "FASE 4: SUPERVISÃO E GESTÃO",
                phaseColor: "bg-purple-100 text-purple-800",
                title: "LÍDER DE ÁREA",
                subtitle: "Curso: Supervisione 1",
                type: "status",
                badges: [
                    { label: "STATUS", type: "status" },
                    { label: "GESTÃO", type: "course" }
                ],
                icon: "map",
                details: {
                    objective: "Gestão de múltiplos GCs e cuidado de líderes.",
                    duration: "7 Encontros Mensais",
                    responsible: "Líder de Rede",
                    criteria: "Resultados consistentes na multiplicação de GCs."
                }
            },
            {
                id: 9,
                phase: "FASE 4: SUPERVISÃO E GESTÃO",
                phaseColor: "bg-purple-100 text-purple-800",
                title: "LÍDER DE REDE",
                subtitle: "Curso: Supervisione 2",
                type: "status",
                badges: [
                    { label: "STATUS", type: "status" },
                    { label: "ESTRATÉGIA", type: "course" }
                ],
                icon: "hub",
                details: {
                    objective: "Estratégia de rede e formação de supervisores.",
                    duration: "7 Encontros Mensais",
                    responsible: "Pastor",
                    criteria: "Formação de líderes de área."
                }
            },
            {
                id: 10,
                phase: "FASE 4: SUPERVISÃO E GESTÃO",
                phaseColor: "bg-purple-100 text-purple-800",
                title: "PASTOR",
                subtitle: "Curso: Avance (Teológico)",
                type: "status",
                badges: [
                    { label: "ORDENAÇÃO", type: "status" },
                    { label: "TEOLOGIA", type: "course" }
                ],
                icon: "church",
                details: {
                    objective: "Apascentar o rebanho e direção espiritual.",
                    duration: "Contínuo",
                    responsible: "Presbitério",
                    criteria: "Discipulado Mensal Contínuo (sem prazo de término)."
                }
            }
        ];

        // --- RENDER LOGIC ---
        function renderTimeline() {
            const container = document.getElementById('timeline-render');
            if (!container) return;
            container.innerHTML = '';
            let lastPhase = "";

            timelineData.forEach((item, index) => {
                const isEven = index % 2 === 0;
                
                let mainColor = "border-indigo-500 text-indigo-600";
                
                if (item.type === 'course') {
                    mainColor = "border-emerald-500 text-emerald-600";
                } else if (item.type === 'discipulado') {
                    mainColor = "border-amber-500 text-amber-600";
                }

                if (item.phase !== lastPhase) {
                    const phaseHeader = document.createElement('div');
                    phaseHeader.className = "col-span-2 flex justify-center py-4 relative z-10";
                    phaseHeader.innerHTML = \`<span class="px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm \${item.phaseColor} border border-white">\${item.phase}</span>\`;
                    container.appendChild(phaseHeader);
                    lastPhase = item.phase;
                }

                const wrapper = document.createElement('div');
                wrapper.className = 'md:grid md:grid-cols-2 w-full';

                const badgeColors = {
                    status: "bg-indigo-100 text-indigo-700 border-indigo-200",
                    course: "bg-emerald-100 text-emerald-700 border-emerald-200",
                    discipulado: "bg-amber-100 text-amber-700 border-amber-200",
                    neutral: "bg-slate-100 text-slate-600"
                };

                const badgesHTML = item.badges.map(badge => 
                    \`<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase border \${badgeColors[badge.type]}">\${badge.label}</span>\`
                ).join('');

                const cardHTML = \`
                    <div class="\${isEven ? 'md:text-right pr-8' : 'md:text-left pl-8 md:col-start-2'} pl-12 md:pl-0 py-2 relative group">
                        <div class="absolute top-6 \${isEven ? 'md:-right-5 -left-[5px]' : 'md:-left-5 -left-[5px]'} w-4 h-4 rounded-full bg-white border-4 \${mainColor.split(' ')[0]} z-20 shadow-sm group-hover:scale-125 transition-transform duration-300"></div>
                        <div class="hidden md:block absolute top-7 \${isEven ? 'right-0' : 'left-0'} w-8 h-1 bg-slate-200 group-hover:bg-slate-300 transition-colors"></div>
                        <div class="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer overflow-hidden relative" onclick="window.toggleDetails(\${item.id})">
                            <div class="absolute left-0 top-0 bottom-0 w-1.5 \${mainColor.split(' ')[0]}"></div>
                            <div class="p-5">
                                <div class="flex items-start \${isEven ? 'md:justify-end' : 'md:justify-start'} justify-between gap-3 mb-2">
                                    <div class="flex-1 \${isEven ? 'md:order-1' : ''}">
                                        <div class="flex items-center gap-2 \${isEven ? 'md:flex-row-reverse' : ''}">
                                            <h3 class="font-bold text-lg text-slate-800">\${item.title}</h3>
                                            <span class="material-symbols-outlined \${mainColor.split(' ')[1]}">\${item.icon}</span>
                                        </div>
                                        \${item.subtitle ? \`<p class="text-sm text-slate-500 font-medium">\${item.subtitle}</p>\` : ''}
                                    </div>
                                    <span class="material-symbols-outlined text-slate-300 transition-transform duration-300 transform" id="arrow-\${item.id}">expand_more</span>
                                </div>
                                <div class="flex flex-wrap gap-2 mt-3 \${isEven ? 'md:justify-end' : 'justify-start'}">\${badgesHTML}</div>
                            </div>
                            <div class="details-wrapper bg-slate-50 border-t border-slate-100" id="details-\${item.id}">
                                <div class="details-content p-5 text-left text-sm text-slate-600 space-y-3">
                                    <div class="grid grid-cols-1 gap-3">
                                        <div><span class="block text-xs font-bold text-slate-400 uppercase">Objetivo</span><p>\${item.details.objective}</p></div>
                                        <div class="grid grid-cols-2 gap-2">
                                            <div><span class="block text-xs font-bold text-slate-400 uppercase">Duração</span><p>\${item.details.duration}</p></div>
                                            <div><span class="block text-xs font-bold text-slate-400 uppercase">Responsável</span><p>\${item.details.responsible}</p></div>
                                        </div>
                                        <div class="bg-white p-3 rounded border border-slate-200 border-l-4 border-l-slate-400"><span class="block text-xs font-bold text-slate-400 uppercase mb-1">Critério de Avanço</span><p class="font-medium text-slate-700">\${item.details.criteria}</p></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                \`;
                 wrapper.innerHTML = cardHTML;
                 container.appendChild(wrapper);

            });
        }
        
        window.toggleDetails = function(id) {
            const card = document.querySelector(\`#details-\${id}\`).parentElement;
            const arrow = document.getElementById(\`arrow-\${id}\`);
            card.classList.toggle('card-expanded');
            arrow.classList.toggle('rotate-180');
        }

        window.showSourceModal = function() {
            const modal = document.getElementById('source-modal');
            const textarea = document.getElementById('source-code-area');
            if (textarea) textarea.value = document.documentElement.outerHTML;
            if (modal) modal.classList.remove('hidden');
        }

        window.closeSourceModal = function() {
            document.getElementById('source-modal').classList.add('hidden');
        }

        window.copyToClipboard = function() {
            const textarea = document.getElementById("source-code-area");
            if(textarea) {
                textarea.select();
                document.execCommand("copy");
                const toast = document.getElementById('toast');
                toast.classList.remove('translate-y-24');
                setTimeout(() => {
                    toast.classList.add('translate-y-24');
                }, 3000);
            }
        }
        
        document.addEventListener('DOMContentLoaded', renderTimeline);

`;

export function DiscipleshipTrail() {
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,1,0" rel="stylesheet" />
      <style>
        {`
        .details-wrapper {
            display: grid;
            grid-template-rows: 0fr;
            transition: grid-template-rows 0.3s ease-out;
        }
        .details-content {
            overflow: hidden;
        }
        .card-expanded .details-wrapper {
            grid-template-rows: 1fr;
        }
        .rotate-180 {
            transform: rotate(180deg);
        }
        .modal-enter { opacity: 0; pointer-events: none; transform: scale(0.95); }
        .modal-enter-active { opacity: 1; pointer-events: auto; transform: scale(1); transition: all 0.2s ease-out; }
        `}
      </style>
      <div dangerouslySetInnerHTML={{ __html: pageHTML }} />
      <Script id="discipleship-trail-script" strategy="lazyOnload">
        {pageScript}
      </Script>
    </>
  );
}
