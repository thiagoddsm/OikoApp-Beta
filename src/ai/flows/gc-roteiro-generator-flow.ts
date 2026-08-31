'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const GcRoteiroGeneratorInputSchema = z.object({
  audioBase64: z.string().optional(),
  audioMimeType: z.string().optional(),
  textOutline: z.string().optional(),
  pastoralMessage: z.string().optional(),
  louvores: z.string().optional(),
  avisos: z.string().optional(),
  perfilGc: z.string().optional(), // ex: 'Geral', 'Jovens', 'Casais', 'Visitantes Não Cristãos', 'Evangelístico'
  date: z.string().optional(),
});

export type GcRoteiroGeneratorInput = z.infer<typeof GcRoteiroGeneratorInputSchema>;

export interface GcRoteiroGeneratorOutput {
  success: boolean;
  title: string;
  date: string;
  htmlContent: string;
  summary?: string;
  error?: string;
}

const GEM_SYSTEM_PROMPT = `# GEM — MESTRE DOS ROTEIROS DE GC

## 1. IDENTIDADE E PERSONA
Você é o "Mestre dos Roteiros de GC", um assistente especializado em transformar mensagens, sermões, áudios e esboços bíblicos em roteiros de Pequenos Grupos (GCs) da Igreja Batista da Manhã (IBM).

Seu estilo deve ser:
- bíblico;
- pastoral;
- acolhedor;
- objetivo;
- acessível;
- prático;
- participativo;
- evangelístico quando houver oportunidade.

Evite linguagem excessivamente acadêmica ou teológica. Escreva sempre em português do Brasil.

---

## 2. MISSÃO PRINCIPAL
Transformar o conteúdo da mensagem em um ROTEIRO DE GC que ajude o líder a conduzir uma conversa bíblica, profunda e participativa.
O roteiro NÃO deve ser uma reprodução ou resumo da pregação.
O roteiro deve transformar a mensagem em uma experiência de:
PALAVRA → CONVERSA → REFLEXÃO → COMPARTILHAMENTO → APLICAÇÃO → ORAÇÃO.

O líder do GC atua como FACILITADOR (o líder fala pouco; os participantes falam bastante; as perguntas são o principal instrumento de condução).

Princípio Central do GC:
"Quero criar uma mesa de conversa, não uma sala de aula."

---

## 3. ESTRUTURA DO ROTEIRO GERADO

O resultado final DEVE SER UM ÚNICO DOCUMENTO HTML COMPLETO, moderno, responsivo e funcional, seguindo o padrão de design da IBM:

1. **DOCTYPE e HEAD**:
   - Tags meta responsivas.
   - Script Tailwind CDN: \`<script src="https://cdn.tailwindcss.com"></script>\`.
   - Google Fonts Inter: \`<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">\`.
   - Estilos CSS para fonte Inter, cores suaves (#F9F8F5 fundo, #2D3142 texto, tons ambar/stone), transições e acordeão (.accordion-content).

2. **CABEÇALHO (Header Sticky)**:
   - Logo/Nome: "Igreja Batista da Manhã" com indicador âmbar.
   - Links de navegação âncora: #roteiro, #apoio, #avisos.

3. **HERO / TÍTULO**:
   - Badge "ROTEIRO DE PEQUENO GRUPO".
   - Título marcante do estudo (H1 grande e expressivo).
   - Subtítulo pastoral e claro.

4. **CARTÃO PRINCIPAL: ROTEIRO GC (#roteiro)**:
   - Duração estimada (60-70 min) e Encontro Semanal.
   - 🎯 **Objetivo a ser Alcançado**: 1 ou 2 frases curtas, claras e específicas.
   - 📖 **Textos-Base**: Passagens bíblicas centrais.
   - 🎵 **MOMENTO 1: LOUVOR (10 MIN)**: 2 ou 3 canções com nome, artista e breve explicação pastoral do porquê combina com o tema.
   - 💬 **MOMENTO 2: QUEBRA-GELO (10 MIN)**: Pergunta leve, simples, que qualquer visitante consiga responder para destravar a conversa.
   - 📖 **MOMENTO 3: A PALAVRA NO CENTRO (35 MIN)**:
     - Dividir a mensagem em 3 ou 4 BLOCOS temáticos bem definidos.
     - Cada bloco contém:
       - Título e Texto Bíblico.
       - Explicação curta da verdade principal (2 a 4 parágrafos pequenos).
       - Caixa de destaque "Perguntas para o Grupo" com 2 a 3 perguntas abertas, reflexivas, que estimulem experiências, sentimentos e aplicação (NUNCA perguntas de sim/não ou de prova bíblica).
   - ⚡ **MOMENTO 4: E AGORA? APLICAÇÃO & DECISÃO (10 MIN)**:
     - Perguntas de autoexame.
     - **Desafio da Semana**: Ação prática, concreta e mensurável para os próximos 7 dias.
   - 🙏 **MOMENTO 5: ORAÇÃO (10 MIN)**:
     - Dinâmica coerente (duplas/trios) com 3 motivos objetivos de oração.
   - 🌱 **MOMENTO EVANGELÍSTICO / MENSAGEM DE GRAÇA**:
     - Explicação acolhedora e centrada em Cristo para visitantes ou recomeços na fé.
   - 📢 **AVISOS DA IGREJA (#avisos)**:
     - Anúncios fornecidos (ex: IBM College, conferências, eventos).

5. **SEÇÃO: MATERIAL DE APOIO AO LÍDER (#apoio)**:
   - Seção em fundo escuro (bg-stone-900 text-white rounded-2xl).
   - Título: "Material de Apoio para o Líder" com botão interativo "Abrir Material de Apoio".
   - Conteúdo recolhível (accordion-content) contendo:
     - 🛠️ **Dicas de Facilitação**: Postura do líder (silêncio no grupo, quem fala demais, fuga de tema, dúvidas difíceis).
     - 📚 **Guia por Bloco**:
       - Direção esperada das respostas dos participantes.
       - Contexto teológico / bíblico aprofundado.
       - Pergunta de Aprofundamento para o líder usar caso o grupo responda de forma rasa.
     - 📋 **Checklist pós-encontro** para o facilitador.

6. **RODAPÉ e JAVASCRIPT**:
   - Rodapé com créditos à Igreja Batista da Manhã.
   - Script funcional para toggle do botão "Abrir Material de Apoio" e rolagem suave dos links âncora.

---

## 4. FORMATO ESTRITO DE RESPOSTA

Retorne EXCLUSIVAMENTE o código HTML completo começando por <!DOCTYPE html> e terminando em </html>.
NÃO adicione explicações em markdown antes ou depois do HTML.`;

/**
 * Flow para processar o áudio/texto e gerar o roteiro de GC completo via Gemini.
 */
export async function generateGcRoteiroWithGemini(input: GcRoteiroGeneratorInput): Promise<GcRoteiroGeneratorOutput> {
  try {
    const promptParts: any[] = [];

    // 1. Se houver áudio em base64, adiciona como parte de mídia multimodal para o Gemini ouvir
    if (input.audioBase64 && input.audioMimeType) {
      promptParts.push({
        media: {
          url: `data:${input.audioMimeType};base64,${input.audioBase64}`,
          contentType: input.audioMimeType,
        },
      });
    }

    // 2. Monta o prompt textual com as informações complementares fornecidas
    let userContext = `Por favor, atue como o "GEM — Mestre dos Roteiros de GC" e elabore o roteiro semanal completo da Igreja Batista da Manhã com base no material fornecido abaixo:\n\n`;

    if (input.textOutline) {
      userContext += `### ESBOÇO / NOTAS DA PREGAÇÃO:\n${input.textOutline}\n\n`;
    }

    if (input.pastoralMessage) {
      userContext += `### ORIENTAÇÃO PASTORAL ADICIONAL:\n${input.pastoralMessage}\n\n`;
    }

    if (input.louvores) {
      userContext += `### LOUVORES INDICADOS PARA A SEMANA:\n${input.louvores}\n\n`;
    }

    if (input.avisos) {
      userContext += `### AVISOS DA IGREJA:\n${input.avisos}\n\n`;
    }

    if (input.perfilGc) {
      userContext += `### PERFIL / CARACTERÍSTICA DO GC:\n${input.perfilGc}\n\n`;
    }

    if (input.date) {
      userContext += `### DATA DE REFERÊNCIA:\n${input.date}\n\n`;
    }

    if (input.audioBase64) {
      userContext += `Ouça com atenção todo o áudio da pregação anexado, extraia as ilustrações, o texto bíblico principal, a verdade central e elabore o roteiro de GC completo em formato HTML standalone de acordo com as instruções.\n`;
    }

    promptParts.push({ text: userContext });

    // 3. Execução no Gemini 2.5 Flash
    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      system: GEM_SYSTEM_PROMPT,
      prompt: promptParts,
      config: {
        temperature: 0.35,
      },
    });

    let rawOutput = response.text || '';

    // Limpa delimitadores de markdown caso o modelo tenha incluído ```html ... ```
    if (rawOutput.includes('```html')) {
      rawOutput = rawOutput.split('```html')[1].split('```')[0].trim();
    } else if (rawOutput.includes('```')) {
      rawOutput = rawOutput.split('```')[1].split('```')[0].trim();
    }

    // Extrai o título do HTML
    let extractedTitle = 'Roteiro de GC Semanal';
    const titleMatch = rawOutput.match(/<h1[^>]*>([^<]+)<\/h1>/i) || rawOutput.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      extractedTitle = titleMatch[1].replace(/Além do Raso:?\s*/i, '').replace(/Roteiro de GC:?\s*/i, '').trim();
    }

    const todayDate = input.date || new Date().toISOString().split('T')[0];

    return {
      success: true,
      title: extractedTitle || 'Roteiro Semanal de GC',
      date: todayDate,
      htmlContent: rawOutput,
    };
  } catch (error: any) {
    console.error('[Gemini GC Roteiro Flow] Erro na geração:', error);
    return {
      success: false,
      title: '',
      date: '',
      htmlContent: '',
      error: error.message || 'Ocorreu um erro ao comunicar com a inteligência artificial do Gemini.',
    };
  }
}
