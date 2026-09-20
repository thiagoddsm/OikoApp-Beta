import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Texto não fornecido.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key do Gemini não configurada no servidor.' }, { status: 500 });
    }

    const prompt = `Você é um assistente (Kankan Oiko) especialista em analisar ordem de culto de igrejas enviadas pelo WhatsApp e converter em um JSON estruturado.
Eu vou te passar um texto recebido via WhatsApp. Extraia as informações gerais do culto e a lista de itens/momentos na ordem cronológica que aparecem.
Se tiver horários (ex: 17h30/19h30), você pode se basear neles para deduzir a duração de cada etapa (ex: de 17:00 até 17:30 = 30 minutos). Se não tiver duração óbvia, use um padrão razoável (ex: 10 para avisos, 20 para louvor, 30 para palavra).
Para o "startTime" em cultInfo, escolha o primeiro horário de início principal (ex: 17:00 ou 19:00).
Coloque o nome das músicas ou detalhes adicionais em "description".
Preencha a chave "type" com os seguintes valores possíveis: "musica", "palavra", "aviso", "oracao", "outro".

Retorne APENAS um objeto JSON no seguinte formato:

{
  "cultInfo": {
    "date": "",
    "coordenadorTecnico": "A definir",
    "staff": "A definir",
    "lead": "A definir",
    "som": "A definir",
    "projecao": "A definir",
    "iluminacao": "A definir",
    "transmissao": "A definir",
    "pregador": "A definir",
    "startTime": "00:00"
  },
  "items": [
    {
      "id": "gerar-id-unico-tipo-1",
      "title": "Abertura / Música Ambiente",
      "duration": 30,
      "type": "musica",
      "responsible": "Louvor",
      "description": "Músicas tocadas etc",
      "technical": {
        "projection": { "text": "-", "color": "#ffffff" },
        "sound": { "text": "-" },
        "microphone": { "text": "-" },
        "lighting": { "text": "-", "color": "#ffffff" },
        "camera": { "text": "-" }
      },
      "completed": false
    }
  ]
}

Texto a ser analisado:
${text}
`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      })
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error("Resposta em branco do Gemini");

    const jsonParsed = JSON.parse(content);
    
    // Ensure all items have UUIDs if the AI didn't generate proper ones
    if (jsonParsed.items && Array.isArray(jsonParsed.items)) {
      jsonParsed.items = jsonParsed.items.map((item: any) => ({
        ...item,
        id: item.id || crypto.randomUUID()
      }));
    }

    return NextResponse.json(jsonParsed);
  } catch (error: any) {
    console.error('Erro ao processar culto via IA:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar o texto com a IA.' }, { status: 500 });
  }
}
