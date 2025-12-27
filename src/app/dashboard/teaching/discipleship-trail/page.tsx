'use client';

import React from 'react';
import Script from 'next/script';

const pageHTML = `
<div class="bg-slate-100 min-h-screen pb-24">

    <!-- HUD / Header Gamificado -->
    <header class="fixed top-0 w-full bg-slate-900 text-white z-40 shadow-xl border-b border-slate-700">
        <div class="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
            
            <!-- User Profile -->
            <div class="flex items-center gap-3">
                <div class="relative">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-sm border-2 border-white" id="user-avatar-level">2</div>
                    <div class="absolute -bottom-1 -right-1 bg-yellow-400 text-slate-900 text-[10px] font-bold px-1 rounded-full border border-slate-900">
                        Lvl
                    </div>
                </div>
                <div>
                    <h1 class="text-sm font-bold text-indigo-100" id="user-current-role">Novo Convertido</h1>
                    <div class="w-24 h-2 bg-slate-700 rounded-full mt-1 overflow-hidden">
                        <div class="h-full bg-indigo-500 progress-bar-transition" id="global-progress-bar" style="width: 14.2857%;"></div>
                    </div>
                </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2">
                <button onclick="showSourceModal()" class="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors" title="Ver Código">
                    <span class="material-symbols-outlined text-sm">code</span>
                </button>
                <button onclick="resetApp()" class="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors" title="Resetar">
                    <span class="material-symbols-outlined text-sm">restart_alt</span>
                </button>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="pt-20 px-4 max-w-md mx-auto space-y-6">

        <!-- Introduction Card -->
        <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mt-4">
            <h2 class="text-slate-800 font-bold text-lg flex items-center gap-2">
                <span class="material-symbols-outlined text-indigo-600">rocket_launch</span>
                Sua Jornada
            </h2>
            <p class="text-xs text-slate-500 mt-1">Complete os requisitos técnicos (Cursos) e pastorais (Discipulado) para desbloquear novos níveis de liderança.</p>
        </div>

        <!-- Render Container for Steps -->
        <div id="journey-container" class="space-y-6 relative"></div>

    </main>

    <!-- Level Up Modal Overlay -->
    <div id="levelup-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300 opacity-0 hidden">
        <div class="bg-white w-full max-w-sm mx-4 rounded-3xl p-8 text-center relative overflow-hidden transform transition-transform duration-300 scale-90" id="levelup-card">
            <!-- Background Glow -->
            <div class="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-indigo-50 to-white -z-10"></div>
            
            <div class="w-24 h-24 bg-yellow-400 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg animate-bounce">
                <span class="material-symbols-outlined text-5xl text-yellow-900">military_tech</span>
            </div>
            
            <h2 class="text-3xl font-black text-slate-800 mb-2 uppercase italic">Promovido!</h2>
            <p class="text-slate-600 text-sm mb-6">Você alcançou o nível <span id="modal-new-role" class="font-bold text-indigo-600">Novo Convertido</span></p>
            
            <div class="space-y-2 mb-6">
                <div class="flex justify-between text-xs font-bold text-slate-400 uppercase">
                    <span>Fiel</span>
                    <span class="text-green-500">✓</span>
                </div>
                <div class="flex justify-between text-xs font-bold text-slate-400 uppercase">
                    <span>Disponível</span>
                    <span class="text-green-500">✓</span>
                </div>
                <div class="flex justify-between text-xs font-bold text-slate-400 uppercase">
                    <span>Ensinável</span>
                    <span class="text-green-500">✓</span>
                </div>
            </div>

            <button onclick="closeLevelUp()" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-transform active:scale-95">
                Continuar Jornada
            </button>
        </div>
    </div>

    <!-- Source Code Modal -->
    <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 hidden" id="source-modal">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col mx-4">
            <div class="flex items-center justify-between p-4 border-b">
                <h3 class="font-bold text-slate-800">Código Fonte</h3>
                <button onclick="document.getElementById('source-modal').classList.add('hidden')"><span class="material-symbols-outlined">close</span></button>
            </div>
            <textarea id="source-code-area" class="flex-1 bg-slate-900 text-green-400 p-4 font-mono text-xs resize-none" readonly></textarea>
            <div class="p-4 border-t bg-slate-50">
                <button onclick="copyCode()" class="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700">Copiar HTML</button>
            </div>
        </div>
    </div>
</div>
`;

const pageScript = `
// --- CONFIGURAÇÃO DA TRILHA (Baseado no Manual) ---
const journeyConfig = [
    {
        id: 1,
        title: "Rumo ao Batismo",
        targetRole: "Novo Convertido",
        currentRoleLabel: "Visitante",
        color: "green",
        icon: "favorite",
        requirements: {
            type: "Quinzenal",
            meetingsTotal: 7,
            courseName: "Integração (Boas Vindas)",
            hasCourse: true
        }
    },
    {
        id: 2,
        title: "Fundamentos da Fé",
        targetRole: "Membro",
        currentRoleLabel: "Novo Convertido",
        color: "teal",
        icon: "water_drop",
        requirements: {
            type: "Quinzenal",
            meetingsTotal: 7,
            courseName: "Curso Imersão (Batismo)",
            hasCourse: true
        }
    },
    {
        id: 3,
        title: "Consolidação e Serviço",
        targetRole: "Consolidado",
        currentRoleLabel: "Membro",
        color: "blue",
        icon: "spa",
        description: "Entrar no Ministério de Celebração é obrigatório nesta fase.",
        requirements: {
            type: "Mensal",
            meetingsTotal: 7,
            courseName: "Curso Cresça",
            hasCourse: true
        }
    },
    {
        id: 4,
        title: "Treinamento de Liderança",
        targetRole: "Co-Líder",
        currentRoleLabel: "Consolidado",
        color: "indigo",
        icon: "supervisor_account",
        requirements: {
            type: "Mensal",
            meetingsTotal: 7,
            courseName: "Lidere 1",
            hasCourse: true
        }
    },
    {
        id: 5,
        title: "Gestão de Pequeno Grupo",
        targetRole: "Líder de GC",
        currentRoleLabel: "Co-Líder",
        color: "purple",
        icon: "groups",
        requirements: {
            type: "Mensal",
            meetingsTotal: 7,
            courseName: "Lidere 2",
            hasCourse: true
        }
    },
    {
        id: 6,
        title: "Supervisão de Área",
        targetRole: "Líder de Área",
        currentRoleLabel: "Líder de GC",
        color: "violet",
        icon: "map",
        requirements: {
            type: "Mensal",
            meetingsTotal: 7,
            courseName: "Supervisione 1",
            hasCourse: true
        }
    },
    {
        id: 7,
        title: "Gestão de Rede",
        targetRole: "Líder de Rede",
        currentRoleLabel: "Líder de Área",
        color: "fuchsia",
        icon: "hub",
        requirements: {
            type: "Mensal",
            meetingsTotal: 7,
            courseName: "Supervisione 2",
            hasCourse: true
        }
    }
];

// --- ESTADO DA APLICAÇÃO ---
let appState = {
    currentLevelIndex: 0, 
    stepsData: {} 
};

function initApp() {
    appState.stepsData = {};
    journeyConfig.forEach((step, index) => {
        appState.stepsData[step.id] = {
            meetingsCount: 0,
            courseCompleted: false,
            mentorApproved: false,
            supervisorApproved: false,
            isUnlocked: index === 0,
            isCompleted: false
        };
    });
    renderJourney();
    updateGlobalHeader();
}

function renderJourney() {
    const container = document.getElementById('journey-container');
    if (!container) return;
    container.innerHTML = '<div class="absolute left-6 top-4 bottom-4 w-1 bg-slate-200 -z-10 rounded-full"></div>';

    journeyConfig.forEach((step, index) => {
        const state = appState.stepsData[step.id];
        const isActive = appState.currentLevelIndex === index;
        const isPast = appState.currentLevelIndex > index;
        const isLocked = appState.currentLevelIndex < index;

        let opacityClass = isLocked ? "opacity-50 grayscale pointer-events-none" : "opacity-100";
        let borderClass = isActive ? \`border-\${step.color}-500 ring-2 ring-\${step.color}-100\` : "border-slate-200";
        if (isPast) borderClass = "border-green-500 bg-green-50";

        const meetingsPct = (state.meetingsCount / step.requirements.meetingsTotal) * 100;
        const stepDiv = document.createElement('div');
        stepDiv.className = \`relative pl-14 transition-all duration-500 \${opacityClass}\`;
        stepDiv.id = \`step-\${step.id}\`;

        stepDiv.innerHTML = \`
            <div class="absolute left-0 top-6 w-12 h-12 rounded-full border-4 border-white shadow-md flex items-center justify-center z-10 
                \${isActive ? \`bg-\${step.color}-600 text-white animate-pulse-ring\` : (isPast ? 'bg-green-500 text-white' : 'bg-slate-300 text-slate-500')}">
                <span class="material-symbols-outlined text-xl">\${isPast ? 'check' : (isLocked ? 'lock' : step.icon)}</span>
            </div>
            <div class="bg-white rounded-2xl p-5 shadow-sm border \${borderClass} transition-all">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="font-bold text-slate-800 text-lg leading-tight">\${step.title}</h3>
                        <div class="text-xs font-semibold uppercase tracking-wide text-\${step.color}-600 mt-1">Alvo: \${step.targetRole}</div>
                    </div>
                    <div class="text-[10px] px-2 py-1 bg-slate-100 rounded text-slate-500 font-bold border border-slate-200">\${step.requirements.type}</div>
                </div>
                \${step.description ? \`<p class="text-xs text-slate-500 mb-4 bg-slate-50 p-2 rounded border border-slate-100 italic">💡 \${step.description}</p>\` : ''}
                <div class="space-y-4">
                    <div>
                        <div class="flex justify-between text-xs mb-1">
                            <span class="font-bold text-slate-600">Discipulado (\${step.requirements.type})</span>
                            <span class="text-slate-400">\${state.meetingsCount}/\${step.requirements.meetingsTotal}</span>
                        </div>
                        <div class="h-3 bg-slate-100 rounded-full overflow-hidden cursor-pointer group relative" onclick="\${isActive ? \`registerMeeting(\${step.id})\` : ''}">
                            <div class="h-full bg-\${step.color}-500 progress-bar-transition group-hover:bg-\${step.color}-400" style="width: \${meetingsPct}%"></div>
                            \${isActive && state.meetingsCount < step.requirements.meetingsTotal ? \`<div class="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">+ REGISTRAR</div>\` : ''}
                        </div>
                        <p class="text-[10px] text-slate-400 mt-1">Clique na barra para registrar um encontro.</p>
                    </div>
                    <div class="flex items-center justify-between p-3 rounded-lg border \${state.courseCompleted ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'} cursor-pointer hover:shadow-sm transition-all" onclick="\${isActive ? \`toggleCourse(\${step.id})\` : ''}">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full flex items-center justify-center \${state.courseCompleted ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'}">
                                <span class="material-symbols-outlined text-sm">school</span>
                            </div>
                            <div>
                                <div class="text-xs font-bold text-slate-700">Curso: \${step.requirements.courseName}</div>
                                <div class="text-[10px] text-slate-500">\${state.courseCompleted ? 'Concluído' : 'Toque para concluir'}</div>
                            </div>
                        </div>
                        \${state.courseCompleted ? '<span class="material-symbols-outlined text-green-500">check_circle</span>' : ''}
                    </div>
                    <div id="approvals-area-\${step.id}" class="\${canShowApprovals(step.id) ? 'block' : 'hidden'} animate-fade-in pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                        <button onclick="toggleApproval(\${step.id}, 'mentor')" class="p-2 rounded-lg border text-center transition-all \${state.mentorApproved ? 'bg-green-100 border-green-300 text-green-800' : 'bg-white border-dashed border-slate-300 text-slate-400 hover:border-indigo-300 hover:text-indigo-500'}">
                            <div class="text-[10px] uppercase font-bold mb-1">Mentor</div>
                            <span class="material-symbols-outlined text-xl">\${state.mentorApproved ? 'verified' : 'person_add'}</span>
                        </button>
                        <button onclick="toggleApproval(\${step.id}, 'supervisor')" class="p-2 rounded-lg border text-center transition-all \${state.supervisorApproved ? 'bg-green-100 border-green-300 text-green-800' : 'bg-white border-dashed border-slate-300 text-slate-400 hover:border-indigo-300 hover:text-indigo-500'}">
                            <div class="text-[10px] uppercase font-bold mb-1">Supervisor</div>
                            <span class="material-symbols-outlined text-xl">\${state.supervisorApproved ? 'verified_user' : 'shield_person'}</span>
                        </button>
                    </div>
                    \${isActive ? \`<button id="btn-promote-\${step.id}" onclick="attemptPromotion(\${step.id})" disabled class="w-full py-3 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 mt-2 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed bg-gradient-to-r from-\${step.color}-600 to-\${step.color}-500 text-white hover:shadow-lg hover:scale-[1.02]"><span class="material-symbols-outlined text-base">lock</span> PROMOVER PARA \${step.targetRole.toUpperCase()}</button>\` : ''}
                    \${isPast ? \`<div class="w-full py-2 bg-green-100 text-green-700 text-xs font-bold rounded-lg text-center flex items-center justify-center gap-1"><span class="material-symbols-outlined text-sm">history</span>FASE CONCLUÍDA</div>\` : ''}
                </div>
            </div>
        \`;
        container.appendChild(stepDiv);
    });
    checkUnlockConditions();
}

function registerMeeting(stepId) {
    const stepConfig = journeyConfig.find(c => c.id === stepId);
    const state = appState.stepsData[stepId];
    if (state.meetingsCount < stepConfig.requirements.meetingsTotal) {
        state.meetingsCount++;
        renderJourney();
    }
}

function toggleCourse(stepId) {
    appState.stepsData[stepId].courseCompleted = !appState.stepsData[stepId].courseCompleted;
    renderJourney();
}

function canShowApprovals(stepId) {
    const stepConfig = journeyConfig.find(c => c.id === stepId);
    const state = appState.stepsData[stepId];
    return state.courseCompleted && state.meetingsCount >= stepConfig.requirements.meetingsTotal;
}

function toggleApproval(stepId, type) {
    const state = appState.stepsData[stepId];
    if (type === 'mentor') state.mentorApproved = !state.mentorApproved;
    if (type === 'supervisor') state.supervisorApproved = !state.supervisorApproved;
    renderJourney();
}

function checkUnlockConditions() {
    journeyConfig.forEach((step, index) => {
        if (index !== appState.currentLevelIndex) return;
        const state = appState.stepsData[step.id];
        const btn = document.getElementById(\`btn-promote-\${step.id}\`);
        if (!btn) return;
        const allMet = state.courseCompleted && state.meetingsCount >= step.requirements.meetingsTotal && state.mentorApproved && state.supervisorApproved;
        if (allMet) {
            btn.disabled = false;
            btn.innerHTML = '<span class="material-symbols-outlined animate-bounce">verified</span> CONFIRMAR PROMOÇÃO';
            btn.classList.add('animate-pulse');
        } else {
            btn.disabled = true;
            let label = "BLOQUEADO: ";
            if (!state.courseCompleted) label = "FALTA CURSO";
            else if (state.meetingsCount < 7) label = "FALTAM ENCONTROS";
            else label = "AGUARDANDO APROVAÇÕES";
            btn.innerHTML = \`<span class="material-symbols-outlined text-base">lock</span> \${label}\`;
            btn.classList.remove('animate-pulse');
        }
    });
}

function attemptPromotion(stepId) {
    const stepConfig = journeyConfig.find(c => c.id === stepId);
    if (!stepConfig) return;
    launchConfetti();
    showLevelUpModal(stepConfig.targetRole);
    appState.stepsData[stepId].isCompleted = true;
    appState.currentLevelIndex++;
    updateGlobalHeader();
    setTimeout(renderJourney, 500);
}

function updateGlobalHeader() {
    const currentConfig = journeyConfig[appState.currentLevelIndex];
    const roleName = currentConfig ? currentConfig.currentRoleLabel : journeyConfig[journeyConfig.length - 1].targetRole;
    document.getElementById('user-current-role').textContent = roleName;
    document.getElementById('user-avatar-level').textContent = (appState.currentLevelIndex + 1).toString();
    const totalSteps = journeyConfig.length;
    const progress = (appState.currentLevelIndex / totalSteps) * 100;
    document.getElementById('global-progress-bar').style.width = \`\${progress}%\`;
}

function showLevelUpModal(newRole) {
    const modal = document.getElementById('levelup-modal');
    const card = document.getElementById('levelup-card');
    document.getElementById('modal-new-role').textContent = newRole;
    if (modal) {
      modal.classList.remove('hidden');
      setTimeout(() => {
          modal.classList.remove('opacity-0');
          if(card) card.classList.remove('scale-90');
      }, 10);
    }
}

function closeLevelUp() {
    const modal = document.getElementById('levelup-modal');
    const card = document.getElementById('levelup-card');
    if(modal) modal.classList.add('opacity-0');
    if(card) card.classList.add('scale-90');
    setTimeout(() => {
        if(modal) modal.classList.add('hidden');
    }, 300);
}

function launchConfetti() {
    if(typeof confetti === 'function') {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#4f46e5', '#a855f7', '#fbbf24'] });
    }
}

function resetApp() {
    if(confirm("Reiniciar todo o progresso?")) {
        appState.currentLevelIndex = 0;
        initApp();
    }
}

function showSourceModal() {
    const modal = document.getElementById('source-modal');
    const textarea = document.getElementById('source-code-area');
    if (textarea) textarea.value = document.documentElement.outerHTML;
    if (modal) modal.classList.remove('hidden');
}

function copyCode() {
    const textarea = document.getElementById("source-code-area");
    if(textarea) {
        textarea.select();
        document.execCommand("copy");
        alert("HTML copiado com sucesso!");
    }
}

// Attach functions to window to be accessible from inline event handlers
window.registerMeeting = registerMeeting;
window.toggleCourse = toggleCourse;
window.toggleApproval = toggleApproval;
window.attemptPromotion = attemptPromotion;
window.closeLevelUp = closeLevelUp;
window.resetApp = resetApp;
window.showSourceModal = showSourceModal;
window.copyCode = copyCode;

initApp();
`;

export default function DiscipleshipTrailPage() {
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,1,0" rel="stylesheet" />
      <style>
        {`
        @keyframes pulse-ring {
            0% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(79, 70, 229, 0); }
            100% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
        }
        .animate-pulse-ring {
            animation: pulse-ring 2s infinite;
        }
        .progress-bar-transition {
            transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .locked-step {
            filter: grayscale(1);
            opacity: 0.7;
            pointer-events: none;
        }
        `}
      </style>
      <div dangerouslySetInnerHTML={{ __html: pageHTML }} />
      <Script id="confetti-script" src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js" strategy="lazyOnload"></Script>
      <Script id="discipleship-trail-script" strategy="lazyOnload">
        {pageScript}
      </Script>
    </>
  );
}
