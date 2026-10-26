export const DEFAULT_GC_ROTEIRO_TITLE = "Além do Raso: Raízes e Maturidade na Fé";

export const DEFAULT_GC_ROTEIRO_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Além do Raso: Raízes e Maturidade na Fé — Roteiro de GC</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #F9F8F5;
            color: #2D3142;
        }
        .nav-link {
            transition: all 0.2s ease;
            border-bottom: 2px solid transparent;
        }
        .nav-link:hover, .nav-link.active {
            color: #D99A28;
            border-bottom-color: #D99A28;
        }
        .accordion-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.4s ease-out;
        }
        .accordion-content.open {
            max-height: 15000px;
            transition: max-height 0.6s ease-in;
        }
        .badge-step {
            background-color: rgba(255, 255, 255, 0.2) !important;
            color: #FDE68A !important;
            border: 1px solid rgba(253, 230, 138, 0.4) !important;
            font-weight: 700 !important;
            font-size: 0.78rem !important;
            padding: 3px 12px !important;
            border-radius: 9999px !important;
            letter-spacing: 0.04em !important;
        }
        .moment-header {
            background-color: #244735 !important;
            color: #FFFFFF !important;
            border-left: 5px solid #D99A28 !important;
            border-radius: 10px !important;
            padding: 12px 18px !important;
            margin-top: 24px !important;
            margin-bottom: 14px !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            box-shadow: 0 2px 8px rgba(36, 71, 53, 0.12) !important;
        }
        .moment-header h3 {
            color: #FFFFFF !important;
            font-weight: 700 !important;
            margin: 0 !important;
            font-size: 1.05rem !important;
            letter-spacing: -0.01em !important;
        }
        @media print {
            header, nav, #nav, .no-print, .floating-actions, .fixed, #toggleApoio, #toggle-apoio-btn {
                display: none !important;
            }
            #apoio, .apoio-lider, section#apoio, #conteudo-apoio, .accordion-content {
                display: none !important;
            }
            body {
                background-color: #FFFFFF !important;
                color: #1F2937 !important;
                padding: 0 !important;
                margin: 0 !important;
            }
            main, .container {
                max-width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
                box-shadow: none !important;
            }
            .card, section {
                box-shadow: none !important;
                border: 1px solid #E5E7EB !important;
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body class="antialiased selection:bg-amber-100 selection:text-amber-900">

    <!-- CABEÇALHO -->
    <header class="sticky top-0 bg-white/95 backdrop-blur-md z-50 border-b border-stone-200 no-print">
        <div class="container mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center">
            <div class="flex items-center space-x-2">
                <span class="w-3 h-3 rounded-full bg-[#D99A28]"></span>
                <span class="font-bold text-lg text-stone-800 tracking-tight">Igreja Batista da Manhã</span>
            </div>
            <nav class="flex items-center space-x-4 sm:space-x-6 text-sm font-medium text-stone-600">
                <a href="#roteiro" class="nav-link text-stone-900">Roteiro</a>
                <a href="#valores" class="nav-link">4 Valores</a>
                <a href="#avisos" class="nav-link">Avisos</a>
                <a href="#apoio" class="nav-link text-amber-700 font-semibold">Material de Apoio</a>
            </nav>
        </div>
    </header>

    <main class="container mx-auto px-4 sm:px-6 py-8 max-w-4xl">
        
        <!-- HERO / TÍTULO -->
        <section class="text-center py-6 sm:py-8">
            <span class="inline-block uppercase tracking-wider text-xs font-bold px-3 py-1 bg-amber-100 text-amber-900 rounded-full mb-3">
                Roteiro de Pequeno Grupo • GC
            </span>
            <h1 class="text-3xl sm:text-5xl font-extrabold text-[#244735] tracking-tight mb-3">
                Além do Raso: Raízes e Maturidade na Fé
            </h1>
            <p class="text-base sm:text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
                Deixando a inconstância da infância espiritual e aprofundando nossa vida diária na Palavra de Deus.
            </p>
        </section>

        <!-- CARTÃO PRINCIPAL: ROTEIRO GC -->
        <section id="roteiro" class="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-10 space-y-6">
            
            <!-- CABEÇALHO DO ESTUDO (SEM A CAIXA 'VERDADE CENTRAL') -->
            <div class="border-b border-stone-100 pb-5 space-y-3">
                <div class="flex flex-wrap gap-2 items-center text-xs font-semibold text-stone-500">
                    <span class="bg-stone-100 px-2.5 py-1 rounded-md text-stone-700">Encontro Semanal de GC</span>
                    <span class="bg-stone-100 px-2.5 py-1 rounded-md text-stone-700">Duração total: ~75 min</span>
                    <span class="bg-amber-100/70 text-amber-900 px-2.5 py-1 rounded-md">8 Momentos Oficiais</span>
                </div>
                
                <div class="bg-amber-50/70 border-l-4 border-[#D99A28] p-4 rounded-r-lg">
                    <p class="text-xs font-bold uppercase tracking-wider text-amber-900 mb-1">🎯 Objetivo a ser Alcançado</p>
                    <p class="text-stone-800 text-sm sm:text-base leading-relaxed">
                        Levar o grupo a reconhecer os perigos da superficialidade espiritual, incentivando o abandono de uma fé baseada apenas em "alimento mastigado por outros", para cultivar uma vida devocional pessoal, madura e com discernimento na Palavra de Deus.
                    </p>
                </div>

                <div class="text-sm text-stone-700 pt-1">
                    📖 <strong>Textos Bíblicos:</strong> Efésios 4:14–15 | Hebreus 5:12–14
                </div>
            </div>

            <!-- MOMENTO 1: RETORNO DO DESAFIO ANTERIOR -->
            <div class="space-y-3">
                <div class="moment-header">
                    <h3 class="text-white">MOMENTO 1 — RETORNO DO DESAFIO ANTERIOR</h3>
                    <span class="badge-step">5 MIN</span>
                </div>
                <div class="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2">
                    <p class="font-medium text-stone-800 text-sm sm:text-base">
                        💬 "Como foi a experiência de viver o desafio prático proposto no último encontro? Alguém gostaria de compartilhar uma vitória, dificuldade ou aprendizado concreto da semana?"
                    </p>
                    <p class="text-xs text-stone-500 italic">
                        💡 Dica ao facilitador: Acolha as respostas com generosidade. Este não é um momento de cobrança ou prestação de contas constrangedora, mas de celebrar pequenos passos e aprender juntos com os desafios do cotidiano.
                    </p>
                </div>
            </div>

            <!-- MOMENTO 2: ACOLHIMENTO E CUIDADO MÚTUO -->
            <div class="space-y-3 pt-2">
                <div class="moment-header">
                    <h3 class="text-white">MOMENTO 2 — ACOLHIMENTO E CUIDADO MÚTUO</h3>
                    <span class="badge-step">10 MIN</span>
                </div>
                <div class="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2">
                    <p class="font-medium text-stone-800 text-sm sm:text-base">
                        💬 "Em uma ou duas palavras, como você chega ao nosso GC hoje? O que mais marcou a sua semana (uma alegria ou um desafio pessoal)?"
                    </p>
                    <p class="text-xs text-stone-500 italic">
                        💡 Dica ao facilitador: Apresente calorosamente visitantes e novos membros pelo nome. Crie um ambiente de escuta onde cada pessoa sinta que seu coração importa antes de abrir a Bíblia.
                    </p>
                </div>
            </div>

            <!-- MOMENTO 3: LOUVOR E ADORAÇÃO -->
            <div class="space-y-3 pt-2">
                <div class="moment-header">
                    <h3 class="text-white">MOMENTO 3 — LOUVOR E ADORAÇÃO</h3>
                    <span class="badge-step">10 MIN</span>
                </div>
                <p class="text-sm text-stone-600">
                    Sugestões de canções que convidam o grupo a fixar os olhos na firmeza e soberania de Deus:
                </p>
                <div class="grid sm:grid-cols-2 gap-3 pt-1">
                    <div class="p-3.5 bg-stone-50 border border-stone-200/90 rounded-xl text-sm">
                        <div class="font-semibold text-stone-900">Em Teus Braços</div>
                        <div class="text-stone-500 text-xs">Laura Souguellis</div>
                        <div class="text-xs text-amber-800 mt-1 italic">Tema: Descanso, segurança e intimidade no Pai.</div>
                    </div>
                    <div class="p-3.5 bg-stone-50 border border-stone-200/90 rounded-xl text-sm">
                        <div class="font-semibold text-stone-900">Cristo, Nossa Certeza (Christ Our Hope)</div>
                        <div class="text-stone-500 text-xs">Soberana Graça / Projeto Sola</div>
                        <div class="text-xs text-amber-800 mt-1 italic">Tema: Fé inabalável e esperança viva na rocha eterna.</div>
                    </div>
                </div>
            </div>

            <!-- MOMENTO 4: QUEBRA-GELO TEMÁTICO -->
            <div class="space-y-3 pt-2">
                <div class="moment-header">
                    <h3 class="text-white">MOMENTO 4 — QUEBRA-GELO TEMÁTICO</h3>
                    <span class="badge-step">5 MIN</span>
                </div>
                <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
                    <p class="font-medium text-stone-800 text-sm sm:text-base">
                        💬 "Quando você era criança, qual era aquela comida que você não suportava de jeito nenhum e que hoje você come ou até adora? O que mudou no seu gosto com o passar dos anos?"
                    </p>
                    <p class="text-xs text-stone-500 mt-2 italic">
                        💡 Dica ao facilitador: Conecte as respostas de forma leve: assim como nosso paladar precisa amadurecer para alimentos mais nutritivos, nossa vida espiritual também precisa crescer e se aprofundar na Palavra.
                    </p>
                </div>
            </div>

            <!-- MOMENTO 5: A PALAVRA NO CENTRO -->
            <div class="space-y-6 pt-2">
                <div class="moment-header">
                    <h3 class="text-white">MOMENTO 5 — A PALAVRA NO CENTRO</h3>
                    <span class="badge-step">30 MIN</span>
                </div>
                <p class="text-xs text-stone-500 italic -mt-1">
                    Mesa de conversa participativa: conduza as 3 dimensões (Entender, Sentir e Agir) em cada movimento, ouvindo os participantes sem transformar o encontro em pregação.
                </p>

                <!-- MOVIMENTO 1 -->
                <div class="bg-stone-50/70 p-5 sm:p-6 rounded-2xl border border-stone-200/90 space-y-4">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold uppercase tracking-wider text-amber-900">Movimento 1</span>
                        <span class="text-xs text-stone-500 font-mono font-semibold">Efésios 4:14</span>
                    </div>
                    <h4 class="text-lg font-bold text-stone-900">1. O Vento Sopra: O Risco de Raízes Superficiais</h4>
                    <p class="text-sm text-stone-700 leading-relaxed">
                        Uma árvore sem raízes profundas parece bonita em dias de sol, mas qualquer ventania forte a desestabiliza. Paulo alerta sobre o perigo de sermos crianças espirituais, vulneráveis a opiniões passageiras e ventos de doutrina.
                    </p>

                    <!-- 3 COLUNAS: ENTENDER / SENTIR / AGIR -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                        <!-- ENTENDER -->
                        <div class="col-entender bg-blue-50/60 border border-blue-200/80 rounded-xl p-3.5 space-y-2">
                            <div class="flex items-center gap-1.5 text-blue-900 font-bold text-xs uppercase tracking-wide">
                                <span>🧠</span>
                                <span>Entender (Cognitivo)</span>
                            </div>
                            <p class="text-xs sm:text-sm text-stone-800 font-medium">
                                Segundo o texto, quais são as características de quem ainda é uma "criança espiritual"?
                            </p>
                        </div>

                        <!-- SENTIR -->
                        <div class="col-sentir bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 space-y-2">
                            <div class="flex items-center gap-1.5 text-amber-900 font-bold text-xs uppercase tracking-wide">
                                <span>❤️</span>
                                <span>Sentir (Afetivo)</span>
                            </div>
                            <p class="text-xs sm:text-sm text-stone-800 font-medium">
                                Quando as crises ou pressões chegam, o que você costuma sentir: segurança ou insegurança que balança sua fé?
                            </p>
                        </div>

                        <!-- AGIR -->
                        <div class="col-agir bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 space-y-2">
                            <div class="flex items-center gap-1.5 text-emerald-900 font-bold text-xs uppercase tracking-wide">
                                <span>👣</span>
                                <span>Agir (Prático)</span>
                            </div>
                            <p class="text-xs sm:text-sm text-stone-800 font-medium">
                                Que escolha diária pode ajudar você a criar raízes sólidas nas Escrituras e menos nas redes sociais?
                            </p>
                        </div>
                    </div>

                    <!-- CAIXA VERDADE DO TÓPICO -->
                    <div class="verdade-topico bg-emerald-50 border-l-4 border-emerald-600 p-3.5 rounded-r-xl">
                        <span class="text-emerald-800 font-bold uppercase text-xs tracking-wider block mb-0.5">VERDADE DO TÓPICO</span>
                        <p class="text-emerald-950 font-semibold text-sm">
                            "Fé firme não nasce do consumo rápido de opiniões, mas do enraizamento paciente na Palavra de Deus."
                        </p>
                    </div>
                </div>

                <!-- MOVIMENTO 2 -->
                <div class="bg-stone-50/70 p-5 sm:p-6 rounded-2xl border border-stone-200/90 space-y-4">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold uppercase tracking-wider text-amber-900">Movimento 2</span>
                        <span class="text-xs text-stone-500 font-mono font-semibold">Hebreus 5:12–14</span>
                    </div>
                    <h4 class="text-lg font-bold text-stone-900">2. Do Leite ao Alimento Sólido: A Arte de Mastigar a Palavra</h4>
                    <p class="text-sm text-stone-700 leading-relaxed">
                        Um bebê precisa de leite porque ainda não mastiga. O autor de Hebreus exorta a igreja porque muitos continuavam esperando que terceiros mastigassem a Bíblia por eles, em vez de desenvolver intimidade direta com o Senhor no secreto.
                    </p>

                    <!-- 3 COLUNAS: ENTENDER / SENTIR / AGIR -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                        <!-- ENTENDER -->
                        <div class="col-entender bg-blue-50/60 border border-blue-200/80 rounded-xl p-3.5 space-y-2">
                            <div class="flex items-center gap-1.5 text-blue-900 font-bold text-xs uppercase tracking-wide">
                                <span>🧠</span>
                                <span>Entender (Cognitivo)</span>
                            </div>
                            <p class="text-xs sm:text-sm text-stone-800 font-medium">
                                Qual é a diferença bíblica entre quem se alimenta de leite e quem está pronto para alimento sólido?
                            </p>
                        </div>

                        <!-- SENTIR -->
                        <div class="col-sentir bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 space-y-2">
                            <div class="flex items-center gap-1.5 text-amber-900 font-bold text-xs uppercase tracking-wide">
                                <span>❤️</span>
                                <span>Sentir (Afetivo)</span>
                            </div>
                            <p class="text-xs sm:text-sm text-stone-800 font-medium">
                                Honestamente, qual tem sido sua maior barreira interna para abrir a Bíblia no secreto: cansaço, pressa ou falta de hábito?
                            </p>
                        </div>

                        <!-- AGIR -->
                        <div class="col-agir bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 space-y-2">
                            <div class="flex items-center gap-1.5 text-emerald-900 font-bold text-xs uppercase tracking-wide">
                                <span>👣</span>
                                <span>Agir (Prático)</span>
                            </div>
                            <p class="text-xs sm:text-sm text-stone-800 font-medium">
                                Que horário e lugar do seu dia você pode reservar exclusivamente para ler e orar com a Bíblia aberta?
                            </p>
                        </div>
                    </div>

                    <!-- CAIXA VERDADE DO TÓPICO -->
                    <div class="verdade-topico bg-emerald-50 border-l-4 border-emerald-600 p-3.5 rounded-r-xl">
                        <span class="text-emerald-800 font-bold uppercase text-xs tracking-wider block mb-0.5">VERDADE DO TÓPICO</span>
                        <p class="text-emerald-950 font-semibold text-sm">
                            "Maturidade espiritual começa quando paramos de terceirizar nossa comunhão e aprendemos a sentar com Deus no secreto."
                        </p>
                    </div>
                </div>

                <!-- MOVIMENTO 3 -->
                <div class="bg-stone-50/70 p-5 sm:p-6 rounded-2xl border border-stone-200/90 space-y-4">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold uppercase tracking-wider text-amber-900">Movimento 3</span>
                        <span class="text-xs text-stone-500 font-mono font-semibold">Efésios 4:15 | Hebreus 5:14</span>
                    </div>
                    <h4 class="text-lg font-bold text-stone-900">3. Discernimento: Conhecer o Original para Reconhecer o Engano</h4>
                    <p class="text-sm text-stone-700 leading-relaxed">
                        Um bancário experiente reconhece uma nota falsa não porque estudou todas as imitações, mas porque manuseou a verdadeira tantas vezes que o erro salta aos olhos. O discernimento cristão nasce do contato constante com a verdade bíblica.
                    </p>

                    <!-- 3 COLUNAS: ENTENDER / SENTIR / AGIR -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                        <!-- ENTENDER -->
                        <div class="col-entender bg-blue-50/60 border border-blue-200/80 rounded-xl p-3.5 space-y-2">
                            <div class="flex items-center gap-1.5 text-blue-900 font-bold text-xs uppercase tracking-wide">
                                <span>🧠</span>
                                <span>Entender (Cognitivo)</span>
                            </div>
                            <p class="text-xs sm:text-sm text-stone-800 font-medium">
                                Como Hebreus 5:14 define a prática que desenvolve a capacidade de discernir o bem e o mal?
                            </p>
                        </div>

                        <!-- SENTIR -->
                        <div class="col-sentir bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 space-y-2">
                            <div class="flex items-center gap-1.5 text-amber-900 font-bold text-xs uppercase tracking-wide">
                                <span>❤️</span>
                                <span>Sentir (Afetivo)</span>
                            </div>
                            <p class="text-xs sm:text-sm text-stone-800 font-medium">
                                Você já se sentiu confuso ou seduzido por discursos modernos que pareciam certos, mas feriam a Bíblia?
                            </p>
                        </div>

                        <!-- AGIR -->
                        <div class="col-agir bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 space-y-2">
                            <div class="flex items-center gap-1.5 text-emerald-900 font-bold text-xs uppercase tracking-wide">
                                <span>👣</span>
                                <span>Agir (Prático)</span>
                            </div>
                            <p class="text-xs sm:text-sm text-stone-800 font-medium">
                                Como você pode usar o conselho dos irmãos do GC para filtrar decisões importantes nesta semana?
                            </p>
                        </div>
                    </div>

                    <!-- CAIXA VERDADE DO TÓPICO -->
                    <div class="verdade-topico bg-emerald-50 border-l-4 border-emerald-600 p-3.5 rounded-r-xl">
                        <span class="text-emerald-800 font-bold uppercase text-xs tracking-wider block mb-0.5">VERDADE DO TÓPICO</span>
                        <p class="text-emerald-950 font-semibold text-sm">
                            "Quem toca com frequência na verdade do Evangelho não é enganado pelas ilusões deste mundo."
                        </p>
                    </div>
                </div>

            </div>

            <!-- MOMENTO 6: DESAFIO DA SEMANA (ESTRITAMENTE PONTO ÚNICO) -->
            <div class="space-y-3 pt-2">
                <div class="moment-header">
                    <h3 class="text-white">MOMENTO 6 — DESAFIO DA SEMANA (PONTO ÚNICO)</h3>
                    <span class="badge-step">5 MIN</span>
                </div>
                <div class="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400 p-5 rounded-2xl shadow-sm space-y-2">
                    <div class="flex items-center gap-2">
                        <span class="text-amber-700 text-lg">⚡</span>
                        <h4 class="font-bold text-amber-950 text-sm sm:text-base uppercase tracking-wide">
                            Desafio Prático dos Próximos 7 Dias
                        </h4>
                    </div>
                    <p class="text-stone-900 font-semibold text-base sm:text-lg leading-snug">
                        Separar pelo menos 15 minutos em 3 dias desta semana para ler com calma a carta aos Efésios no secreto (sem redes sociais ligadas) e anotar em um caderno uma decisão prática de obediência a Deus.
                    </p>
                    <p class="text-xs text-stone-500 italic pt-1">
                        📌 Guarde suas anotações para compartilharmos nossos passos e vitórias no MOMENTO 1 do próximo encontro!
                    </p>
                </div>
            </div>

            <!-- MOMENTO 7: ORAÇÃO E CUIDADO MÚTUO -->
            <div class="space-y-3 pt-2">
                <div class="moment-header">
                    <h3 class="text-white">MOMENTO 7 — ORAÇÃO E CUIDADO MÚTUO</h3>
                    <span class="badge-step">7 MIN</span>
                </div>
                <div class="bg-stone-50 p-4 rounded-xl border border-stone-200 text-sm text-stone-700 space-y-2">
                    <p class="font-medium text-stone-800">
                        Dividam-se em duplas ou trios de oração para interceder por:
                    </p>
                    <ol class="list-decimal list-inside space-y-1.5 text-stone-700 text-xs sm:text-sm">
                        <li><strong>Fome pela Palavra:</strong> Graça e disciplina diária para cumprir o desafio semanal no secreto.</li>
                        <li><strong>Cuidado Mútuo:</strong> Necessidades familiares, emocionais e de saúde compartilhadas no encontro.</li>
                        <li><strong>Coração Evangelístico:</strong> Amigos, colegas de trabalho e familiares que ainda precisam de Jesus.</li>
                    </ol>
                </div>
            </div>

            <!-- MOMENTO 8: AVISOS E CONEXÕES -->
            <div id="avisos" class="space-y-3 pt-2">
                <div class="moment-header">
                    <h3 class="text-white">MOMENTO 8 — AVISOS E CONEXÕES</h3>
                    <span class="badge-step">3 MIN</span>
                </div>
                <div class="space-y-2.5 text-xs sm:text-sm text-stone-700">
                    <div class="flex items-start gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200">
                        <span class="bg-[#244735] text-amber-300 font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs mt-0.5">1</span>
                        <div>
                            <strong class="text-stone-900 block">IBM College (Trilho Teológico):</strong>
                            Tem início nesta próxima quinta-feira! É a oportunidade ideal para quem deseja aprofundar seu conhecimento bíblico e teológico. Não fique no raso; procure a liderança e faça sua inscrição.
                        </div>
                    </div>
                    <div class="flex items-start gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200">
                        <span class="bg-[#244735] text-amber-300 font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs mt-0.5">2</span>
                        <div>
                            <strong class="text-stone-900 block">Conferência Missão de Casa:</strong>
                            No encerramento de setembro, receberemos o Pr. Alvin e o Pr. Rafael Abdalla. Reserve as datas com sua família e prepare seu coração para vivermos esse tempo precioso de edificação e comunhão!
                        </div>
                    </div>
                </div>
            </div>

            <!-- NOSSOS 4 VALORES FUNDAMENTAIS (OBRIGATÓRIO APÓS OS AVISOS) -->
            <section id="valores" class="valores-ibm" style="background: linear-gradient(135deg, #FDFBF7 0%, #F5F0E6 100%); border: 1.5px solid #E8DFD1; border-radius: 16px; padding: 20px 24px; margin-top: 24px; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px;">
                    <span style="display: inline-block; width: 8px; height: 8px; border-radius: 9999px; background-color: #D99A28;"></span>
                    <h4 style="margin: 0; font-size: 0.85rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #244735;">Nossos 4 Valores</h4>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
                    <div style="background: #FFFFFF; border: 1px solid #EADDC7; border-radius: 12px; padding: 12px 14px; display: flex; align-items: center; gap: 10px;">
                        <span style="background: #244735; color: #FDE68A; font-weight: 800; font-size: 0.8rem; width: 24px; height: 24px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">1</span>
                        <span style="color: #2D3142; font-weight: 700; font-size: 0.9rem;">Presença de Deus</span>
                    </div>
                    <div style="background: #FFFFFF; border: 1px solid #EADDC7; border-radius: 12px; padding: 12px 14px; display: flex; align-items: center; gap: 10px;">
                        <span style="background: #244735; color: #FDE68A; font-weight: 800; font-size: 0.8rem; width: 24px; height: 24px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">2</span>
                        <span style="color: #2D3142; font-weight: 700; font-size: 0.9rem;">Capacitação ministerial</span>
                    </div>
                    <div style="background: #FFFFFF; border: 1px solid #EADDC7; border-radius: 12px; padding: 12px 14px; display: flex; align-items: center; gap: 10px;">
                        <span style="background: #244735; color: #FDE68A; font-weight: 800; font-size: 0.8rem; width: 24px; height: 24px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">3</span>
                        <span style="color: #2D3142; font-weight: 700; font-size: 0.9rem;">Relacionamento discipulador</span>
                    </div>
                    <div style="background: #FFFFFF; border: 1px solid #EADDC7; border-radius: 12px; padding: 12px 14px; display: flex; align-items: center; gap: 10px;">
                        <span style="background: #244735; color: #FDE68A; font-weight: 800; font-size: 0.8rem; width: 24px; height: 24px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">4</span>
                        <span style="color: #2D3142; font-weight: 700; font-size: 0.9rem;">Crescimento saudável</span>
                    </div>
                </div>
            </section>

            <!-- MENSAGEM DE GRAÇA EVANGELÍSTICA -->
            <div class="bg-[#244735] text-white p-5 sm:p-6 rounded-2xl space-y-2 mt-4">
                <h4 class="font-bold text-[#FDE68A] text-base flex items-center gap-2">
                    <span>🌱</span>
                    <span>Mensagem de Graça (Para quem nos visita ou está recomeçando)</span>
                </h4>
                <p class="text-xs sm:text-sm text-stone-200 leading-relaxed">
                    Maturidade bíblica não é sobre ser perfeito ou ter respostas para todas as perguntas, mas sobre colocar nossa confiança diária na pessoa e na obra de Jesus Cristo. Ele é a rocha firme que nos acolhe, perdoa nossos erros e nos ensina a caminhar em paz. Se você deseja dar um passo com Cristo hoje, converse conosco ao final!
                </p>
            </div>

        </section>

        <!-- SEÇÃO: MATERIAL DE APOIO AO LÍDER (RECOLHÍVEL & OCULTO NA IMPRESSÃO/PDF) -->
        <section id="apoio" class="mt-8 no-print">
            <div class="bg-stone-900 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-stone-800">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-800 pb-5">
                    <div>
                        <span class="text-xs font-semibold text-amber-400 uppercase tracking-widest">Guia Exclusivo do Facilitador</span>
                        <h2 class="text-xl sm:text-2xl font-bold text-white mt-1">Material de Apoio para o Líder</h2>
                        <p class="text-xs sm:text-sm text-stone-400 mt-1">
                            Conteúdo exclusivo para orientar o facilitador, prever respostas e aprofundar a conversa bíblica. (Oculto na impressão em PDF).
                        </p>
                    </div>
                    <button id="toggle-apoio-btn" class="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition duration-200 whitespace-nowrap shadow-sm">
                        Abrir Material de Apoio
                    </button>
                </div>

                <!-- CONTEÚDO EXPANSÍVEL -->
                <div id="conteudo-apoio" class="accordion-content space-y-6 pt-0">
                    
                    <!-- DICAS DE FACILITAÇÃO -->
                    <div class="mt-6 bg-stone-800/80 p-4 sm:p-5 rounded-xl border border-stone-700 space-y-3">
                        <h3 class="text-sm font-bold text-amber-300 uppercase tracking-wider">🛠️ Postura do Facilitador no GC</h3>
                        <div class="grid sm:grid-cols-2 gap-3 text-xs sm:text-sm text-stone-300">
                            <div class="p-3 bg-stone-900/50 rounded-lg">
                                <strong class="text-white block mb-1">Se o grupo ficar em silêncio:</strong>
                                Não se desespere nem dê a resposta logo. Reformule a pergunta ou convide alguém carinhosamente: <em>"Lucas, pensando na sua rotina nesta semana, como você enxerga isso?"</em>
                            </div>
                            <div class="p-3 bg-stone-900/50 rounded-lg">
                                <strong class="text-white block mb-1">Se alguém monopolizar a fala:</strong>
                                Agradeça e redirecione com gentileza: <em>"Muito bom o seu ponto! Gostaria de ouvir mais alguém que ainda não compartilhou hoje sobre esse aspecto."</em>
                            </div>
                            <div class="p-3 bg-stone-900/50 rounded-lg">
                                <strong class="text-white block mb-1">Se a conversa fugir do tema:</strong>
                                Traga de volta com mansidão: <em>"Esse assunto é muito relevante, mas pensando no texto bíblico sobre raízes na Palavra, como isso se aplica a nós?"</em>
                            </div>
                            <div class="p-3 bg-stone-900/50 rounded-lg">
                                <strong class="text-white block mb-1">Se surgir dúvida complexa:</strong>
                                Seja transparente e humilde: <em>"Essa é uma ótima pergunta. Não quero te dar uma resposta superficial agora, vou orar, pesquisar com os pastores e conversamos!"</em>
                            </div>
                        </div>
                    </div>

                    <!-- GUIA POR MOVIMENTO -->
                    <div class="space-y-4">
                        
                        <!-- Movimento 1 Apoio -->
                        <div class="bg-stone-800/50 p-4 sm:p-5 rounded-xl border border-stone-700/80 space-y-2 text-xs sm:text-sm">
                            <div class="flex items-center justify-between text-amber-400 font-bold">
                                <span>Movimento 1: Raízes vs. Superficialidade</span>
                                <span class="text-stone-400 font-mono text-xs">Efésios 4:14</span>
                            </div>
                            <p class="text-stone-300">
                                <strong>Direção esperada das respostas:</strong> Os irmãos reconhecerão que a correria, o cansaço mental e as notificações das redes sociais têm roubado a paciência para o silêncio e o estudo das Escrituras.
                            </p>
                            <div class="p-3 bg-stone-900/70 rounded-lg border-l-2 border-amber-500">
                                <span class="text-amber-300 font-semibold block text-xs mb-1">Pergunta opcional de aprofundamento:</span>
                                <p class="text-stone-300 italic">
                                    "Por que nós conseguimos passar 40 minutos rolando vídeos curtos na cama sem cansar, mas achamos difícil passar 15 minutos lendo um capítulo da Bíblia?"
                                </p>
                            </div>
                        </div>

                        <!-- Movimento 2 Apoio -->
                        <div class="bg-stone-800/50 p-4 sm:p-5 rounded-xl border border-stone-700/80 space-y-2 text-xs sm:text-sm">
                            <div class="flex items-center justify-between text-amber-400 font-bold">
                                <span>Movimento 2: Leite vs. Alimento Sólido</span>
                                <span class="text-stone-400 font-mono text-xs">Hebreus 5:12–14</span>
                            </div>
                            <p class="text-stone-300">
                                <strong>Contexto teológico:</strong> O autor de Hebreus repreende cristãos veteranos que já deveriam ser mestres e praticantes, mas continuavam espiritualmente infantis, dependentes de outros para interpretar a vida.
                            </p>
                            <div class="p-3 bg-stone-900/70 rounded-lg border-l-2 border-amber-500">
                                <span class="text-amber-300 font-semibold block text-xs mb-1">Pergunta opcional de aprofundamento:</span>
                                <p class="text-stone-300 italic">
                                    "Quando você enfrenta uma decisão difícil no casamento, nas finanças ou no trabalho, você busca conselho nas Escrituras ou corre logo para a opinião das redes sociais?"
                                </p>
                            </div>
                        </div>

                        <!-- Movimento 3 Apoio -->
                        <div class="bg-stone-800/50 p-4 sm:p-5 rounded-xl border border-stone-700/80 space-y-2 text-xs sm:text-sm">
                            <div class="flex items-center justify-between text-amber-400 font-bold">
                                <span>Movimento 3: Discernimento e Verdade</span>
                                <span class="text-stone-400 font-mono text-xs">Efésios 4:15 | Hebreus 5:14</span>
                            </div>
                            <p class="text-stone-300">
                                <strong>Ponto-chave da ilustração:</strong> O exemplo da nota falsa. A intimidade com o original é o que alerta o coração diante das cópias e dos enganos humanos.
                            </p>
                            <div class="p-3 bg-stone-900/70 rounded-lg border-l-2 border-amber-500">
                                <span class="text-amber-300 font-semibold block text-xs mb-1">Pergunta opcional de aprofundamento:</span>
                                <p class="text-stone-300 italic">
                                    "Como o convívio sincero aqui no GC e na igreja funciona como uma cerca viva de proteção contra o engano e o isolamento espiritual?"
                                </p>
                            </div>
                        </div>

                    </div>

                    <!-- CHECKLIST DO LÍDER -->
                    <div class="bg-stone-800 p-4 rounded-xl text-xs sm:text-sm text-stone-300 space-y-2 border border-stone-700">
                        <strong class="text-amber-300 block">📋 Checklist pós-encontro:</strong>
                        <ul class="list-disc list-inside space-y-1">
                            <li>Envie uma mensagem no grupo no meio da semana incentivando o Desafio dos 3 dias em Efésios.</li>
                            <li>Ligue ou mande mensagem de acolhimento para os visitantes ou quem compartilhou lutas delicadas na oração.</li>
                            <li>Reforce o convite para o início do IBM College nesta quinta-feira.</li>
                        </ul>
                    </div>

                </div>
            </div>
        </section>

    </main>

    <!-- RODAPÉ -->
    <footer class="bg-white border-t border-stone-200 mt-12 py-6 text-center text-xs text-stone-500 no-print">
        <div class="container mx-auto px-4">
            <p class="font-semibold text-stone-700">© 2026 Igreja Batista da Manhã | Roteiro de Grupos de Crescimento (GC)</p>
            <p class="mt-1 text-stone-400">Pessoas cuidando de pessoas • Formando discípulos de Jesus</p>
        </div>
    </footer>

    <!-- INTERATIVIDADE JS -->
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            const toggleBtn = document.getElementById('toggle-apoio-btn');
            const conteudoApoio = document.getElementById('conteudo-apoio');

            if (toggleBtn && conteudoApoio) {
                toggleBtn.addEventListener('click', function () {
                    const isOpen = conteudoApoio.classList.contains('open');
                    if (isOpen) {
                        conteudoApoio.classList.remove('open');
                        toggleBtn.textContent = 'Abrir Material de Apoio';
                        toggleBtn.classList.remove('bg-stone-700');
                        toggleBtn.classList.add('bg-amber-600');
                    } else {
                        conteudoApoio.classList.add('open');
                        toggleBtn.textContent = 'Ocultar Material de Apoio';
                        toggleBtn.classList.remove('bg-amber-600');
                        toggleBtn.classList.add('bg-stone-700');
                    }
                });
            }

            // Rolagem suave para âncoras
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function (e) {
                    const targetId = this.getAttribute('href');
                    if (targetId && targetId.length > 1) {
                        e.preventDefault();
                        const targetElement = document.querySelector(targetId);
                        if (targetElement) {
                            targetElement.scrollIntoView({ behavior: 'smooth' });
                        }
                    }
                });
            });
        });
    </script>
</body>
</html>`;