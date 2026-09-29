export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dossiê e Proposta Comercial - The School & IB Manhã</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Google Fonts Inter -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Cinzel:wght@600;700&display=swap" rel="stylesheet">
  <!-- Chart.js for Interactive Projections -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
            serif: ['Cinzel', 'serif']
          },
          colors: {
            brandNavy: '#0F1D32',
            brandSlate: '#1E293B',
            brandBlue: '#2563EB',
            brandGold: '#D97706',
            brandAmber: '#F59E0B',
            riskRed: '#DC2626',
            riskEmerald: '#059669'
          }
        }
      }
    }
  </script>
  <style>
    /* Custom scrollbar and print adjustments */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #f1f5f9; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9999px; }
    ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    
    @media print {
      .no-print { display: none !important; }
      body { background: #ffffff !important; color: #000000 !important; }
      .print-shadow-none { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
      .tab-content { display: block !important; }
    }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 font-sans min-h-screen flex flex-col antialiased selection:bg-amber-100 selection:text-amber-900">

  <header class="bg-brandNavy text-white border-b border-slate-700/80 sticky top-0 z-40 backdrop-blur-md bg-opacity-95 shadow-lg">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex flex-col md:flex-row items-center justify-between py-3.5 gap-3">
        <!-- Logo & Title -->
        <div class="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-start">
          <div class="flex items-center space-x-3">
            <div class="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center font-bold text-slate-900 shadow-md">
              <svg class="w-6 h-6 text-brandNavy" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <div class="flex items-center space-x-2">
                <span class="text-xs font-semibold tracking-wider uppercase text-amber-400">Dossiê Estratégico</span>
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-300 border border-blue-400/30">IB Manhã × The School</span>
              </div>
              <h1 class="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                Operação The School São Gonçalo
              </h1>
            </div>
          </div>
          <!-- Quick Status Indicator on Mobile -->
          <div class="md:hidden">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Vigente
            </span>
          </div>
        </div>

        <!-- Quick Executive Utility Actions -->
        <div class="flex items-center space-x-2 w-full md:w-auto justify-end no-print">
          <button id="copyMinutaBtn" class="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition shadow-sm">
            <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
            <span>Copiar Minuta</span>
          </button>
          <button onclick="window.print()" class="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold transition shadow-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      <nav class="flex space-x-2 sm:space-x-4 overflow-x-auto no-print border-t border-slate-700/60 pt-2 pb-1 text-sm font-medium">
        <button onclick="switchTab('proposta')" id="tab-btn-proposta" class="tab-btn flex items-center space-x-2 py-2 px-3 sm:px-4 rounded-lg text-amber-400 bg-slate-800/80 border-b-2 border-amber-400 font-semibold whitespace-nowrap transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <span>1. Proposta Comercial (Para o Ivan)</span>
        </button>
        <button onclick="switchTab('riscos')" id="tab-btn-riscos" class="tab-btn flex items-center space-x-2 py-2 px-3 sm:px-4 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 whitespace-nowrap transition">
          <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <span>2. Parecer Técnico & Riscos (Interno)</span>
        </button>
        <button onclick="switchTab('simulador')" id="tab-btn-simulador" class="tab-btn flex items-center space-x-2 py-2 px-3 sm:px-4 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 whitespace-nowrap transition">
          <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
          <span>3. Simulador de Fluxo & Quitação</span>
        </button>
        <button onclick="switchTab('checklist')" id="tab-btn-checklist" class="tab-btn flex items-center space-x-2 py-2 px-3 sm:px-4 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 whitespace-nowrap transition">
          <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
          <span>4. Checklist de Due Diligence</span>
        </button>
      </nav>
    </div>
  </header>

  <!-- Main Content Container -->
  <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">

    <section id="content-proposta" class="tab-content block space-y-6">
      <!-- Executive Summary Banner -->
      <div class="bg-gradient-to-r from-slate-900 via-brandNavy to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div class="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none"></div>
        <div class="relative z-10 max-w-3xl">
          <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold uppercase tracking-wider mb-3">
            <span>Minuta Negocial & Aliança Estratégica</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Transição Operacional & Quitação Progressiva Sustentável
          </h2>
          <p class="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
            Uma proposta pautada na honra ao legado construído, autonomia integral da gestão local, desoneração executiva do titular e amortização progressiva pautada no superávit operacional com salvaguarda patrimonial mútua.
          </p>
          <div class="mt-6 flex flex-wrap gap-4 text-xs sm:text-sm">
            <div class="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <span class="text-amber-400 font-bold">80%</span>
              <span class="text-slate-300">Amortização Direta ao Ivan</span>
            </div>
            <div class="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <span class="text-emerald-400 font-bold">20%</span>
              <span class="text-slate-300">Fundo de Reserva da Escola</span>
            </div>
            <div class="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <span class="text-blue-400 font-bold">0% Risco</span>
              <span class="text-slate-300">Sem Desembolso para o Cedente</span>
            </div>
            <div class="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <span class="text-purple-400 font-bold">Perpétuo</span>
              <span class="text-slate-300">Royalties Pós-Quitação da Marca</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Formal Letter Paper Presentation -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-10 space-y-8 print-shadow-none">
        <!-- Letterhead Info -->
        <div class="border-b border-slate-100 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-slate-500 gap-2">
          <div>
            <p><strong class="text-slate-700">Proponente:</strong> Igreja Batista da Manhã (Conselho Pastoral & Diretoria)</p>
            <p><strong class="text-slate-700">Destinatário:</strong> Ivan e Mantenedores da The School São Gonçalo</p>
          </div>
          <div class="sm:text-right">
            <p><strong class="text-slate-700">Local e Data:</strong> São Gonçalo - RJ, Setembro de 2026</p>
            <p><strong class="text-slate-700">Natureza:</strong> Proposta Vinculante com Base em Superávit</p>
          </div>
        </div>

        <!-- Section 1: Carta de Princípios -->
        <article class="space-y-4">
          <h3 class="text-lg sm:text-xl font-bold text-brandNavy flex items-center space-x-2">
            <span class="w-1.5 h-6 bg-amber-500 rounded-full inline-block"></span>
            <span>1. Carta de Princípios: Honra, Vocação e Propósito no Reino</span>
          </h3>
          <p class="text-slate-600 text-sm sm:text-base leading-relaxed">
            Prezado Ivan e liderança The School,
          </p>
          <p class="text-slate-600 text-sm sm:text-base leading-relaxed">
            Reconhecemos com sincero respeito e admiração cada esforço, investimento e semente plantada na implantação da <strong>The School em São Gonçalo</strong>. Erguer uma estrutura educacional com foco na formação de novas gerações requer fé, coragem e dedicação contínua.
          </p>
          <p class="text-slate-600 text-sm sm:text-base leading-relaxed">
            A <strong>Igreja Batista da Manhã</strong> enxerga a The School não como um mero ativo imobiliário ou comercial, mas como um epicentro de transformação de famílias. Nosso chamado ministerial nos impulsiona a acolher crianças, formar jovens e promover dignidade por meio de cursos, seminários teológicos, reforço escolar e iniciativas sociais.
          </p>
          <p class="text-slate-600 text-sm sm:text-base leading-relaxed">
            O objetivo desta proposta não é manter dependências informais ou tensões diárias, mas <strong>consolidar uma solução justa, definitiva, sustentável e honrosa para você</strong>. Queremos que seu patrimônio frutifique e sua agenda seja plenamente desonerada, enquanto assumimos com integridade e zelo ministerial a governança e a operação da unidade:
          </p>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold mb-2">01</div>
              <h4 class="font-semibold text-slate-800 text-sm">Cuidado com o Legado</h4>
              <p class="text-xs text-slate-600 mt-1">Preservação do padrão metodológico The School, estabilidade com os pais e acolhimento exemplar dos alunos.</p>
            </div>
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold mb-2">02</div>
              <h4 class="font-semibold text-slate-800 text-sm">Multiplicação Comunitária</h4>
              <p class="text-xs text-slate-600 mt-1">Ocupação das salas 7 dias por semana: reforço escolar, encontros da juventude e cursos profissionalizantes.</p>
            </div>
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mb-2">03</div>
              <h4 class="font-semibold text-slate-800 text-sm">Paz e Autonomia</h4>
              <p class="text-xs text-slate-600 mt-1">Fim definitivo de cobranças e interrupções diárias; transição profissional orientada por Provérbios 11:1.</p>
            </div>
          </div>
        </article>

        <!-- Section 2: Autonomia e Desoneração -->
        <article class="space-y-4">
          <h3 class="text-lg sm:text-xl font-bold text-brandNavy flex items-center space-x-2">
            <span class="w-1.5 h-6 bg-blue-600 rounded-full inline-block"></span>
            <span>2. Autonomia de Gestão & Desoneração Total do Cedente</span>
          </h3>
          <p class="text-slate-600 text-sm sm:text-base leading-relaxed">
            A assunção operacional por parte da equipe designada pela Igreja Batista da Manhã transfere integralmente a rotina executiva, liberando você das demandas operacionais:
          </p>
          <ul class="space-y-2 text-sm sm:text-base text-slate-600">
            <li class="flex items-start space-x-2">
              <svg class="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              <span><strong>Gestão Operacional e Pedagógica Plena:</strong> Seleção e liderança docente, atendimento às famílias, cobrança ativa e expansão de novas matrículas;</span>
            </li>
            <li class="flex items-start space-x-2">
              <svg class="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              <span><strong>Custeio e Manutenção Predial:</strong> Pontualidade na quitação de contas de consumo (energia, água, internet, segurança, reformas preventivas e conservação);</span>
            </li>
            <li class="flex items-start space-x-2">
              <svg class="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              <span><strong>Fim do Desgaste de Rotina:</strong> Sem demandas fragmentadas ou solicitações pontuais de suporte, permitindo dedicação exclusiva aos seus projetos centrais.</span>
            </li>
          </ul>
        </article>

        <!-- Section 3: Engenharia Financeira -->
        <article class="space-y-4">
          <h3 class="text-lg sm:text-xl font-bold text-brandNavy flex items-center space-x-2">
            <span class="w-1.5 h-6 bg-emerald-600 rounded-full inline-block"></span>
            <span>3. Mecânica Financeira: Quitação Estruturada Pelo Próprio Resultado</span>
          </h3>
          <p class="text-slate-600 text-sm sm:text-base leading-relaxed">
            Para garantir sustentabilidade e viabilidade prática para quem assume, sem impor desembolsos que desestabilizem a operação, o pagamento será formalizado pelo fluxo real de caixa:
          </p>

          <!-- Mechanism Breakdown Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
            <div class="p-5 rounded-xl border border-slate-200 bg-slate-50/70">
              <h4 class="font-bold text-slate-800 text-sm flex items-center justify-between">
                <span>Partilha do Superávit (80 / 20)</span>
                <span class="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">Mensal</span>
              </h4>
              <p class="text-xs text-slate-600 mt-2 leading-relaxed">
                Deduzidos custos operacionais, encargos trabalhistas, tributos e manutenção, <strong>80% do superávit líquido é repassado ao Ivan</strong> para amortização do montante de valuation. <strong>20% é retido em conta</strong> para reformas prediais e colchão financeiro de fim de ano.
              </p>
            </div>

            <div class="p-5 rounded-xl border border-slate-200 bg-slate-50/70">
              <h4 class="font-bold text-slate-800 text-sm flex items-center justify-between">
                <span>Risco Zero de Aporte ao Ivan</span>
                <span class="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">Blindagem</span>
              </h4>
              <p class="text-xs text-slate-600 mt-2 leading-relaxed">
                Caso ocorra déficit em determinado mês (ex.: inadimplência atípica ou férias), <strong>o Ivan não desembolsa absolutamente nada</strong>. A entidade mantenedora gere o déficit com total proteção patrimonial ao cedente.
              </p>
            </div>

            <div class="p-5 rounded-xl border border-slate-200 bg-slate-50/70">
              <h4 class="font-bold text-slate-800 text-sm flex items-center justify-between">
                <span>Carência Inicial de Estabilização</span>
                <span class="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">6 a 12 meses</span>
              </h4>
              <p class="text-xs text-slate-600 mt-2 leading-relaxed">
                Durante a fase de reorganização das turmas e captação de alunos, 100% de eventuais excedentes permanecem investidos na própria escola para criação do capital de giro mandatório, garantindo solidez para os repasses posteriores.
              </p>
            </div>

            <div class="p-5 rounded-xl border border-slate-200 bg-slate-50/70">
              <h4 class="font-bold text-slate-800 text-sm flex items-center justify-between">
                <span>Compensação de Perdas Acumuladas</span>
                <span class="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">Carryforward</span>
              </h4>
              <p class="text-xs text-slate-600 mt-2 leading-relaxed">
                Aportes realizados pela entidade para cobrir insuficiências de caixa geram crédito prioritário. Os lucros dos meses seguintes restituem primeiro esse saldo antes de novas divisões, assegurando justiça contábil recíproca.
              </p>
            </div>
          </div>
        </article>

        <!-- Section 4: Fidelidade Pedagógica e Royalties Perpétuos -->
        <article class="space-y-4">
          <h3 class="text-lg sm:text-xl font-bold text-brandNavy flex items-center space-x-2">
            <span class="w-1.5 h-6 bg-purple-600 rounded-full inline-block"></span>
            <span>4. Fidelidade Metodológica e Royalties Perpétuos Pós-Quitação</span>
          </h3>
          <p class="text-slate-600 text-sm sm:text-base leading-relaxed">
            Esta aliança não busca afastar a marca The School, mas engrandecê-la. Mantemos compromisso irrestrito com o método, sistema de ensino e certificações da rede.
          </p>
          <div class="bg-gradient-to-r from-amber-50 to-blue-50 border border-amber-200/80 rounded-xl p-5 text-sm text-slate-700">
            <h5 class="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <svg class="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
              <span>Vantagem Contínua: Renda Passiva Perpétua</span>
            </h5>
            <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Após a liquidação dos 100% do montante de valuation (estimada entre 4 e 5 anos), a unidade manterá o pagamento de um <strong>percentual mensal contínuo sobre o faturamento bruto a título de licença de marca e suporte pedagógico</strong>. O Ivan converte seu investimento inicial em uma fonte vitalícia de dividendos sem qualquer trabalho operacional.
            </p>
          </div>
        </article>

        <!-- Section 5: Tabela Comparativa -->
        <article class="space-y-4">
          <h3 class="text-lg sm:text-xl font-bold text-brandNavy flex items-center space-x-2">
            <span class="w-1.5 h-6 bg-slate-700 rounded-full inline-block"></span>
            <span>5. Matriz Comparativa: Por Que Esta Proposta é Vantajosa?</span>
          </h3>
          <div class="overflow-x-auto rounded-xl border border-slate-200">
            <table class="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
              <thead class="bg-slate-100 text-slate-700 font-semibold">
                <tr>
                  <th class="py-3 px-4 text-left">Ponto Crítico</th>
                  <th class="py-3 px-4 text-left text-red-700 bg-red-50/50">Cenário Atual (Sem Acordo)</th>
                  <th class="py-3 px-4 text-left text-emerald-800 bg-emerald-50/50">Cenário com Proposta IB Manhã</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200 bg-white">
                <tr>
                  <td class="py-3 px-4 font-medium text-slate-800">Carga Mental & Tempo</td>
                  <td class="py-3 px-4 text-slate-600">Atenção dividida com cobranças, pessoal e contas diárias.</td>
                  <td class="py-3 px-4 text-emerald-900 font-semibold bg-emerald-50/30">Liberação integral da agenda; foco exclusivo em projetos centrais.</td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-medium text-slate-800">Risco de Déficit</td>
                  <td class="py-3 px-4 text-slate-600">O titular arca pessoalmente com qualquer insuficiência de caixa.</td>
                  <td class="py-3 px-4 text-emerald-900 font-semibold bg-emerald-50/30">Risco Zero de aporte para o Ivan; mantenedora assume a gestão.</td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-medium text-slate-800">Retorno do Capital</td>
                  <td class="py-3 px-4 text-slate-600">Dependência de venda incerta e demorada no mercado aberto.</td>
                  <td class="py-3 px-4 text-emerald-900 font-semibold bg-emerald-50/30">Amortização mensal de 80% do superávit até quitação total.</td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-medium text-slate-800">Renda de Longo Prazo</td>
                  <td class="py-3 px-4 text-slate-600">Termina no momento de eventual repasse ou fechamento.</td>
                  <td class="py-3 px-4 text-emerald-900 font-semibold bg-emerald-50/30">Royalties perpétuos pós-quitação sobre o faturamento da marca.</td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-medium text-slate-800">Uso do Espaço</td>
                  <td class="py-3 px-4 text-slate-600">Ocioso em horários livres e fins de semana.</td>
                  <td class="py-3 px-4 text-emerald-900 font-semibold bg-emerald-50/30">Polo vivo de cursos, formação bíblica e ação social 7 dias/semana.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <!-- Signatures Block -->
        <div class="pt-8 border-t border-slate-200">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center pt-4">
            <div class="space-y-2">
              <div class="border-t border-slate-400 w-3/4 mx-auto pt-2"></div>
              <p class="font-bold text-slate-800 text-sm">IGREJA BATISTA DA MANHÃ</p>
              <p class="text-xs text-slate-500">Diretoria Administrativa e Conselho Pastoral</p>
            </div>
            <div class="space-y-2">
              <div class="border-t border-slate-400 w-3/4 mx-auto pt-2"></div>
              <p class="font-bold text-slate-800 text-sm">THE SCHOOL SÃO GONÇALO</p>
              <p class="text-xs text-slate-500">Ivan e Mantenedores da Unidade</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="content-riscos" class="tab-content hidden space-y-6">
      <!-- Warning Header for Internal Counsel -->
      <div class="bg-red-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-red-800/80 relative overflow-hidden">
        <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-800/60 text-red-200 border border-red-600/50 text-xs font-bold uppercase tracking-wider mb-2">
          <span>Caderno I — Uso Interno e Confidencial</span>
        </div>
        <h2 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Parecer Técnico de Risco Financeiro, Jurídico & Governança
        </h2>
        <p class="mt-2 text-sm sm:text-base text-red-100 max-w-3xl leading-relaxed">
          Avaliação pericial e pé-no-chão para a liderança da Igreja Batista da Manhã. Sem caixa inicial prévio, assumir promessas ingênuas de déficit sem carência e sem compensação acumulada coloca em risco direto o orçamento eclesiástico dominical.
        </p>
      </div>

      <!-- Critical Analysis Cards -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Risco 1: Armadilha da Matemática Sem Carryforward -->
        <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div class="flex items-center space-x-3 text-red-600 font-bold text-base sm:text-lg">
            <span class="p-2 rounded-xl bg-red-100">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/></svg>
            </span>
            <span>A Armadilha do Prejuízo Isolado</span>
          </div>
          <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Se for aceito o modelo de repassar 80% do lucro no mês bom e a igreja cobrir 100% no mês ruim, sem regra de compensação histórica, a tesouraria da igreja será drenada:
          </p>
          <div class="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2 font-mono">
            <div class="flex justify-between text-red-600 font-semibold">
              <span>Mês 1 (Prejuízo):</span>
              <span>- R$ 10.000,00 (Igreja banca do dízimo)</span>
            </div>
            <div class="flex justify-between text-emerald-600 font-semibold">
              <span>Mês 2 (Lucro Isolado):</span>
              <span>+ R$ 10.000,00</span>
            </div>
            <div class="border-t border-slate-200 pt-2 flex justify-between text-slate-800">
              <span>Repasse 80% ao Ivan:</span>
              <span>R$ 8.000,00 retirados da escola</span>
            </div>
            <div class="flex justify-between font-bold text-red-700 bg-red-100 p-2 rounded">
              <span>Resultado Consolidado Igreja:</span>
              <span>- R$ 10.000,00 no vermelho!</span>
            </div>
          </div>
          <div class="text-xs text-slate-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
            <strong>Diretriz Inegociável:</strong> Implementar a regra de <em>Loss Carryforward</em>. Lucros futuros devem quitar 100% dos aportes pretéritos da igreja antes de gerar qualquer novo repasse de 80%.
          </div>
        </div>

        <!-- Risco 2: Sucessão Trabalhista CLT & SisbaJud -->
        <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div class="flex items-center space-x-3 text-red-600 font-bold text-base sm:text-lg">
            <span class="p-2 rounded-xl bg-red-100">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            </span>
            <span>Sucessão Trabalhista & Penhora de Dízimos</span>
          </div>
          <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Pela CLT (Arts. 10 e 448), quem assume o mesmo ponto, o mobiliário e atende os mesmos alunos é configurado judicialmente como <strong>Sucessor Trabalhista</strong>:
          </p>
          <ul class="text-xs sm:text-sm text-slate-600 space-y-2">
            <li class="flex items-start gap-2">
              <span class="text-red-500 font-bold">•</span>
              <span>Passivos trabalhistas ocultos de professores desligados antes da transição podem atingir a mantenedora.</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-red-500 font-bold">•</span>
              <span><strong>Bloqueio SisbaJud:</strong> Se o CNPJ religioso principal da igreja assinar contratos da escola, penhoras judiciais automáticas podem congelar as contas correntes de dízimos dominicais.</span>
            </li>
          </ul>
          <div class="text-xs text-slate-700 bg-blue-50 p-3 rounded-lg border border-blue-200">
            <strong>Arquitetura de Blindagem:</strong> A Igreja Batista da Manhã JAMAIS assina contratos diretos da escola. Utilizar associação educacional específica ou SPE com contrato no modelo <em>Lease-to-Buy</em> (Arrendamento com Opção de Compra).
          </div>
        </div>

        <!-- Risco 3: Sazonalidade Escolar -->
        <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div class="flex items-center space-x-3 text-amber-600 font-bold text-base sm:text-lg">
            <span class="p-2 rounded-xl bg-amber-100">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </span>
            <span>O Choque Sazonal de Caixa Escolar</span>
          </div>
          <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Escolas privadas não têm receita homogênea durante o ano. Compreender estes 3 picos evita a quebra precoce:
          </p>
          <div class="space-y-2 text-xs">
            <div class="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <strong class="text-slate-800">Nov - Jan (Falsa Abundância):</strong> Matrículas concentram caixa momentâneo. Se esse valor for distribuído em vez de retido, a unidade quebra.
            </div>
            <div class="p-2.5 bg-red-50 rounded-lg border border-red-200 text-red-900">
              <strong class="text-red-950">Dezembro (O Abismo da Folha):</strong> 13º salário integral e 1/3 de férias dos professores. O custo de folha quase dobra em 30 dias.
            </div>
            <div class="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <strong class="text-slate-800">Jan e Julho (Queda de Mensalidades):</strong> Período de férias escolares com elevação histórica de inadimplência e evasão.
            </div>
          </div>
        </div>

        <!-- Risco 4: O Contrato de Locação e Fiadores -->
        <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div class="flex items-center space-x-3 text-blue-600 font-bold text-base sm:text-lg">
            <span class="p-2 rounded-xl bg-blue-100">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
            </span>
            <span>Contrato do Imóvel & Locador</span>
          </div>
          <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
            A infraestrutura física depende do contrato de aluguel do espaço em São Gonçalo:
          </p>
          <ul class="text-xs sm:text-sm text-slate-600 space-y-2">
            <li class="flex items-start gap-2">
              <span class="text-blue-500 font-bold">•</span>
              <span>Identificar se a locação está em nome da pessoa física do Ivan ou jurídica.</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-blue-500 font-bold">•</span>
              <span>Verificar débitos de IPTU, contas de luz e eventuais aluguéis em aberto.</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-blue-500 font-bold">•</span>
              <span>Exigir autorização prévia por escrito do proprietário para sublocação ou cessão contratual sem reajuste extorsivo do valor do aluguel.</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Tabela de 5 Salvaguardas Indispensáveis -->
      <div class="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <h3 class="text-lg sm:text-xl font-bold text-brandNavy flex items-center gap-2">
          <svg class="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
          <span>As 5 Salvaguardas Contratuais Inegociáveis</span>
        </h3>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
            <thead class="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                <th class="py-2.5 px-4 text-left">Cláusula</th>
                <th class="py-2.5 px-4 text-left">Definição Operacional</th>
                <th class="py-2.5 px-4 text-left">Blindagem para a Igreja</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 text-slate-600">
              <tr>
                <td class="py-3 px-4 font-bold text-slate-800">1. Carência (Grace Period)</td>
                <td class="py-3 px-4">6 a 12 meses com 100% de retenção de excedentes na escola.</td>
                <td class="py-3 px-4 text-emerald-700 font-medium">Permite criar o fundo de giro mínimo sem drenar as ofertas da igreja.</td>
              </tr>
              <tr>
                <td class="py-3 px-4 font-bold text-slate-800">2. Carryforward de Perdas</td>
                <td class="py-3 px-4">Todo déficit coberto vira crédito prioritário antes de partilha 80/20.</td>
                <td class="py-3 px-4 text-emerald-700 font-medium">Impede que a igreja fique no prejuízo líquido enquanto o cedente retira lucro.</td>
              </tr>
              <tr>
                <td class="py-3 px-4 font-bold text-slate-800">3. Teto Mensal (Cap)</td>
                <td class="py-3 px-4">Limite máximo de repasse por mês (ex.: teto de R$ 6.000 ou 8.000).</td>
                <td class="py-3 px-4 text-emerald-700 font-medium">Evita que meses atípicos de matrículas sangrem o caixa antes do 13º salário.</td>
              </tr>
              <tr>
                <td class="py-3 px-4 font-bold text-slate-800">4. Saída Desimpedida</td>
                <td class="py-3 px-4">Se após 12-18 meses for inviável, devolve as chaves sem multa.</td>
                <td class="py-3 px-4 text-emerald-700 font-medium">Não condena a comunidade de fé a uma dívida eterna se a operação não fechar a conta.</td>
              </tr>
              <tr>
                <td class="py-3 px-4 font-bold text-slate-800">5. Auditoria Prévia</td>
                <td class="py-3 px-4">Apresentação compulsória de CNDs, FGTS e balanço de alunos ativos.</td>
                <td class="py-3 px-4 text-emerald-700 font-medium">Evita surpresas com execuções trabalhistas e fornecedores protestados.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section id="content-simulador" class="tab-content hidden space-y-6">
      <div class="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div>
          <span class="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 uppercase tracking-wider">Ferramenta Executiva</span>
          <h2 class="text-xl sm:text-2xl font-bold text-brandNavy mt-1">Simulador Dinâmico de Superávit & Quitação Progressiva</h2>
          <p class="text-slate-500 text-xs sm:text-sm mt-1">
            Altere os parâmetros reais da escola (alunos, mensalidade, custos e carência) para projetar o tempo de amortização, a formação do fundo de reserva e a proteção contra meses deficitários.
          </p>
        </div>

        <!-- Controls Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-200">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Alunos Matriculados: <span id="valAlunos" class="text-blue-600">85</span></label>
            <input type="range" id="inputAlunos" min="30" max="220" step="5" value="85" class="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-blue-600">
            <span class="text-[11px] text-slate-400">Total de estudantes pagantes</span>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Mensalidade Média Líquida: <span id="valMensalidade" class="text-blue-600">R$ 550</span></label>
            <input type="range" id="inputMensalidade" min="300" max="1100" step="25" value="550" class="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-blue-600">
            <span class="text-[11px] text-slate-400">Deduzidos descontos e bolsas</span>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Custo Fixo Total (Folha + Prédio): <span id="valCustos" class="text-red-600">R$ 38.000</span></label>
            <input type="range" id="inputCustos" min="20000" max="75000" step="1000" value="38000" class="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-red-600">
            <span class="text-[11px] text-slate-400">Salários, encargos, aluguel, luz</span>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Valuation Total da Aquisição: <span id="valValuation" class="text-amber-600">R$ 350.000</span></label>
            <input type="range" id="inputValuation" min="150000" max="700000" step="10000" value="350000" class="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-amber-600">
            <span class="text-[11px] text-slate-400">Obras + Mobiliário + Ponto</span>
          </div>
        </div>

        <!-- Additional Safeguard Sliders -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 rounded-xl border border-slate-200 bg-white">
            <label class="block text-xs font-bold text-slate-700 mb-1">Meses de Carência Inicial (Grace Period): <span id="valCarencia" class="text-emerald-600 font-bold">6 meses</span></label>
            <input type="range" id="inputCarencia" min="0" max="12" step="1" value="6" class="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-emerald-600">
            <p class="text-[11px] text-slate-500 mt-1">Neste período, 100% do lucro vai para capital de giro e reformas da escola.</p>
          </div>

          <div class="p-4 rounded-xl border border-slate-200 bg-white">
            <label class="block text-xs font-bold text-slate-700 mb-1">Simular Inadimplência Média: <span id="valInadimplencia" class="text-slate-700 font-bold">8%</span></label>
            <input type="range" id="inputInadimplencia" min="0" max="25" step="1" value="8" class="w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-slate-700">
            <p class="text-[11px] text-slate-500 mt-1">Percentual de atraso nas mensalidades correntes.</p>
          </div>
        </div>

        <!-- Calculated Live Metrics -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span class="text-xs text-slate-500">Receita Bruta Ajustada</span>
            <div id="dispReceita" class="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5">R$ 0,00</div>
            <span id="dispBreakEven" class="text-[11px] text-slate-500">Ponto de Equilíbrio: --</span>
          </div>

          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span class="text-xs text-slate-500">Superávit Mensal Estimado</span>
            <div id="dispSuperavit" class="text-lg sm:text-xl font-extrabold mt-0.5">R$ 0,00</div>
            <span id="dispMargem" class="text-[11px] text-slate-500">Margem líquida: --</span>
          </div>

          <div class="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <span class="text-xs text-amber-800">Repasse Mensal ao Ivan (80%)</span>
            <div id="dispRepasse" class="text-lg sm:text-xl font-extrabold text-amber-900 mt-0.5">R$ 0,00</div>
            <span class="text-[11px] text-amber-700">Após o fim da carência</span>
          </div>

          <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <span class="text-xs text-emerald-800">Tempo Estimado de Quitação</span>
            <div id="dispTempo" class="text-lg sm:text-xl font-extrabold text-emerald-900 mt-0.5">-- anos</div>
            <span id="dispStatusQuitacao" class="text-[11px] text-emerald-700">Dentro da meta de 4 a 5 anos</span>
          </div>
        </div>

        <!-- Chart Container -->
        <div class="bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-200">
          <h4 class="text-sm font-bold text-slate-800 mb-3 flex items-center justify-between">
            <span>Curva de Amortização Progressiva do Valuation (Até 60 Meses)</span>
            <span class="text-xs font-normal text-slate-500">Gráfico de Redução do Saldo Devedor</span>
          </h4>
          <div class="h-64 sm:h-72 w-full">
            <canvas id="amortizationChart"></canvas>
          </div>
        </div>
      </div>
    </section>

    <section id="content-checklist" class="tab-content hidden space-y-6">
      <div class="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span class="text-xs font-semibold px-2.5 py-1 rounded bg-blue-100 text-blue-800 uppercase tracking-wider">Governança Segura</span>
            <h2 class="text-xl sm:text-2xl font-bold text-brandNavy mt-1">Checklist Pré-Assinatura (Auditoria de Salvaguardas)</h2>
            <p class="text-slate-500 text-xs sm:text-sm mt-1">
              Marque os itens conforme forem sanados com o Ivan antes de qualquer assinatura formal de memorando ou contrato definitivo.
            </p>
          </div>
          <div class="bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 text-center sm:text-right shrink-0">
            <span class="text-xs text-slate-500">Conclusão do Checklist</span>
            <div id="checklistProgress" class="text-lg font-black text-blue-600">0% (0/8)</div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div id="progressBarFill" class="bg-blue-600 h-full transition-all duration-300 w-0"></div>
        </div>

        <!-- Interactive Checklist Items -->
        <div class="space-y-3" id="checklistContainer">
          <!-- Item 1 -->
          <label class="checklist-item flex items-start space-x-3 p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer">
            <input type="checkbox" onchange="updateChecklist()" class="mt-1 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300">
            <div class="text-xs sm:text-sm">
              <span class="font-bold text-slate-800">1. DRE Real dos Últimos 12 Meses</span>
              <p class="text-slate-500 text-xs mt-0.5">Demonstrativo oficial de receitas, despesas e inadimplência real dos alunos para comprovar o faturamento histórico.</p>
            </div>
          </label>

          <!-- Item 2 -->
          <label class="checklist-item flex items-start space-x-3 p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer">
            <input type="checkbox" onchange="updateChecklist()" class="mt-1 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300">
            <div class="text-xs sm:text-sm">
              <span class="font-bold text-slate-800">2. Certidão Negativa de Débitos Trabalhistas (CNDT)</span>
              <p class="text-slate-500 text-xs mt-0.5">Certidão perante a Justiça do Trabalho para constatar ausência de execuções ou rescisões pendentes de ex-docentes.</p>
            </div>
          </label>

          <!-- Item 3 -->
          <label class="checklist-item flex items-start space-x-3 p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer">
            <input type="checkbox" onchange="updateChecklist()" class="mt-1 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300">
            <div class="text-xs sm:text-sm">
              <span class="font-bold text-slate-800">3. Certificado de Regularidade do FGTS (CRF)</span>
              <p class="text-slate-500 text-xs mt-0.5">Verificação da Caixa Econômica Federal comprovando depósito regular de FGTS de todos os colaboradores atuais.</p>
            </div>
          </label>

          <!-- Item 4 -->
          <label class="checklist-item flex items-start space-x-3 p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer">
            <input type="checkbox" onchange="updateChecklist()" class="mt-1 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300">
            <div class="text-xs sm:text-sm">
              <span class="font-bold text-slate-800">4. Situação do Contrato de Locação e Proprietário</span>
              <p class="text-slate-500 text-xs mt-0.5">Anuência expressa do locador do imóvel em São Gonçalo para cessão ou sublocação com prazo seguro e aluguel fixado.</p>
            </div>
          </label>

          <!-- Item 5 -->
          <label class="checklist-item flex items-start space-x-3 p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer">
            <input type="checkbox" onchange="updateChecklist()" class="mt-1 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300">
            <div class="text-xs sm:text-sm">
              <span class="font-bold text-slate-800">5. Acordo de Carência Mínima (6 Meses)</span>
              <p class="text-slate-500 text-xs mt-0.5">Cláusula formal estabelecendo que o Ivan não fará retiradas de amortização nos primeiros 6 meses de transição.</p>
            </div>
          </label>

          <!-- Item 6 -->
          <label class="checklist-item flex items-start space-x-3 p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer">
            <input type="checkbox" onchange="updateChecklist()" class="mt-1 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300">
            <div class="text-xs sm:text-sm">
              <span class="font-bold text-slate-800">6. Cláusula de Loss Carryforward (Compensação de Perdas)</span>
              <p class="text-slate-500 text-xs mt-0.5">Garantia contratual de que qualquer aporte da mantenedora terá ressarcimento compulsório antes de novas apurações de lucro.</p>
            </div>
          </label>

          <!-- Item 7 -->
          <label class="checklist-item flex items-start space-x-3 p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer">
            <input type="checkbox" onchange="updateChecklist()" class="mt-1 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300">
            <div class="text-xs sm:text-sm">
              <span class="font-bold text-slate-800">7. Cláusula de Saída Limpa (Walk-Away Clause)</span>
              <p class="text-slate-500 text-xs mt-0.5">Direito de devolução desimpedida após 12-18 meses sem penalidade ou cobrança do saldo residual de compra.</p>
            </div>
          </label>

          <!-- Item 8 -->
          <label class="checklist-item flex items-start space-x-3 p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer">
            <input type="checkbox" onchange="updateChecklist()" class="mt-1 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300">
            <div class="text-xs sm:text-sm">
              <span class="font-bold text-slate-800">8. Segregação de CNPJ Religioso da Igreja</span>
              <p class="text-slate-500 text-xs mt-0.5">Contratação formalizada exclusivamente por pessoa jurídica educacional autônoma (SPE ou Associação Cultural).</p>
            </div>
          </label>
        </div>
      </div>
    </section>
  </main>

  <footer class="bg-brandNavy text-slate-400 text-xs border-t border-slate-800 py-6 mt-auto no-print">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
      <div>
        <p class="text-slate-300 font-medium">Igreja Batista da Manhã &bull; São Gonçalo - RJ</p>
        <p class="text-slate-500 text-[11px] mt-0.5"><em>"Os planos bem elaborados levam à fartura; mas o apressado sempre acaba na miséria."</em> — Provérbios 21:5</p>
      </div>
      <div class="text-[11px] text-slate-500">
        Instrumento de Governança e Tomada de Decisão &bull; Setembro/2026
      </div>
    </div>
  </footer>

  <!-- Custom Floating Toast Notification -->
  <div id="toast" class="fixed bottom-5 right-5 z-50 transform translate-y-20 opacity-0 transition-all duration-300 pointer-events-none bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 text-xs border border-slate-700">
    <svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
    <span id="toastMsg">Mensagem enviada com sucesso</span>
  </div>

  <script>
    // Tab Switching State Logic
    function switchTab(tabId) {
      const tabs = ['proposta', 'riscos', 'simulador', 'checklist'];
      tabs.forEach(t => {
        const contentEl = document.getElementById('content-' + t);
        const btnEl = document.getElementById('tab-btn-' + t);
        if (t === tabId) {
          contentEl.classList.remove('hidden');
          contentEl.classList.add('block');
          btnEl.className = 'tab-btn flex items-center space-x-2 py-2 px-3 sm:px-4 rounded-lg text-amber-400 bg-slate-800/80 border-b-2 border-amber-400 font-semibold whitespace-nowrap transition';
        } else {
          contentEl.classList.remove('block');
          contentEl.classList.add('hidden');
          btnEl.className = 'tab-btn flex items-center space-x-2 py-2 px-3 sm:px-4 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 whitespace-nowrap transition';
        }
      });
      if (tabId === 'simulador') {
        setTimeout(updateSimulator, 50);
      }
    }

    // Toast Utility (Zero Browser Alerts)
    function showToast(message) {
      const toast = document.getElementById('toast');
      const toastMsg = document.getElementById('toastMsg');
      toastMsg.textContent = message;
      toast.classList.remove('translate-y-20', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
      setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-20', 'opacity-0');
      }, 3500);
    }

    // Copy Proposal Text with fallback
    document.getElementById('copyMinutaBtn').addEventListener('click', () => {
      const textToCopy = \`MINUTA PROPOSTA COMERCIAL - THE SCHOOL SÃO GONÇALO
Igreja Batista da Manhã x Ivan (The School)

1. CARTA DE PRINCÍPIOS:
Reconhecemos e honramos o investimento e trabalho dedicado na implantação da The School em São Gonçalo. A Igreja Batista da Manhã propõe assumir a gestão integral da unidade com foco na multiplicação comunitária, sustentabilidade e paz relacional.

2. ENGENHARIA FINANCEIRA:
- Distribuição do Superávit Mensal: 80% destinado à amortização progressiva ao Ivan e 20% mantido no Fundo de Reserva.
- Risco Zero para o Cedente: Em meses de déficit, o Ivan não aporta nenhum centavo.
- Carência Operacional: 6 a 12 meses de retenção de excedentes na escola para formação de capital de giro.
- Loss Carryforward: Déficits custeados pela mantenedora geram crédito prioritário reembolsado antes de novas partilhas.

3. FIDELIDADE E ROYALTIES PERPÉTUOS:
Manutenção estrita do método pedagógico The School. Após 100% de quitação patrimonial, o Ivan passa a receber royalties perpétuos sobre o faturamento da marca sem obrigações operacionais.\`;

      const tempTextArea = document.createElement('textarea');
      tempTextArea.value = textToCopy;
      document.body.appendChild(tempTextArea);
      tempTextArea.select();
      try {
        document.execCommand('copy');
        showToast('Minuta copiada para a área de transferência!');
      } catch (err) {
        showToast('Erro ao copiar. Selecione o texto manualmente.');
      }
      document.body.removeChild(tempTextArea);
    });

    // Checklist Progress Counter
    function updateChecklist() {
      const items = document.querySelectorAll('#checklistContainer input[type="checkbox"]');
      let checked = 0;
      items.forEach(i => { if (i.checked) checked++; });
      const percent = Math.round((checked / items.length) * 100);
      document.getElementById('checklistProgress').textContent = \`\${percent}% (\${checked}/\${items.length})\`;
      document.getElementById('progressBarFill').style.width = \`\${percent}%\`;
    }

    // Chart.js instance variable
    let chartInstance = null;

    // Financial Simulator Logic
    function updateSimulator() {
      const alunos = parseInt(document.getElementById('inputAlunos').value, 10);
      const mensalidade = parseInt(document.getElementById('inputMensalidade').value, 10);
      const custos = parseInt(document.getElementById('inputCustos').value, 10);
      const valuation = parseInt(document.getElementById('inputValuation').value, 10);
      const carencia = parseInt(document.getElementById('inputCarencia').value, 10);
      const inadimplencia = parseInt(document.getElementById('inputInadimplencia').value, 10);

      // Display range text
      document.getElementById('valAlunos').textContent = alunos;
      document.getElementById('valMensalidade').textContent = \`R$ \${mensalidade.toLocaleString('pt-BR')}\`;
      document.getElementById('valCustos').textContent = \`R$ \${custos.toLocaleString('pt-BR')}\`;
      document.getElementById('valValuation').textContent = \`R$ \${valuation.toLocaleString('pt-BR')}\`;
      document.getElementById('valCarencia').textContent = \`\${carencia} meses\`;
      document.getElementById('valInadimplencia').textContent = \`\${inadimplencia}%\`;

      // Calculations
      const receitaBrutaNominal = alunos * mensalidade;
      const receitaLiquidaAjustada = receitaBrutaNominal * (1 - (inadimplencia / 100));
      const superavit = receitaLiquidaAjustada - custos;
      const alunosBreakEven = Math.ceil(custos / (mensalidade * (1 - (inadimplencia / 100))));

      const dispReceita = document.getElementById('dispReceita');
      const dispSuperavit = document.getElementById('dispSuperavit');
      const dispRepasse = document.getElementById('dispRepasse');
      const dispTempo = document.getElementById('dispTempo');
      const dispBreakEven = document.getElementById('dispBreakEven');
      const dispMargem = document.getElementById('dispMargem');
      const dispStatusQuitacao = document.getElementById('dispStatusQuitacao');

      dispReceita.textContent = \`R$ \${receitaLiquidaAjustada.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`;
      dispBreakEven.textContent = \`Break-even: \${alunosBreakEven} alunos necessários\`;

      if (superavit > 0) {
        dispSuperavit.className = "text-lg sm:text-xl font-extrabold text-emerald-600 mt-0.5";
        dispSuperavit.textContent = \`+ R$ \${superavit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\`;
        const margem = ((superavit / receitaLiquidaAjustada) * 100).toFixed(1);
        dispMargem.textContent = \`Margem de lucro: \${margem}%\`;

        const repasseIvan = superavit * 0.8;
        dispRepasse.textContent = \`R$ \${repasseIvan.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\`;

        // Calculate Payoff timeline with grace period
        const mesesNecessarios = Math.ceil(valuation / repasseIvan) + carencia;
        const anos = (mesesNecessarios / 12).toFixed(1);
        dispTempo.textContent = \`\${mesesNecessarios} meses (~\${anos} anos)\`;

        if (mesesNecessarios <= 60) {
          dispStatusQuitacao.textContent = "Excelente! Dentro da meta de 4 a 5 anos.";
          dispStatusQuitacao.className = "text-[11px] text-emerald-700 font-semibold";
        } else {
          dispStatusQuitacao.textContent = "Atenção: Prazo superior a 5 anos. Considere aumentar captação de alunos.";
          dispStatusQuitacao.className = "text-[11px] text-amber-700 font-semibold";
        }
      } else {
        dispSuperavit.className = "text-lg sm:text-xl font-extrabold text-red-600 mt-0.5";
        dispSuperavit.textContent = \`- R$ \${Math.abs(superavit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\`;
        dispMargem.textContent = \`Déficit operacional de \${Math.abs(superavit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\`;
        dispRepasse.textContent = "R$ 0,00 (Prejuízo)";
        dispTempo.textContent = "Inviável (Déficit)";
        dispStatusQuitacao.textContent = "Operação no vermelho. Igreja precisará injetar caixa.";
        dispStatusQuitacao.className = "text-[11px] text-red-700 font-bold";
      }

      renderChart(valuation, superavit, carencia);
    }

    function renderChart(valuationTotal, superavitMensal, carenciaMeses) {
      const ctx = document.getElementById('amortizationChart').getContext('2d');
      const labels = [];
      const dataSaldo = [];
      let saldo = valuationTotal;
      const repasseEfetivo = superavitMensal > 0 ? superavitMensal * 0.8 : 0;

      for (let m = 0; m <= 60; m += 6) {
        labels.push(\`Mês \${m}\`);
        if (m === 0) {
          dataSaldo.push(saldo);
        } else {
          const mesesAtivos = Math.max(0, m - carenciaMeses);
          const amortizado = mesesAtivos * repasseEfetivo;
          const saldoAtual = Math.max(0, valuationTotal - amortizado);
          dataSaldo.push(saldoAtual);
        }
      }

      if (chartInstance) {
        chartInstance.destroy();
      }

      chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Saldo Residual do Valuation (R$)',
            data: dataSaldo,
            borderColor: '#2563EB',
            backgroundColor: 'rgba(37, 99, 235, 0.12)',
            fill: true,
            tension: 0.3,
            borderWidth: 2.5,
            pointBackgroundColor: '#0F1D32',
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return ' Saldo Devedor: R$ ' + context.parsed.y.toLocaleString('pt-BR');
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return 'R$ ' + (value / 1000) + 'k';
                }
              },
              grid: { color: '#e2e8f0' }
            },
            x: {
              grid: { display: false }
            }
          }
        }
      });
    }

    // Attach listeners to simulator inputs
    ['inputAlunos', 'inputMensalidade', 'inputCustos', 'inputValuation', 'inputCarencia', 'inputInadimplencia'].forEach(id => {
      document.getElementById(id).addEventListener('input', updateSimulator);
    });

    // Initialize Simulator and Chart on Page Load
    window.onload = function() {
      updateSimulator();
      updateChecklist();
    };
  </script>
</body>
</html>`;
  
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  });
}
