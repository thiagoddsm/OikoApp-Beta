'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Layers, Plus, Trash2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { CampaignMessageVersion } from '@/domain/campaign-health/entities/campaign';
import { CampaignHealthService } from '@/domain/campaign-health/services/campaign-health-service';
import { calculateSimilarityScore } from '@/domain/campaign-health/evaluators/similarity-score';

interface MessageVersionsEditorProps {
  originalText: string;
  versions: CampaignMessageVersion[];
  onChangeVersions: (versions: CampaignMessageVersion[]) => void;
}

export function MessageVersionsEditor({ originalText, versions, onChangeVersions }: MessageVersionsEditorProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const similarityIndex = calculateSimilarityScore(versions.map(v => v.text));

  const handleGenerateVariations = async () => {
    if (!originalText || originalText.trim().length < 10) return;
    setIsGenerating(true);
    try {
      const generated = await CampaignHealthService.generateMessageVariations(originalText, 3);
      const formatted: CampaignMessageVersion[] = generated.map(g => ({
        id: g.id,
        label: g.label,
        text: g.text,
        approved: true
      }));
      onChangeVersions(formatted);
    } catch (e) {
      console.error("Erro ao gerar variações:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateText = (id: string, newText: string) => {
    const updated = versions.map(v => v.id === id ? { ...v, text: newText } : v);
    onChangeVersions(updated);
  };

  const handleRemoveVersion = (id: string) => {
    if (versions.length <= 1) return;
    const updated = versions.filter(v => v.id !== id);
    onChangeVersions(updated);
  };

  const handleAddManualVersion = () => {
    const nextChar = String.fromCharCode(65 + versions.length); // A, B, C...
    const newVer: CampaignMessageVersion = {
      id: `ver-${Date.now()}`,
      label: `Versão ${nextChar}`,
      text: originalText || '',
      approved: true
    };
    onChangeVersions([...versions, newVer]);
  };

  return (
    <Card className="border-2 shadow-xs bg-slate-50/50 dark:bg-slate-900/30">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-primary" />
          <CardTitle className="text-xs font-black uppercase tracking-wider">
            Variações da Mensagem ({versions.length} Versão/ões)
          </CardTitle>
        </div>

        {/* Badge do Índice de Similaridade */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={similarityIndex > 80 ? 'bg-amber-500/10 text-amber-700 border-amber-300' : 'bg-emerald-500/10 text-emerald-700 border-emerald-300'}>
            Similaridade: {similarityIndex}% {similarityIndex > 80 ? '⚠️ Alta' : '🟢 Baixa'}
          </Badge>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs font-bold text-primary border-primary/30 hover:bg-primary/5 gap-1.5"
            onClick={handleGenerateVariations}
            disabled={isGenerating || !originalText}
          >
            {isGenerating ? <RefreshCw className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
            Gerar 3 Versões com IA
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {versions.map((ver, idx) => (
          <div key={ver.id} className="p-3 bg-white dark:bg-slate-900 border rounded-lg space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-primary uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="size-3 text-emerald-500" /> {ver.label}
              </span>

              {idx > 0 && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-muted-foreground hover:text-red-500"
                  onClick={() => handleRemoveVersion(ver.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>

            <Textarea
              rows={3}
              value={ver.text}
              onChange={(e) => handleUpdateText(ver.id, e.target.value)}
              placeholder="Digite o texto da versão..."
              className="text-xs font-mono bg-slate-50 dark:bg-slate-800"
            />
          </div>
        ))}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full h-8 text-xs font-bold border border-dashed border-slate-300 dark:border-slate-700 text-muted-foreground hover:text-primary gap-1.5"
          onClick={handleAddManualVersion}
        >
          <Plus className="size-3.5" /> Adicionar Versão Manualmente
        </Button>
      </CardContent>
    </Card>
  );
}
