export const DEFAULT_GC_ROTEIRO_TITLE = "Além do Raso: Raízes e Maturidade na Fé";

export const DEFAULT_GC_ROTEIRO_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Além do Raso: Roteiro de GC</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
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
            color: #B8860B;
            border-bottom-color: #B8860B;
        }
        .accordion-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.35s ease-out;
        }
        .accordion-content.open {
            max-height: 1200px;
            transition: max-height 0.5s ease-in;
        }
        .badge-step {
            background: #EFE8DA;
            color: #8C6212;
        }
    </style>
</head>
<body class="antialiased selection:bg-amber-100 selection:text-amber-900">

    <!-- CABEÇALHO -->
    <header class="sticky top-0 bg-white/95 backdrop-blur-md z-50 border-b border-stone-200">
        <div class="container mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center">
            <div class="flex items-center space-x-2">
                <span class="w-3 h-3 rounded-full bg-amber-600"></span>
                <span class="font-bold text-lg text-stone-800 tracking-tight">Igreja Batista da Manhã</span>
            </div>
            <nav class="flex items-center space-x-4 sm:space-x-6 text-sm font-medium text-stone-600">
                <a href="#roteiro" class="nav-link text-stone-900">Roteiro</a>
                <a href="#apoio" class="nav-link">Material de Apoio</a>
                <a href="#avisos" class="nav-link">Avisos</a>
            </nav>
        </div>
    </header>

    <main class="container mx-auto px-4 sm:px-6 py-8 max-w-4xl">
        
        <!-- HERO / TÍTULO -->
        <section class="text-center py-6 sm:py-10">
            <span class="inline-block uppercase tracking-wider text-xs font-semibold px-3 py-1 bg-amber-100 text-amber-800 rounded-full mb-3">
                Roteiro de Pequeno Grupo
            </span>
            <h1 class="text-3xl sm:text-5xl font-extrabold text-stone-900 tracking-tight mb-3">
                Além do Raso: Raízes e Maturidade na Fé
            </h1>
            <p class="text-base sm:text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
                Deixando a inconstância da infância espiritual e aprofundando nossa vida com a Palavra de Deus.
            </p>
        </section>

        <!-- CARTÃO PRINCIPAL: ROTEIRO GC -->
        <section id="roteiro" class="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-10 space-y-8">
            
            <!-- CABEÇALHO DO ESTUDO -->
            <div class="border-b border-stone-100 pb-6 space-y-3">
                <div class="flex flex-wrap gap-2 items-center text-xs font-semibold text-stone-500">
                    <span class="bg-stone-100 px-2.5 py-1 rounded-md text-stone-700">Encontro Semanal</span>
                    <span class="bg-stone-100 px-2.5 py-1 rounded-md text-stone-700">Duração estimada: 60-70 min</span>
                </div>
                
                <div class="bg-amber-50/70 border-l-4 border-amber-600 p-4 rounded-r-lg">
                    <p class="text-xs font-bold uppercase tracking-wider text-amber-900 mb-1">🎯 Objetivo a ser Alcançado</p>
                    <p class="text-stone-800 text-sm sm:text-base leading-relaxed">
                        Levar o grupo a reconhecer os perigos da superficialidade espiritual, incentivando o abandono de uma fé baseada apenas em "alimento processado" por terceiros, para cultivar uma vida devocional pessoal, madura e com discernimento na Palavra.
                    </p>
                </div>

                <div class="text-sm text-stone-600 pt-1">
                    📖 <strong>Textos-Base:</strong> Efésios 4:14–15 | Hebreus 5:12–14
                </div>
            </div>

            <!-- MOMENTO 1: LOUVOR -->
            <div class="space-y-3">
                <div class="flex items-center space-x-3">
                    <span class="badge-step font-bold text-xs px-2.5 py-1 rounded-full">10 MIN</span>
                    <h3 class="text-lg font-bold text-stone-900">Louvor e Adoração</h3>
                </div>
                <p class="text-sm text-stone-600">
                    Sugestões de canções que nos convidam a firmar nossa fé na rocha inabalável de Cristo:
                </p>
                <div class="grid sm:grid-cols-2 gap-3 pt-1">
                    <div class="p-3.5 bg-stone-50 border border-stone-200/80 rounded-xl text-sm">
                        <div class="font-semibold text-stone-900">Em Teus Braços</div>
                        <div class="text-stone-500 text-xs">Laura Souguellis</div>
                        <div class="text-xs text-amber-800 mt-1 italic">Tema: Descanso e segurança naquele que nos sustenta.</div>
                    </div>
                    <div class="p-3.5 bg-stone-50 border border-stone-200/80 rounded-xl text-sm">
                        <div class="font-semibold text-stone-900">Cristo, Nossa Certeza (Christ Our Hope in Life and Death)</div>
                        <div class="text-stone-500 text-xs">Soberana Graça / Projeto Sola</div>
                        <div class="text-xs text-amber-800 mt-1 italic">Tema: Uma fé inabalável em meio às tempestades.</div>
                    </div>
                </div>
            </div>

            <!-- MOMENTO 2: QUEBRA-GELO -->
            <div class="space-y-3 pt-4 border-t border-stone-100">
                <div class="flex items-center space-x-3">
                    <span class="badge-step font-bold text-xs px-2.5 py-1 rounded-full">10 MIN</span>
                    <h3 class="text-lg font-bold text-stone-900">Quebra-Gelo: Mesa de Conversa</h3>
                </div>
                <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
                    <p class="font-medium text-stone-800 text-sm sm:text-base">
                        💬 "Quando você era criança, qual era aquela comida que você não suportava de jeito nenhum e que hoje você come ou até adora? O que mudou no seu gosto com o tempo?"
                    </p>
                    <p class="text-xs text-stone-500 mt-2">
                        <em>Dica ao facilitador: use essa pergunta de forma leve para introduzir a ideia de que nosso paladar amadurece — e a nossa vida com Deus também precisa amadurecer.</em>
                    </p>
                </div>
            </div>

            <!-- MOMENTO 3: PALAVRA / CONVERSA -->
            <div class="space-y-8 pt-4 border-t border-stone-100">
                <div>
                    <div class="flex items-center space-x-3 mb-1">
                        <span class="badge-step font-bold text-xs px-2.5 py-1 rounded-full">35 MIN</span>
                        <h3 class="text-xl font-bold text-stone-900">A Palavra no Centro</h3>
                    </div>
                    <p class="text-xs text-stone-500">
                        Conduza como uma conversa dinâmica. O objetivo não é pregar, mas fazer perguntas e ouvir os irmãos.
                    </p>
                </div>

                <!-- BLOCO 1 -->
                <div class="bg-stone-50/60 p-5 sm:p-6 rounded-2xl border border-stone-200/90 space-y-4">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold uppercase tracking-wider text-amber-800">Bloco 1</span>
                        <span class="text-xs text-stone-500 font-mono">Efésios 4:14</span>
                    </div>
                    <h4 class="text-lg font-bold text-stone-900">1. O Vento Sopra: O Risco de Raízes Superficiais</h4>
                    
                    <div class="text-sm text-stone-700 leading-relaxed space-y-2">
                        <p>
                            Vivemos num tempo marcado por um excesso absurdo de informação: sabemos pinceladas sobre quase tudo, mas raramente nos aprofundamos em algo essencial. Somos uma geração exposta a opiniões rápidas na internet, mas com pouca raiz bíblica.
                        </p>
                        <p>
                            Uma árvore sem raízes profundas pode parecer bonita em dias de calmaria, mas qualquer ventania forte ou tempestade é capaz de derrubá-la ou arrancá-la do lugar. Paulo nos adverte sobre o perigo de sermos como crianças espirituais, levadas por qualquer vento de circunstância ou ideia.
                        </p>
                    </div>

                    <div class="bg-white p-4 rounded-xl border border-stone-200 space-y-3">
                        <p class="text-xs font-bold uppercase text-stone-400">Perguntas para o Grupo:</p>
                        <ul class="space-y-3 text-sm text-stone-800">
                            <li class="flex items-start gap-2">
                                <span class="text-amber-700 font-bold">•</span>
                                <span>Quando as tempestades e os momentos de crise chegam na sua vida, o que você costuma perceber primeiro: a sua fé se mantém firme ou a incerteza te balança com facilidade?</span>
                            </li>
                            <li class="flex items-start gap-2">
                                <span class="text-amber-700 font-bold">•</span>
                                <span>Na prática, por que é tão tentador consumir conteúdos rápidos sobre fé na internet (vídeos de 1 minuto, cortes) em vez de gastar tempo criando raízes no texto da Bíblia?</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <!-- BLOCO 2 -->
                <div class="bg-stone-50/60 p-5 sm:p-6 rounded-2xl border border-stone-200/90 space-y-4">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold uppercase tracking-wider text-amber-800">Bloco 2</span>
                        <span class="text-xs text-stone-500 font-mono">Hebreus 5:12–14</span>
                    </div>
                    <h4 class="text-lg font-bold text-stone-900">2. Do Leite ao Alimento Sólido: A Arte de Mastigar a Verdade</h4>
                    
                    <div class="text-sm text-stone-700 leading-relaxed space-y-2">
                        <p>
                            Um bebê necessita de leite porque ainda não tem dentes nem organismo preparado para mastigar carne ou pão. O leite é um alimento que a mãe já processou por ele.
                        </p>
                        <p>
                            O autor aos Hebreus confronta a igreja mostrando que muitos, embora já devessem ser maduros, continuavam dependendo de "leite" — esperando que pastores ou criadores de conteúdo na internet leiam, mastiguem e resumam a Bíblia por eles. Maturidade bíblica nasce quando aprendemos a sentar no quarto, abrir as Escrituras, orar e nos alimentarmos diretamente com o Senhor.
                        </p>
                    </div>

                    <div class="bg-white p-4 rounded-xl border border-stone-200 space-y-3">
                        <p class="text-xs font-bold uppercase text-stone-400">Perguntas para o Grupo:</p>
                        <ul class="space-y-3 text-sm text-stone-800">
                            <li class="flex items-start gap-2">
                                <span class="text-amber-700 font-bold">•</span>
                                <span>Qual é a sua maior dificuldade hoje para ter um tempo consistente a sós com Deus e com a Sua Palavra? (Tempo, distração, cansaço, falta de hábito?)</span>
                            </li>
                            <li class="flex items-start gap-2">
                                <span class="text-amber-700 font-bold">•</span>
                                <span>O que muda no nosso coração quando deixamos de apenas "ouvir falar sobre a Bíblia aos domingos" e passamos a ter momentos reais de secreto com Deus durante a semana?</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <!-- BLOCO 3 -->
                <div class="bg-stone-50/60 p-5 sm:p-6 rounded-2xl border border-stone-200/90 space-y-4">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold uppercase tracking-wider text-amber-800">Bloco 3</span>
                        <span class="text-xs text-stone-500 font-mono">Efésios 4:15 | Mateus 7:15</span>
                    </div>
                    <h4 class="text-lg font-bold text-stone-900">3. Discernimento: Conhecer a Verdade para Reconhecer a Cópia</h4>
                    
                    <div class="text-sm text-stone-700 leading-relaxed space-y-2">
                        <p>
                            Crianças pequenas não têm discernimento: tudo o que encontram no chão, levam à boca. Da mesma forma, são facilmente impressionadas por mágicas simples e truques com moedas.
                        </p>
                        <p>
                            O caixa de banco identifica uma nota falsa não porque estudou todas as falsificações do mundo, mas porque tocou tantas vezes na nota verdadeira que a mentira salta aos seus olhos imediatamente. Quem conhece a verdade bíblica em profundidade não é enganado por discursos bonitos, modismos ou falsas promessas.
                        </p>
                    </div>

                    <div class="bg-white p-4 rounded-xl border border-stone-200 space-y-3">
                        <p class="text-xs font-bold uppercase text-stone-400">Perguntas para o Grupo:</p>
                        <ul class="space-y-3 text-sm text-stone-800">
                            <li class="flex items-start gap-2">
                                <span class="text-amber-700 font-bold">•</span>
                                <span>Você já foi influenciado por alguma ideia, conselho ou "ensino religioso" que parecia certo na hora, mas depois percebeu que não tinha base bíblica? Como foi isso?</span>
                            </li>
                            <li class="flex items-start gap-2">
                                <span class="text-amber-700 font-bold">•</span>
                                <span>Como o convívio em comunidade (no GC e na igreja) nos ajuda a manter os pés no chão e nos protege dos enganos individuais?</span>
                            </li>
                        </ul>
                    </div>
                </div>

            </div>

            <!-- MOMENTO 4: APLICAÇÃO PRÁTICA -->
            <div class="space-y-4 pt-4 border-t border-stone-100">
                <div class="flex items-center space-x-3">
                    <span class="badge-step font-bold text-xs px-2.5 py-1 rounded-full">10 MIN</span>
                    <h3 class="text-lg font-bold text-stone-900">E Agora? Aplicação & Decisão</h3>
                </div>

                <div class="grid sm:grid-cols-2 gap-4">
                    <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
                        <h4 class="font-bold text-stone-800 text-sm mb-2">Perguntas de Reflexão:</h4>
                        <ul class="text-xs sm:text-sm text-stone-600 space-y-2 list-disc list-inside">
                            <li>Em qual área você tem sido mais "criança": na inconstância das emoções ou na preguiça de estudar a Palavra?</li>
                            <li>Qual passo prático você precisa dar para sair do raso nesta semana?</li>
                        </ul>
                    </div>

                    <div class="bg-amber-50/80 p-4 rounded-xl border border-amber-200">
                        <h4 class="font-bold text-amber-900 text-sm mb-1">⚡ Desafio da Semana: O Alimento no Secreto</h4>
                        <p class="text-xs sm:text-sm text-stone-700 leading-relaxed">
                            Nesta semana, separe pelo menos <strong>3 dias com 15 minutos dedicados</strong> exclusivamente a ler diretamente um livro da Bíblia (sugestão: a carta aos Efésios), sem telas de redes sociais ou vídeos explicativos abertos. Anote o que Deus falar ao seu coração.
                        </p>
                    </div>
                </div>
            </div>

            <!-- MOMENTO 5: ORAÇÃO -->
            <div class="space-y-3 pt-4 border-t border-stone-100">
                <div class="flex items-center space-x-3">
                    <span class="badge-step font-bold text-xs px-2.5 py-1 rounded-full">10 MIN</span>
                    <h3 class="text-lg font-bold text-stone-900">Momento de Oração</h3>
                </div>
                <div class="bg-stone-50 p-4 rounded-xl border border-stone-200 text-sm text-stone-700 space-y-2">
                    <p class="font-medium text-stone-800">
                        Dividam-se em duplas ou trios (homens com homens, mulheres com mulheres) para orar por:
                    </p>
                    <ol class="list-decimal list-inside space-y-1 text-stone-600 text-xs sm:text-sm">
                        <li>Fome e sede real pela Palavra de Deus no ambiente secreto do lar.</li>
                        <li>Firmeza e raízes espirituais diante dos ventos e crises da vida.</li>
                        <li>Sabedoria e discernimento para não sermos presas fáceis de mentiras e ilusões deste mundo.</li>
                    </ol>
                </div>
            </div>

            <!-- MOMENTO EVANGELÍSTICO -->
            <div class="bg-amber-900 text-amber-50 p-5 sm:p-6 rounded-xl space-y-2">
                <h4 class="font-bold text-white text-base">🌱 Mensagem de Graça (Para quem nos visita ou está recomeçando)</h4>
                <p class="text-xs sm:text-sm text-amber-100/90 leading-relaxed">
                    Maturidade não é sobre ser perfeito ou ter todas as respostas, mas sobre colocar a nossa vida sob a liderança de Jesus Cristo. Ele é a Rocha firme que nos acolhe, perdoa nossos erros do passado e nos ensina a andar com segurança a cada dia. Se você deseja dar o primeiro passo ou firmar sua fé Nele hoje, fale conosco no final do encontro!
                </p>
            </div>

            <!-- AVISOS DA IGREJA -->
            <div id="avisos" class="pt-4 border-t border-stone-100 space-y-3">
                <h4 class="font-bold text-stone-900 text-base">📢 Avisos Importantes da IBM:</h4>
                <div class="space-y-2.5 text-xs sm:text-sm text-stone-700">
                    <div class="flex items-start gap-2.5 p-3 rounded-lg bg-stone-50 border border-stone-200">
                        <span class="text-amber-700 font-bold">1.</span>
                        <div>
                            <strong>IBM College (Trilho Teológico):</strong> Tem início nesta próxima quinta-feira! É a oportunidade ideal para quem deseja aprofundar seu conhecimento bíblico e teológico. Não fique no raso; faça a sua inscrição!
                        </div>
                    </div>
                    <div class="flex items-start gap-2.5 p-3 rounded-lg bg-stone-50 border border-stone-200">
                        <span class="text-amber-700 font-bold">2.</span>
                        <div>
                            <strong>Conferência Missão de Casa:</strong> No encerramento de setembro, receberemos o Pr. Alvin e o Pr. Rafael Abdalla. Reserve as datas com sua família e prepare seu coração para vivermos esse tempo de alinhamento e serviço!
                        </div>
                    </div>
                </div>
            </div>

        </section>

        <!-- SEÇÃO: MATERIAL DE APOIO AO LÍDER (RECOLHÍVEL) -->
        <section id="apoio" class="mt-8">
            <div class="bg-stone-900 text-white rounded-2xl p-6 sm:p-8 shadow-md">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-800 pb-5">
                    <div>
                        <span class="text-xs font-semibold text-amber-400 uppercase tracking-widest">Guia de Facilitação</span>
                        <h2 class="text-xl sm:text-2xl font-bold text-white mt-1">Material de Apoio para o Líder</h2>
                        <p class="text-xs sm:text-sm text-stone-400 mt-1">
                            Conteúdo exclusivo para orientar o facilitador, prever respostas e aprofundar a conversa.
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
                                Não se desespere nem dê a resposta. Reformule a pergunta ou chame alguém carinhosamente: <em>"Lucas, pensando na sua rotina, como você enxerga isso?"</em>
                            </div>
                            <div class="p-3 bg-stone-900/50 rounded-lg">
                                <strong class="text-white block mb-1">Se alguém falar demais:</strong>
                                Agradeça e compartilhe a fala: <em>"Muito bom o seu ponto! Gostaria de ouvir mais alguém que ainda não falou hoje sobre esse aspecto."</em>
                            </div>
                            <div class="p-3 bg-stone-900/50 rounded-lg">
                                <strong class="text-white block mb-1">Se a conversa fugir do tema:</strong>
                                Traga gentilmente de volta: <em>"Esse assunto é muito interessante, mas pensando no texto de Efésios sobre amadurecer, como isso se aplica?"</em>
                            </div>
                            <div class="p-3 bg-stone-900/50 rounded-lg">
                                <strong class="text-white block mb-1">Se surgir dúvida difícil:</strong>
                                Seja humilde e sincero: <em>"Essa é uma ótima pergunta. Não quero te dar uma resposta rasa agora, vou pesquisar e conversamos na semana!"</em>
                            </div>
                        </div>
                    </div>

                    <!-- GUIA POR BLOCO -->
                    <div class="space-y-4">
                        
                        <!-- Bloco 1 Apoio -->
                        <div class="bg-stone-800/50 p-4 sm:p-5 rounded-xl border border-stone-700/80 space-y-2 text-xs sm:text-sm">
                            <div class="flex items-center justify-between text-amber-400 font-bold">
                                <span>Bloco 1: Raízes vs. Superficialidade</span>
                                <span class="text-stone-400 font-mono text-xs">Efésios 4:14</span>
                            </div>
                            <p class="text-stone-300">
                                <strong>Direção esperada das respostas:</strong> Os participantes provavelmente citarão como a ansiedade, o cansaço e o imediatismo das redes sociais roubam a paciência para ler a Bíblia com calma.
                            </p>
                            <div class="p-3 bg-stone-900/70 rounded-lg border-l-2 border-amber-500">
                                <span class="text-amber-300 font-semibold block text-xs mb-1">Pergunta de Aprofundamento (se as respostas forem rasas):</span>
                                <p class="text-stone-300 italic">
                                    "Por que nós conseguimos passar 30 minutos rolando vídeos curtos sem cansar, mas achamos difícil passar 15 minutos lendo um capítulo das Escrituras?"
                                </p>
                            </div>
                        </div>

                        <!-- Bloco 2 Apoio -->
                        <div class="bg-stone-800/50 p-4 sm:p-5 rounded-xl border border-stone-700/80 space-y-2 text-xs sm:text-sm">
                            <div class="flex items-center justify-between text-amber-400 font-bold">
                                <span>Bloco 2: Leite vs. Alimento Sólido</span>
                                <span class="text-stone-400 font-mono text-xs">Hebreus 5:12–14</span>
                            </div>
                            <p class="text-stone-300">
                                <strong>Contexto teológico:</strong> O autor de Hebreus repreende crentes que já tinham tempo de convertidos, mas continuavam no "be-a-bá", sem capacidade de discernir o bem e o mal no dia a dia.
                            </p>
                            <p class="text-stone-300">
                                <strong>Direção esperada das respostas:</strong> Reconhecimento de que terceirizamos nossa fé para o pastor de domingo ou pregadores da internet.
                            </p>
                            <div class="p-3 bg-stone-900/70 rounded-lg border-l-2 border-amber-500">
                                <span class="text-amber-300 font-semibold block text-xs mb-1">Pergunta de Aprofundamento:</span>
                                <p class="text-stone-300 italic">
                                    "Quando você passa por uma decisão difícil na família ou no trabalho, você busca na Bíblia ou corre logo para a opinião de outras pessoas?"
                                </p>
                            </div>
                        </div>

                        <!-- Bloco 3 Apoio -->
                        <div class="bg-stone-800/50 p-4 sm:p-5 rounded-xl border border-stone-700/80 space-y-2 text-xs sm:text-sm">
                            <div class="flex items-center justify-between text-amber-400 font-bold">
                                <span>Bloco 3: Discernimento e Verdade</span>
                                <span class="text-stone-400 font-mono text-xs">Efésios 4:15 | Mateus 7:15</span>
                            </div>
                            <p class="text-stone-300">
                                <strong>Ponto-chave da ilustração:</strong> O exemplo da nota falsa. Não precisamos nos tornar especialistas em todas as heresias do mundo, mas especialistas na verdade das Escrituras. A intimidade com o original nos alerta diante de falsificações.
                            </p>
                            <div class="p-3 bg-stone-900/70 rounded-lg border-l-2 border-amber-500">
                                <span class="text-amber-300 font-semibold block text-xs mb-1">Pergunta de Aprofundamento:</span>
                                <p class="text-stone-300 italic">
                                    "Como a igreja local e o nosso GC funcionam como uma cerca de proteção contra o engano e o isolamento espiritual?"
                                </p>
                            </div>
                        </div>

                    </div>

                    <!-- CHECKLIST DO LÍDER -->
                    <div class="bg-stone-800 p-4 rounded-xl text-xs sm:text-sm text-stone-300 space-y-2 border border-stone-700">
                        <strong class="text-amber-300 block">📋 Checklist pós-encontro:</strong>
                        <ul class="list-disc list-inside space-y-1">
                            <li>Envie uma mensagem no grupo durante a semana lembrando do Desafio dos 3 dias na Palavra.</li>
                            <li>Acolha com carinho quem compartilhou lutas pessoais no momento de oração.</li>
                            <li>Reforce o convite para o início do IBM College nesta quinta-feira.</li>
                        </ul>
                    </div>

                </div>
            </div>
        </section>

    </main>

    <!-- RODAPÉ -->
    <footer class="bg-white border-t border-stone-200 mt-12 py-6 text-center text-xs text-stone-500">
        <div class="container mx-auto px-4">
            <p>© 2026 Igreja Batista da Manhã | Roteiro de Pequenos Grupos</p>
            <p class="mt-1 text-stone-400">Desenvolvido para edificação, comunhão e amadurecimento espiritual.</p>
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
