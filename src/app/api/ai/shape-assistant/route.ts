import { NextRequest, NextResponse } from 'next/server';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { getShapeResults } from '@/app/dashboard/volunteering/molde-de-servo/actions';
import { HABILIDADES_MAP, ShapeResult } from '@/types/shape';
import { QUADRANT_BY_DISC, type DiscLetter } from '@/lib/disc';
import { DISC_META, DISC_BLINDSPOT_META } from '@/lib/disc-meta';
import { SHAPE_DATA } from '@/lib/shape-complete-data';

const ai = genkit({ plugins: [googleAI()] });

export interface ShapeAssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ShapeCandidateRecommendation {
  resultId: string;
  nome: string;
  matchScore: number;
  roleSuggestion: string;
  whyFits: string;
  highlights: string[];
  cautionOrTip?: string;
  suggestedWhatsappMessage?: string;
}

export interface ShapeAssistantResponse {
  reply: string;
  idealProfileSummary: string;
  recommendations: ShapeCandidateRecommendation[];
}

function resolveQuadrant(item: ShapeResult): string {
  if (item.quadrante && item.quadrante.trim().length > 0) {
    return item.quadrante;
  }
  if (item.discPrimary && QUADRANT_BY_DISC[item.discPrimary as DiscLetter]) {
    return QUADRANT_BY_DISC[item.discPrimary as DiscLetter];
  }
  if (typeof item.motScore === 'number' && typeof item.orgScore === 'number') {
    const mot = item.motScore >= 3.0 ? 'Pessoas' : 'Tarefas';
    const org = item.orgScore >= 3.0 ? 'Formal' : 'Informal';
    return `${mot} / ${org}`;
  }
  return 'Não avaliado';
}

function formatCandidateDossier(item: ShapeResult): string {
  const habilidadesLegiveis = (item.habilidades || []).map((h) => {
    const mapped = HABILIDADES_MAP[h];
    return mapped ? mapped.nome : h;
  });

  const topGifts = (item.top3 || [])
    .filter((g) => (g.score || 0) > 0)
    .map((g, idx) => `${idx + 1}º ${g.nome || g.name} (${g.score}pts)`)
    .join(', ');

  // Outros dons secundários relevantes (top 4..6) se houver domScores
  let extraGifts = '';
  if (item.domScores && Object.keys(item.domScores).length > 0) {
    const topIds = new Set((item.top3 || []).map((t) => t.id));
    const secondary = SHAPE_DATA.gifts
      .filter((g) => !topIds.has(g.id) && (item.domScores[g.id] || 0) >= 12)
      .map((g) => ({ name: g.name, score: item.domScores[g.id] || 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    if (secondary.length > 0) {
      extraGifts = ` | Outros dons fortes: ${secondary.map((s) => `${s.name} (${s.score}pts)`).join(', ')}`;
    }
  }

  const quadrante = resolveQuadrant(item);
  const discPrimaryMeta = item.discPrimary ? DISC_META[item.discPrimary as DiscLetter] : null;
  const discDesc = item.discPrimary
    ? `DISC Primário: ${item.discPrimary} (${discPrimaryMeta?.name || ''})${
        item.discSecondary ? ` + Secundário: ${item.discSecondary}` : ''
      }${item.discScores ? ` [D:${item.discScores.D}, I:${item.discScores.I}, S:${item.discScores.S}, C:${item.discScores.C}]` : ''}`
    : 'DISC ainda não preenchido';

  const blindspot =
    item.discLowest && DISC_BLINDSPOT_META[item.discLowest as DiscLetter]
      ? `Menor fator DISC (Ponto Cego): ${item.discLowest} (${DISC_BLINDSPOT_META[item.discLowest as DiscLetter].title})`
      : '';

  const formacaoTrabalho = [
    item.formacao ? `Formação: ${item.formacao}` : '',
    item.profissao ? `Profissão: ${item.profissao}` : '',
    item.experiencias?.exp1 ? `Formação/Atuação Profissional detalhada: ${item.experiencias.exp1}` : '',
  ]
    .filter(Boolean)
    .join(' | ');

  const expMinisterial = item.experiencias?.exp2 || '';
  const disponibilidade =
    (item.disponibilidade && item.disponibilidade.length > 0
      ? item.disponibilidade.join(', ')
      : '') ||
    item.experiencias?.availability ||
    item.experiencias?.exp4 ||
    '';

  const coracaoEntries = Object.values(item.coracao || {})
    .filter((v) => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim())
    .join(' / ');

  return [
    `[ID: ${item.id}] NOME: ${item.nome}`,
    `  - Status Teste: ${item.status === 'completed' ? '100% Concluído' : `Em andamento (${item.completionPercentage || 0}%)`}${item.gcInfo ? ` | GC: ${item.gcInfo}` : ''}`,
    `  - Personalidade & Estilo de Trabalho: Quadrante [${quadrante}]${item.orgScore ? ` (Organização: ${item.orgScore}/5, Motivação: ${item.motScore}/5)` : ''} | ${discDesc}${blindspot ? ` | ${blindspot}` : ''}`,
    `  - Dons Espirituais: ${topGifts || 'Não avaliados'}${extraGifts}`,
    `  - Habilidades Práticas/Técnicas: ${habilidadesLegiveis.length > 0 ? habilidadesLegiveis.join(', ') : 'Não informadas'}`,
    `  - Formação, Profissão e Trabalho: ${formacaoTrabalho || 'Não informado'}`,
    expMinisterial ? `  - Experiência Ministerial Prévia: ${expMinisterial}` : '',
    disponibilidade ? `  - Disponibilidade: ${disponibilidade}` : '',
    item.ministryTarget ? `  - Área onde sente chamado: ${item.ministryTarget}` : '',
    coracaoEntries ? `  - Paixões e Sonhos (Coração): ${coracaoEntries}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages: ShapeAssistantMessage[] = Array.isArray(body.messages) ? body.messages : [];
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop()?.content || body.query || '';

    if (!lastUserMessage.trim()) {
      return NextResponse.json({ error: 'Digite uma descrição ou demanda para consultar a IA.' }, { status: 400 });
    }

    // Carrega resultados atualizados (ou usa os enviados se já completos)
    const results: ShapeResult[] =
      Array.isArray(body.candidates) && body.candidates.length > 0
        ? body.candidates
        : await getShapeResults();

    if (!results || results.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          reply: 'Ainda não há resultados do Molde de Servo cadastrados na base para realizar a varredura.',
          idealProfileSummary: '',
          recommendations: [],
        },
      });
    }

    const catalogText = results.map(formatCandidateDossier).join('\n\n');

    const conversationHistoryText = messages
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'LÍDER/PASTOR' : 'CONSULTOR IA'}: ${m.content}`)
      .join('\n\n');

    const prompt = `Você é um Consultor Especialista em Recrutamento, Alocação Ministerial e Mapeamento Vocacional S.H.A.P.E. & DISC da Igreja Batista da Manhã (OikoApp).

Sua missão é ajudar pastores e líderes a encontrar as pessoas certas na base da igreja para demandas específicas de ministérios, eventos, retiros, comissões, liderança ou projetos.

COMO VOCÊ ANALISA OS CANDIDATOS (VARREDURA MULTIDIMENSIONAL):
1. **Personalidade e Ritmo de Trabalho (P)**:
   - **Foco em Tarefas vs. Pessoas** e **Formal (Organizado/Metódico) vs. Informal (Flexível/Rápido)**:
     - Se o líder pede alguém "bom em tarefas, organizado, controle, administração, processos, planilhas, logística": priorize perfis com Quadrante **Tarefas / Formal** (equivalente DISC **C - Conformidade**) e **Tarefas / Informal** (equivalente DISC **D - Dominância**), ou alta pontuação em Organização.
     - Se o líder pede alguém "acolhedor, recepção, cuidado, integração, ouvir pessoas, acompanhamento": priorize Quadrante **Pessoas / Formal** (DISC **S - Estabilidade**) e **Pessoas / Informal** (DISC **I - Influência**).
2. **Dons Espirituais (S)**:
   - Cruze a demanda com os 19 dons espirituais (ex: Administração, Serviço, Liderança, Hospitalidade, Ensino, Misericórdia, Comunicação Criativa, Artesanato, Contribuição, Sabedoria, Discernimento, etc.). Olhe tanto o Top 3 quanto dons secundários de alta pontuação.
3. **Formação Acadêmica, Profissão, Trabalho e Experiências (E)**:
   - Analise atentamente os campos de Formação, Profissão, Atuação Profissional (exp1) e Experiência em Ministérios (exp2). Muitas vezes uma pessoa tem formação ou trabalha exatamente com o que o evento/ministério precisa (ex: contabilidade, administração, saúde, direito, culinária, mídia, pedagogia, engenharia, gestão de projetos).
4. **Habilidades Práticas (A) e Coração/Paixões (H)**:
   - Verifique as habilidades marcadas (ex: Planejamento financeiro e orçamento, Organização de eventos, Gestão de pessoas/equipes, Controle de dados e processos, etc.) e o que faz o coração da pessoa bater mais forte.

HISTÓRICO DA CONVERSA ATUAL:
${conversationHistoryText}

SOLICITAÇÃO ATUAL DO LÍDER:
"${lastUserMessage}"

BASE COMPLETA DE MEMBROS MAPEADOS NO MOLDE DE SERVO (${results.length} registros):
${catalogText}

INSTRUÇÕES DE RESPOSTA:
- Faça uma varredura rigorosa na base acima e selecione os **melhores candidatos** que realmente existem na lista (use exatamente o \`resultId\` correspondente ao \`[ID: ...]\` de cada membro).
- Ordene os candidatos do maior \`matchScore\` (0 a 100) para o menor. Retorne entre 3 e 8 candidatos mais compatíveis (ou menos, se houver poucos registros na base).
- Em \`whyFits\`, seja super específico: cite os Dons reais da pessoa (com pontuação se houver), seu perfil DISC/Quadrante (Tarefas vs Pessoas, Formal vs Informal), sua formação/profissão/trabalho e suas habilidades que justificam a escolha para a demanda pedida.
- Em \`highlights\`, coloque de 3 a 5 tags curtas de destaque (ex: ["DISC C (Analítico)", "Tarefas / Formal", "Dom: Administração", "Gestão de Eventos"]).
- Em \`cautionOrTip\`, dê uma dica prática de como liderar/abordar essa pessoa ou um ponto de atenção baseado no perfil/ponto cego dela.
- Em \`suggestedWhatsappMessage\`, escreva uma mensagem calorosa, pastoral e pronta para enviar no WhatsApp convidando a pessoa para essa missão específica e mencionando por que lembraram dela.

Responda OBRIGATORIAMENTE em formato JSON válido seguindo exatamente esta estrutura:
{
  "reply": "Sua resposta conversacional direta ao líder (2 a 3 parágrafos), comentando a demanda, explicando os critérios que você usou na varredura e destacando como os candidatos selecionados podem atuar juntos ou individualmente.",
  "idealProfileSummary": "Resumo em 1 linha do perfil ideal para esta demanda (ex: Foco em Tarefas/Formal • DISC C ou D • Dons de Administração/Serviço • Habilidades de Gestão e Orçamento)",
  "recommendations": [
    {
      "resultId": "ID exato do membro na lista",
      "nome": "Nome completo do membro",
      "matchScore": 95,
      "roleSuggestion": "Sugestão de função específica na demanda (ex: Coordenação Administrativa & Orçamento do Retiro)",
      "whyFits": "Justificativa rica e detalhada cruzando dons, personalidade, formação/trabalho e habilidades reais do membro.",
      "highlights": ["Tag 1", "Tag 2", "Tag 3", "Tag 4"],
      "cautionOrTip": "Dica pastoral de abordagem ou ponto de atenção",
      "suggestedWhatsappMessage": "Olá [Nome]! Paz! Estamos organizando [demanda] e, olhando seu perfil e dons de [dons/habilidades], lembramos de você..."
    }
  ]
}`;

    const response = await ai.generate({
      model: googleAI.model('gemini-2.5-flash'),
      prompt,
      config: { temperature: 0.4 },
    });

    const rawText = response.text || '';
    let parsed: ShapeAssistantResponse;

    try {
      const firstBrace = rawText.indexOf('{');
      const lastBrace = rawText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        parsed = JSON.parse(rawText.substring(firstBrace, lastBrace + 1));
      } else {
        const cleaned = rawText.replace(/```json\n?|```\n?/g, '').trim();
        parsed = JSON.parse(cleaned);
      }
    } catch (parseErr) {
      console.error('Erro ao fazer parse do retorno do shape-assistant:', parseErr);
      parsed = {
        reply: rawText || 'Não foi possível estruturar a resposta da IA no momento.',
        idealProfileSummary: 'Análise Geral de Perfil S.H.A.P.E.',
        recommendations: [],
      };
    }

    if (!Array.isArray(parsed.recommendations)) {
      parsed.recommendations = [];
    }

    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (error: any) {
    console.error('Erro em /api/ai/shape-assistant:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao consultar o assistente de IA.' },
      { status: 500 }
    );
  }
}
