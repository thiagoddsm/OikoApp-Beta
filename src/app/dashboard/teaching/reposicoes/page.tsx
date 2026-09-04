'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPendingMakeupsAction, rescheduleMakeupAction, PendingMakeup } from '../diario/actions';
import { RefreshCw, Search, Loader2, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function FilaDeReposicoesPage() {
  const { toast } = useToast();

  const [makeups, setMakeups] = useState<PendingMakeup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendente' | 'reagendada' | 'resolvida'>('todos');

  // Reschedule Modal States
  const [selectedMakeup, setSelectedMakeup] = useState<PendingMakeup | null>(null);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [novaData, setNovaData] = useState('');
  const [novoHorario, setNovoHorario] = useState('19:00');
  const [submitting, setSubmitting] = useState(false);

  // Fetch Pending Makeups
  useEffect(() => {
    setLoading(true);
    getPendingMakeupsAction()
      .then(res => {
        if (res.success && res.data) {
          setMakeups(res.data);
        } else {
          toast({ title: 'Erro ao carregar', description: res.error || 'Erro desconhecido', variant: 'destructive' });
        }
      })
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  // Filtering Logic
  const filteredMakeups = useMemo(() => {
    return makeups.filter(m => {
      const matchSearch = 
        m.aluno_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.professor_nome?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = statusFilter === 'todos' ? true : m.status === statusFilter;
      
      return matchSearch && matchStatus;
    });
  }, [makeups, searchTerm, statusFilter]);

  // Open reschedule modal
  const openReschedule = (makeup: PendingMakeup) => {
    setSelectedMakeup(makeup);
    setNovaData(new Date().toISOString().split('T')[0]);
    setNovoHorario('19:00');
    setIsRescheduleOpen(true);
  };

  // Submit reschedule
  const handleReschedule = async () => {
    if (!selectedMakeup) return;
    if (!novaData || !novoHorario) {
      toast({ title: 'Validação', description: 'Por favor, selecione a data e o horário.', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await rescheduleMakeupAction(selectedMakeup.id, novaData, novoHorario);
      if (res.success) {
        toast({ title: 'Reagendado!', description: 'Uma nova aula foi criada e a reposição foi marcada como resolvida.' });
        setIsRescheduleOpen(false);
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast({ title: 'Erro', description: res.error || 'Erro ao reagendar reposição', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge className="bg-red-500 hover:bg-red-600 text-white">Pendente</Badge>;
      case 'reagendada':
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Reagendada</Badge>;
      case 'resolvida':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Resolvida</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMotivoText = (motivo: string) => {
    return motivo === 'falta_aluno' ? 'Falta do Aluno' : 'Falta do Professor';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <RefreshCw className="size-6 text-indigo-500" />
          Fila de Reposições (Wave)
        </h1>
        <p className="text-sm text-slate-400">Gerenciamento centralizado de faltas e reagendamentos de mentorias.</p>
      </div>

      {/* Filter and search bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar aluno ou professor..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <Button 
              variant={statusFilter === 'todos' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setStatusFilter('todos')}
              className="text-xs"
            >
              Todos
            </Button>
            <Button 
              variant={statusFilter === 'pendente' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setStatusFilter('pendente')}
              className="text-xs text-red-500 border-red-200"
            >
              Pendentes
            </Button>
            <Button 
              variant={statusFilter === 'reagendada' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setStatusFilter('reagendada')}
              className="text-xs text-blue-500 border-blue-200"
            >
              Reagendadas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Makeups list table */}
      <Card>
        <CardContent className="p-0">
          {loading && makeups.length === 0 ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
<Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Professor</TableHead>
                  <TableHead>Motivo da Falta</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMakeups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-500 dark:text-slate-400">
                      Nenhuma reposição encontrada para esta seleção.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMakeups.map(makeup => (
                    <TableRow key={makeup.id}>
                      <TableCell className="font-bold">{makeup.aluno_nome}</TableCell>
                      <TableCell>{makeup.professor_nome}</TableCell>
                      <TableCell>
                        <span className={`text-xs font-bold ${makeup.motivo === 'falta_aluno' ? 'text-red-500' : 'text-amber-500'}`}>
                          {getMotivoText(makeup.motivo)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {makeup.criadoEm ? new Date(makeup.criadoEm).toLocaleDateString('pt-BR') : 'N/A'}
                      </TableCell>
                      <TableCell>{getStatusBadge(makeup.status)}</TableCell>
                      <TableCell className="text-right">
                        {makeup.status === 'pendente' ? (
                          <Button 
                            size="sm" 
                            onClick={() => openReschedule(makeup)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                          >
                            <Calendar className="size-3.5" /> Reagendar
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400 font-bold flex items-center justify-end gap-1">
                            <CheckCircle className="size-3.5 text-emerald-500" /> Resolvido
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
</div>
          )}
        </CardContent>
      </Card>

      {/* Reschedule Modal */}
      <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reagendar Aula de Reposição</DialogTitle>
            <DialogDescription>
              Defina a nova data e o horário acordados para a mentoria de reposição de <strong>{selectedMakeup?.aluno_nome}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="data">Nova Data da Aula</Label>
              <Input 
                id="data"
                type="date"
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="horario">Horário de Início</Label>
              <Input 
                id="horario"
                type="time"
                value={novoHorario}
                onChange={(e) => setNovoHorario(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRescheduleOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleReschedule}
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {submitting ? 'Salvando...' : 'Reagendar Mentoria'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
