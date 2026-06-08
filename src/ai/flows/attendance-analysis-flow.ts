'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/google-genai';

const AttendanceAnalysisInputSchema = z.object({
  records: z.array(z.object({
    dateStr: z.string(),
    horario: z.string(),
    adultos: z.number(),
    criancas: z.number(),
    total: z.number(),
    serieMensagem: z.string().optional(),
    feriadoProximo: z.boolean().optional(),
    jogoFutebol: z.boolean().optional(),
    apresentacaoBebe: z.boolean().optional(),
  })),
  stats: z.object({
    mean: z.number(),
    byHorario: z.any().optional(),
  }),
});

type AttendanceAnalysisInput = z.infer<typeof AttendanceAnalysisInputSchema>;

const AttendanceAnalysisPromptInputSchema = z.object({
  recordsJson: z.string(),
  statsJson: z.string(),
});

const attendanceAnalysisPrompt = ai.definePrompt({
  name: 'attendanceAnalysisPrompt',
  input: { schema: AttendanceAnalysisPromptInputSchema },
  prompt: `Você é um analista de dados estratégico e assistente pastoral de uma igreja em crescimento.
Sua tarefa é analisar os dados de frequência das celebrações/cultos fornecidos no JSON.

Forneça um relatório completo de inteligência contendo:
1. **Resumo Executivo**: Uma visão geral do padrão de frequência no período.
2. **Análise de Anomalias (Outliers)**: Analise os dias que fugiram significativamente da média (tanto picos de crescimento quanto quedas acentuadas), interpretando os possíveis fatores (feriados, jogos de futebol, séries de mensagens, apresentação de bebês, etc.) e sua força de correlação.
3. **Padrões de Horário**: Comente sobre a distribuição e preferência dos membros entre os diferentes horários de cultos.
4. **Insights Estratégicos**: Ações recomendadas para a liderança e equipe de planejamento de cultos (como otimização de horários, preparação para datas de alta atratividade, e mitigação em feriados).

Responda em Português do Brasil com formatação Markdown limpa, moderna e estruturada por seções. Use tom profissional, construtivo e encorajador.

---
MÉTRICAS MATEMÁTICAS:
{{{statsJson}}}

---
DADOS DAS CELEBRAÇÕES (JSON):
\`\`\`json
{{{recordsJson}}}
\`\`\`

---
SEU RELATÓRIO DE ANÁLISE IA:
`,
});

const attendanceAnalysisFlow = ai.defineFlow(
  {
    name: 'attendanceAnalysisFlow',
    inputSchema: AttendanceAnalysisInputSchema,
    outputSchema: z.string(),
  },
  async (inp) => {
    const formattedRecords = inp.records.map(r => ({
      data: r.dateStr,
      horario: r.horario,
      adultos: r.adultos,
      criancas: r.criancas,
      total: r.total,
      serie: r.serieMensagem || 'N/A',
      feriado: r.feriadoProximo ? 'Sim' : 'Não',
      jogo: r.jogoFutebol ? 'Sim' : 'Não',
      bebe: r.apresentacaoBebe ? 'Sim' : 'Não',
    }));

    try {
      const response = await attendanceAnalysisPrompt({
        recordsJson: JSON.stringify(formattedRecords, null, 2),
        statsJson: JSON.stringify(inp.stats, null, 2),
      }, {
        model: 'googleai/gemini-flash-latest'
      });
      return response.text || "Não foi possível gerar a análise.";
    } catch (err: any) {
      console.error("Erro na chamada do Gemini:", err);
      const msg = err.message || String(err);
      if (msg.includes("prepayment credits") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("429")) {
        return "⚠️ **Erro de API (Créditos Esgotados):** Os créditos de pré-pagamento da API do Gemini estão esgotados. Por favor, gerencie o saldo e faturamento da sua conta em [Google AI Studio](https://aistudio.google.com/).";
      }
      return `⚠️ **Erro no Servidor de IA:** Não foi possível realizar a análise de frequência. Detalhes: ${msg}`;
    }
  }
);

export async function runAttendanceAnalysis(input: AttendanceAnalysisInput): Promise<string> {
  return attendanceAnalysisFlow(input);
}
