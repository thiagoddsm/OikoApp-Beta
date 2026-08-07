'use client';

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Download, MessageSquare, Mail, Phone, Users, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { MembershipBoardConfig } from '@/types/membership-board-types';
import { ProcessedPersonResult } from '@/lib/membership/QueryBuilderEngine';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase/provider';

interface BoardPeopleDrawerProps {
  board: MembershipBoardConfig | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BoardPeopleDrawer({ board, isOpen, onClose }: BoardPeopleDrawerProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [people, setPeople] = useState<ProcessedPersonResult[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  useEffect(() => {
    if (board && isOpen && user) {
      fetchPeople(1);
    }
  }, [board, isOpen, user]);

  const fetchPeople = async (targetPage: number) => {
    if (!board) return;
    setLoading(true);
    try {
      const token = await user?.getIdToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const offset = (targetPage - 1) * limit;
      const res = await fetch(`/api/membership/boards/${board.id}/people?limit=${limit}&offset=${offset}`, { headers });
      if (!res.ok) throw new Error('Erro ao carregar lista de membros');
      const data = await res.json();
      setPeople(data.people || []);
      setTotalCount(data.totalCount || 0);
      setPage(targetPage);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao carregar membros', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const filteredPeople = people.filter(p => 
    !searchQuery || 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.phone && p.phone.includes(searchQuery))
  );

  const totalPages = Math.ceil(totalCount / limit) || 1;

  if (!isOpen || !board) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Cabeçalho da Gaveta */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-white font-bold">{totalCount} Pessoas</Badge>
              <h2 className="text-xl font-black uppercase italic tracking-tight">{board.title}</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">{board.description || 'Lista segmentada por regras dinâmicas'}</p>
          </div>

          <Button variant="outline" size="sm" onClick={onClose} className="font-bold text-xs">
            Fechar ✖
          </Button>
        </div>

        {/* Barra de Busca e Ações em Massa */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="Buscar por nome, e-mail ou telefone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(`/api/membership/boards/${board.id}/export`, '_blank')}
            className="h-9 text-xs font-bold gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
          >
            <Download size={14} /> Exportar CSV
          </Button>
        </div>

        {/* Tabela de Membros */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Membro</TableHead>
                  <TableHead className="text-xs">Contato</TableHead>
                  <TableHead className="text-xs text-center">Status</TableHead>
                  <TableHead className="text-xs text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPeople.map(person => (
                  <TableRow key={person.id}>
                    <TableCell className="font-bold text-xs">
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 font-bold text-xs">
                          {person.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-slate-800 dark:text-slate-200">{person.name}</p>
                          {person.cellName && <p className="text-[10px] text-slate-400">GC: {person.cellName}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {person.email && <div className="flex items-center gap-1"><Mail size={12} /> {person.email}</div>}
                      {person.phone && <div className="flex items-center gap-1"><Phone size={12} /> {person.phone}</div>}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold border-slate-300">
                        {person.membershipStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {person.phone && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            const cleanPhone = person.phone!.replace(/\D/g, '');
                            window.open(`https://wa.me/55${cleanPhone}`, '_blank');
                          }}
                          className="size-7 text-emerald-600 hover:bg-emerald-50"
                          title="Conversar no WhatsApp"
                        >
                          <MessageSquare size={14} />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}

                {filteredPeople.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-xs text-slate-400 italic">
                      Nenhum membro encontrado neste filtro.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Rodapé Paginado */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <span className="text-xs text-slate-500 font-medium">
            Página {page} de {totalPages} ({totalCount} registros)
          </span>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => fetchPeople(page - 1)}
              className="h-8 text-xs"
            >
              <ChevronLeft size={14} /> Anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => fetchPeople(page + 1)}
              className="h-8 text-xs"
            >
              Próximo <ChevronRight size={14} />
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
