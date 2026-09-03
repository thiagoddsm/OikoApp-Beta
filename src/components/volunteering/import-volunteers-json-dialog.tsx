'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { useMembersData, useVolunteeringServiceData } from '@/hooks/useDomainData';
import {
  FileJson,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Loader2,
  Sparkles,
  Layers,
  ArrowRight,
  Copy,
  Users
} from 'lucide-react';

interface ImportItem {
  nome?: string;
  email?: string;
  area?: string;
  equipe?: string;
  [key: string]: any;
}

interface ParsedMatch {
  raw: ImportItem;
  user: any | null;
  area: any | null;
  team: any | null;
  status: 'ready' | 'user_not_found' | 'area_not_found' | 'clear_area';
  message: string;
}

function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function ImportVolunteersJsonDialog() {
  const [open, setOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { users } = useMembersData();
  const { serviceAreas: areas, teams } = useVolunteeringServiceData();

  // Constrói o bloco de referência de áreas e equipes para incluir nos downloads
  const referenceData = useMemo(() => {
    const areasList = (areas || []).map(a => {
      const areaTeams = (teams || []).filter(t => t.areaId === a.id).map(t => t.name);
      return {
        nome: a.name,
        tipo: a.areaType || 'regular',
        equipes: areaTeams
      };
    });

    return {
      _aviso_para_ia: "Este bloco serve exclusivamente como referência das Áreas e Equipes cadastradas na igreja. Ele será ignorado na importação.",
      areasCadastradas: areasList
    };
  }, [areas, teams]);

  // 1. Download de Exemplo Limpo
  const handleDownloadTemplate = () => {
    const payload = {
      voluntarios: [
        {
          nome: "Thiago Dias de Souza Moura",
          email: "thiagoddsm@gmail.com",
          area: areas?.[0]?.name || "Mídia",
          equipe: teams?.[0]?.name || "Equipe Manhã"
        },
        {
          nome: "Exemplo Outro Voluntário",
          email: "voluntario@exemplo.com",
          area: areas?.[1]?.name || "Coffee Break",
          equipe: ""
        }
      ],
      _referencia_areas_e_equipes: referenceData
    };

    downloadJsonFile(payload, 'modelo_importacao_voluntarios.json');
  };

  // 2. Download de Pessoas Sem Área de Serviço
  const handleDownloadUnassigned = () => {
    const unassignedUsers = (users || []).filter(u => !u.serviceAreaId);

    const payload = {
      voluntarios: unassignedUsers.map(u => ({
        nome: u.name,
        email: u.email || '',
        area: "",
        equipe: ""
      })),
      _referencia_areas_e_equipes: referenceData
    };

    downloadJsonFile(payload, `membros_sem_area_servico_${unassignedUsers.length}_pessoas.json`);
  };

  // 3. Download de Todos os Membros Cadastrados
  const handleDownloadAll = () => {
    const payload = {
      voluntarios: (users || []).map(u => {
        const userArea = areas?.find(a => a.id === u.serviceAreaId);
        const userTeam = teams?.find(t => t.id === u.serviceTeamId);
        return {
          nome: u.name,
          email: u.email || '',
          area: userArea?.name || "",
          equipe: userTeam?.name || ""
        };
      }),
      _referencia_areas_e_equipes: referenceData
    };

    downloadJsonFile(payload, `todos_membros_voluntariado_${users?.length || 0}_pessoas.json`);
  };

  const downloadJsonFile = (data: any, fileName: string) => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: 'Arquivo JSON Baixado! 📥',
      description: `${fileName} foi salvo com a estrutura e bloco de referência.`,
    });
  };

  // Parse e validação do JSON com tolerância a referências
  const parsedMatches = useMemo((): ParsedMatch[] => {
    if (!jsonInput.trim()) return [];

    let parsedRaw: any;
    try {
      parsedRaw = JSON.parse(jsonInput);
    } catch {
      return [];
    }

    let itemsList: any[] = [];
    if (Array.isArray(parsedRaw)) {
      itemsList = parsedRaw;
    } else if (parsedRaw && typeof parsedRaw === 'object') {
      if (Array.isArray(parsedRaw.voluntarios)) {
        itemsList = parsedRaw.voluntarios;
      } else if (Array.isArray(parsedRaw.membros)) {
        itemsList = parsedRaw.membros;
      } else if (Array.isArray(parsedRaw.data)) {
        itemsList = parsedRaw.data;
      } else {
        // Se for um objeto com chaves de nomes
        itemsList = Object.values(parsedRaw).filter(v => typeof v === 'object');
      }
    }

    // Filtra e descarta qualquer item que seja o bloco de referência
    const cleanItems: ImportItem[] = itemsList.filter(item => {
      if (!item || typeof item !== 'object') return false;
      // Se for item de metadados/referência da IA
      if (item._aviso_para_ia || item._referencia_areas_e_equipes || item._referencia_para_ia) return false;
      if (item.areasCadastradas || item.areasDisponiveis) return false;
      // Deve possuir ao menos nome ou email
      return Boolean(item.nome || item.name || item.email);
    });

    // Mapeamento contra o banco de dados
    return cleanItems.map(item => {
      const searchName = normalizeString(item.nome || item.name || '');
      const searchEmail = normalizeString(item.email || '');

      // 1. Encontra usuário
      let matchedUser = null;
      if (searchEmail) {
        matchedUser = users.find(u => normalizeString(u.email || '') === searchEmail);
      }
      if (!matchedUser && searchName) {
        matchedUser = users.find(u => normalizeString(u.name || '') === searchName);
      }
      if (!matchedUser && searchName) {
        // Busca aproximada (início do nome ou sobrenome)
        matchedUser = users.find(u => {
          const uNameNorm = normalizeString(u.name || '');
          return uNameNorm.includes(searchName) || searchName.includes(uNameNorm);
        });
      }

      if (!matchedUser) {
        return {
          raw: item,
          user: null,
          area: null,
          team: null,
          status: 'user_not_found',
          message: `Usuário "${item.nome || item.email}" não encontrado no cadastro.`
        };
      }

      const areaInput = (item.area || item.areaDeServico || '').trim();
      const teamInput = (item.equipe || item.time || '').trim();

      // Se a área veio em branco, significa desvincular da área
      if (!areaInput) {
        return {
          raw: item,
          user: matchedUser,
          area: null,
          team: null,
          status: 'clear_area',
          message: 'Desvincular de qualquer área de serviço.'
        };
      }

      // 2. Encontra Área
      const areaNorm = normalizeString(areaInput);
      const matchedArea = areas.find(a => normalizeString(a.name) === areaNorm || normalizeString(a.name).includes(areaNorm) || areaNorm.includes(normalizeString(a.name)));

      if (!matchedArea) {
        return {
          raw: item,
          user: matchedUser,
          area: null,
          team: null,
          status: 'area_not_found',
          message: `Área "${areaInput}" não encontrada nas áreas cadastradas.`
        };
      }

      // 3. Encontra Equipe (se fornecida)
      let matchedTeam = null;
      if (teamInput) {
        const teamNorm = normalizeString(teamInput);
        matchedTeam = teams.find(t => (t.areaId === matchedArea.id || !t.areaId) && (normalizeString(t.name) === teamNorm || normalizeString(t.name).includes(teamNorm)));
      }

      return {
        raw: item,
        user: matchedUser,
        area: matchedArea,
        team: matchedTeam,
        status: 'ready',
        message: `Vincular a "${matchedArea.name}"${matchedTeam ? ` (Equipe: ${matchedTeam.name})` : ''}`
      };
    });
  }, [jsonInput, users, areas, teams]);

  const readyCount = useMemo(() => parsedMatches.filter(m => m.status === 'ready' || m.status === 'clear_area').length, [parsedMatches]);

  // Aplica as alterações no Firestore em lote (Batch write)
  const handleApplyChanges = async () => {
    if (!firestore || readyCount === 0) return;

    setIsApplying(true);
    try {
      const validMatches = parsedMatches.filter(m => m.status === 'ready' || m.status === 'clear_area');
      const batch = writeBatch(firestore);

      validMatches.forEach(match => {
        if (!match.user?.id) return;
        const userRef = doc(firestore, 'users', match.user.id);

        if (match.status === 'clear_area') {
          batch.update(userRef, {
            serviceAreaId: '',
            serviceTeamId: ''
          });
        } else if (match.area) {
          batch.update(userRef, {
            serviceAreaId: match.area.id,
            serviceTeamId: match.team?.id || ''
          });
        }
      });

      await batch.commit();

      toast({
        title: '🎉 Vínculos Atualizados com Sucesso!',
        description: `${validMatches.length} membro(s) foram vinculados às suas respectivas áreas de serviço.`,
      });

      setJsonInput('');
      setOpen(false);
    } catch (err: any) {
      console.error('Erro ao atualizar vínculos via JSON:', err);
      toast({
        variant: 'destructive',
        title: 'Erro na atualização',
        description: err.message || 'Falha ao gravar alterações no banco de dados.',
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 font-bold shadow-sm text-xs bg-background">
          <FileJson className="size-4 text-amber-600" />
          Atualizar Vínculos via JSON
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
              <FileJson className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-black text-foreground">
                Atualizar Áreas de Serviço via JSON
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Cole o JSON com nomes, áreas e equipes para atualizar os cadastros em lote.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* BOTÕES DE DOWNLOAD DE MODELOS E DADOS */}
          <div className="bg-muted/50 border rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Download className="size-3.5 text-amber-600" />
                Baixar Modelos & Listas Pré-preenchidas:
              </span>
              <Badge variant="outline" className="text-[10px] text-muted-foreground bg-background">
                Inclui referência de Áreas/Equipes para IA
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="h-7 text-xs font-semibold gap-1 bg-background"
              >
                📄 Exemplo Limpo
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadUnassigned}
                className="h-7 text-xs font-semibold gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300"
              >
                👥 Membros Sem Área ({users?.filter(u => !u.serviceAreaId).length || 0})
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadAll}
                className="h-7 text-xs font-semibold gap-1 bg-background"
              >
                📋 Todos os Membros ({users?.length || 0})
              </Button>
            </div>
          </div>

          {/* ÁREA DE COLAR JSON */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="json-input" className="text-xs font-bold text-foreground">
                Cole o JSON de Atualização:
              </Label>
              {jsonInput && (
                <button
                  type="button"
                  onClick={() => setJsonInput('')}
                  className="text-[11px] text-muted-foreground hover:text-destructive font-medium"
                >
                  Limpar
                </button>
              )}
            </div>

            <Textarea
              id="json-input"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder='[
  { "nome": "Thiago Dias de Souza Moura", "area": "Mídia", "equipe": "Equipe Manhã" },
  { "nome": "Isabelle Nunes", "area": "Coffee Break", "equipe": "" }
]'
              rows={7}
              className="font-mono text-xs leading-relaxed"
              spellCheck={false}
            />
            <p className="text-[10px] text-muted-foreground">
              💡 Dica: Pode colar o JSON completo gerado pela IA. O bloco <code>_referencia_areas_e_equipes</code> será desconsiderado automaticamente.
            </p>
          </div>

          {/* TABELA DE PRÉVIA DAS CORRESPONDÊNCIAS */}
          {jsonInput.trim() && (
            <div className="space-y-2 pt-1 border-t">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  Prévia da Importação ({parsedMatches.length} registros identificados):
                </span>
                <div className="flex items-center gap-1.5 text-xs">
                  <Badge className="bg-emerald-600 text-white font-bold">
                    {readyCount} prontos para atualizar
                  </Badge>
                  {parsedMatches.length - readyCount > 0 && (
                    <Badge variant="destructive" className="font-bold">
                      {parsedMatches.length - readyCount} com avisos
                    </Badge>
                  )}
                </div>
              </div>

              {parsedMatches.length === 0 ? (
                <div className="p-4 border rounded-xl bg-rose-50 text-rose-800 text-xs font-semibold text-center">
                  ⚠️ Formato de JSON inválido. Verifique se as aspas e chaves estão corretas.
                </div>
              ) : (
                <div className="border rounded-xl max-h-52 overflow-y-auto divide-y text-xs bg-background">
                  {parsedMatches.map((m, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between gap-2 hover:bg-muted/40">
                      <div className="flex items-center gap-2 truncate">
                        {m.status === 'ready' ? (
                          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                        ) : m.status === 'clear_area' ? (
                          <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                        ) : (
                          <HelpCircle className="size-4 text-rose-500 shrink-0" />
                        )}

                        <div className="truncate">
                          <span className="font-bold text-foreground truncate block">
                            {m.user ? m.user.name : (m.raw.nome || m.raw.email)}
                          </span>
                          <span className="text-[11px] text-muted-foreground truncate block">
                            {m.message}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {m.status === 'ready' && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-bold">
                            {m.area?.name} {m.team ? `• ${m.team.name}` : ''}
                          </Badge>
                        )}
                        {m.status === 'clear_area' && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] font-bold">
                            Remover da Área
                          </Badge>
                        )}
                        {m.status === 'user_not_found' && (
                          <Badge variant="destructive" className="text-[10px] font-bold">
                            Sem cadastro
                          </Badge>
                        )}
                        {m.status === 'area_not_found' && (
                          <Badge variant="destructive" className="text-[10px] font-bold">
                            Área não existe
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={isApplying}
            className="text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleApplyChanges}
            disabled={isApplying || readyCount === 0}
            className="gap-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
          >
            {isApplying ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Atualizando no Banco...
              </>
            ) : (
              <>
                <Sparkles className="size-3.5" />
                Confirmar e Atualizar ({readyCount})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
