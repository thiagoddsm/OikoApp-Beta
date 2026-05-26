'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export async function matchGcWithAi(
    importedName: string, 
    actualGcs: Array<{ name: string; leaderName?: string | null }>
): Promise<string | null> {
    if (!importedName || actualGcs.length === 0) return null;
    
    try {
        const response = await ai.generate({
            prompt: `Você é um algoritmo de correspondência de inteligência artificial de alta precisão.
Dada a lista de células (GCs) reais da igreja (com seus respectivos líderes):
${JSON.stringify(actualGcs, null, 2)}

Sua tarefa é identificar qual desses GCs corresponde melhor ao texto de origem importado: "${importedName}".

IMPORTANTE:
1. O texto importado pode conter o nome do GC (ex: "GC - MENA BARRETO") e também o nome dos líderes/responsáveis (ex: "THIAGO E MARINA").
2. Cruze as informações: use tanto o nome do GC quanto os nomes dos líderes listados para encontrar a correspondência perfeita.
3. Considere variações de grafia, abreviações ou apenas os nomes dos líderes se o nome do GC for genérico.
4. Se houver qualquer semelhança razoável de nome ou de líder, selecione esse GC correspondente. Apenas retorne null se for completamente impossível correlacionar.
5. Retorne exatamente a propriedade "name" do GC correspondente como consta na lista real (não invente ou modifique o nome).`,
            output: {
                schema: z.object({
                    matchedName: z.string().nullable()
                })
            }
        });
        
        return response.value?.matchedName || null;
    } catch (error) {
        console.error("Erro na correspondência de GC via IA:", error);
        return null;
    }
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    if (!address || address.trim() === "") return null;
    
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        console.warn("Chave do Google Maps não configurada em process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
        return null;
    }
    
    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&region=br&language=pt-BR`;
        const response = await fetch(url);
        if (!response.ok) return null;
        
        const data = await response.json();
        if (data.status === "OK" && data.results && data.results[0]?.geometry?.location) {
            const loc = data.results[0].geometry.location;
            return {
                lat: loc.lat,
                lng: loc.lng
            };
        }
        return null;
    } catch (error) {
        console.error("Erro ao geocodificar endereço:", address, error);
        return null;
    }
}
