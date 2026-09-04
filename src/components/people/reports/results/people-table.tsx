'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ProximosPassosChecklist } from '@/components/users/proximos-passos-checklist';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { formatPhone, cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Download, Send, Eye, MessageCircle, AlertCircle, Compass, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface PeopleTableProps {
  filteredUsers: any[];
  cellMap: Map<string, string>;
  areaMap: Map<string, string>;
}

const statusLabels: Record<string, string> = {
  'membro': 'Membro',
  'novo_convertido': 'Novo Convertido',
  'reconciliado': 'Reconciliado',
  'transferido': 'Transferido',
  'nao_alcancado': 'Não Alcançado',
};

const statusColors: Record<string, string> = {
  'membro': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'novo_convertido': 'bg-blue-100 text-blue-800 border-blue-200',
  'reconciliado': 'bg-purple-100 text-purple-800 border-purple-200',
  'transferido': 'bg-amber-100 text-amber-800 border-amber-200',
  'nao_alcancado': 'bg-slate-100 text-slate-700 border-slate-200',
};

export function PeopleTableResults({ filteredUsers, cellMap, areaMap }: PeopleTableProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const handleExportCsv = () => {
    if (!filteredUsers.length) return;

    const headers = ['ID', 'Nome', 'Email', 'Telefone', 'Status Integração', 'GC', 'Área de Serviço', 'Batizado', 'Próximos Passos', 'Data Nascimento'];
    const rows = filteredUsers.map(u => {
      const cellName = cellMap.get(u.hierarchy?.celulaId || u.celulaId || u.cellId) || 'Sem GC';
      const areaName = areaMap.get(u.serviceAreaId || u.areaOfServiceId) || (u.isVolunteer ? 'Voluntário' : 'Sem Área');
      const isBaptized = u.batizado === 'sim' || u.isBaptized === true ? 'Sim' : 'Não';
      const passos = Array.isArray(u.proximosPassos) ? u.proximosPassos.join('; ') : '';
      return [
        u.id,
        `"${(u.name || '').replace(/"/g, '""')}"`,
        `"${u.email || ''}"`,
        `"${u.phone || ''}"`,
        `"${statusLabels[u.integrationStatus] || u.integrationStatus || 'Não Alcançado'}"`,
        `"${cellName}"`,
        `"${areaName}"`,
        `"${isBaptized}"`,
        `"${passos}"`,
        `"${u.birthDate || u.dataNascimento || ''}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_pessoas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: 'Exportação Concluída', description: `${filteredUsers.length} registro(s) baixados em CSV.` });
  };

  const handleOpenNotificationBroadcaster = () => {
    router.push('/dashboard/notifications');
    toast({ title: 'Disparador de Mensagens', description: 'Carregando o painel de notificações por WhatsApp.' });
  };

  return (
    <div className="space-y-4">
      {/* Barra de Ações Rápidas */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/20 p-3 rounded-xl border">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
          Exibindo {paginatedUsers.length} de {filteredUsers.length} resultado(s)
        </span>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            disabled={!filteredUsers.length}
            className="h-8 text-xs font-bold gap-1.5 bg-white hover:bg-slate-50"
          >
            <Download className="size-3.5 text-emerald-600" /> Exportar CSV / Excel
          </Button>

          <Button
            size="sm"
            onClick={handleOpenNotificationBroadcaster}
            disabled={!filteredUsers.length}
            className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Send className="size-3.5" /> Disparar WhatsApp ({filteredUsers.filter(u => u.phone).length})
          </Button>
        </div>
      </div>

      {/* Tabela de Resultados */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto w-full">
<Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-900">
            <TableRow>
              <TableHead className="w-[240px]">Pessoa</TableHead>
              <TableHead>Status Integração</TableHead>
              <TableHead>Célula (GC)</TableHead>
              <TableHead>Área de Serviço</TableHead>
              <TableHead>Próximos Passos</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center text-muted-foreground italic">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="size-8 text-amber-500/50" />
                    <p className="font-bold text-slate-700">Nenhum membro encontrado com os filtros selecionados.</p>
                    <p className="text-xs text-muted-foreground">Tente suavizar os critérios ou clique em "Limpar Presets".</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedUsers.map((user: any) => {
                const avatar = PlaceHolderImages.find(p => p.id === 'avatar-1');
                const photoSrc = user.profilePicture || user.photoURL || user.avatar || avatar?.imageUrl;
                const cellName = cellMap.get(user.hierarchy?.celulaId || user.celulaId || user.cellId);
                const areaName = areaMap.get(user.serviceAreaId || user.areaOfServiceId) || (user.isVolunteer ? 'Voluntário Ativo' : null);

                const passos = Array.isArray(user.proximosPassos) ? user.proximosPassos : (Array.isArray(user.decisao) ? user.decisao : []);
                const concluidos = Array.isArray(user.proximosPassosConcluidos) ? user.proximosPassosConcluidos : [];
                const hasPassos = passos.length > 0;
                const doneCount = passos.filter((p: string) => concluidos.includes(p)).length;

                return (
                  <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9 border border-slate-200">
                          <AvatarImage src={photoSrc} alt={user.name} />
                          <AvatarFallback className="text-xs font-bold">{user.name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{user.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{user.email || 'Sem e-mail'}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px] font-bold", statusColors[user.integrationStatus] || "bg-slate-100 text-slate-700 border-slate-200")}>
                        {statusLabels[user.integrationStatus] || user.integrationStatus || 'Não Alcançado'}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {cellName ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[11px] font-semibold">
                          {cellName}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sem GC</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {areaName ? (
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-800 border-indigo-200 text-[11px] font-semibold">
                          {areaName}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sem Área</span>
                      )}
                    </TableCell>

                    {/* Popover Interativo para Próximos Passos */}
                    <TableCell>
                      {hasPassos ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "h-7 text-[11px] font-bold gap-1 px-2.5 rounded-full shadow-none",
                                doneCount === passos.length
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                                  : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                              )}
                            >
                              <Compass className="size-3.5 text-primary" />
                              <span>{doneCount}/{passos.length} Concluídos</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-3 shadow-lg" align="start">
                            <div className="space-y-2">
                              <p className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <Compass className="size-4 text-primary" /> Próximos Passos / Conexão
                              </p>
                              <p className="text-[11px] text-muted-foreground">Clique no item para alternar entre concluído/pendente:</p>
                              <ProximosPassosChecklist
                                userId={user.id}
                                proximosPassos={passos}
                                proximosPassosConcluidos={concluidos}
                              />
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Nenhum</span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs font-mono text-slate-600">
                      {user.phone ? formatPhone(user.phone) : <span className="text-slate-300 italic">Sem fone</span>}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {user.phone && (
                          <Button size="sm" variant="ghost" className="size-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" asChild>
                            <a
                              href={`https://wa.me/55${String(user.phone).replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Conversar no WhatsApp"
                            >
                              <MessageCircle className="size-4" />
                            </a>
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="size-8 p-0 text-slate-500 hover:text-primary" asChild>
                          <Link href={`/dashboard/people/${user.id}`} title="Ver Perfil Completo">
                            <Eye className="size-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
</div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t bg-slate-50 dark:bg-slate-900">
            <span className="text-xs text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
