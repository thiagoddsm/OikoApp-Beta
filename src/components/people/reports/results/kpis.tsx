'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, HeartHandshake, HandHelping, CheckCircle2, Phone } from 'lucide-react';

interface KpisProps {
  totalUsers: number;
  filteredUsers: any[];
}

export function Kpis({ totalUsers, filteredUsers }: KpisProps) {
  const count = filteredUsers.length;
  
  const miembros = filteredUsers.filter(u => u.integrationStatus === 'membro').length;
  const membrosPercent = count > 0 ? Math.round((miembros / count) * 100) : 0;

  const emGc = filteredUsers.filter(u => u.hierarchy?.celulaId || u.celulaId || u.cellId).length;
  const emGcPercent = count > 0 ? Math.round((emGc / count) * 100) : 0;

  const voluntários = filteredUsers.filter(u => u.isVolunteer === true || u.serviceStatus === 'serving' || (Array.isArray(u.serviceAreaIds) && u.serviceAreaIds.length > 0) || !!u.serviceAreaId).length;
  const voluntáriosPercent = count > 0 ? Math.round((voluntários / count) * 100) : 0;

  const comWhatsapp = filteredUsers.filter(u => u.phone && String(u.phone).replace(/\D/g, '').length >= 8).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <Card className="bg-primary/5 border-primary/20 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Filtrado</p>
            <p className="text-2xl font-black text-primary">{count} <span className="text-xs font-normal text-muted-foreground">de {totalUsers}</span></p>
          </div>
          <Users className="size-8 text-primary/40" />
        </CardContent>
      </Card>

      <Card className="bg-emerald-500/5 border-emerald-500/20 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Membros Oficializados</p>
            <p className="text-2xl font-black text-emerald-600">{miembros} <span className="text-xs font-semibold text-emerald-500">({membrosPercent}%)</span></p>
          </div>
          <CheckCircle2 className="size-8 text-emerald-500/40" />
        </CardContent>
      </Card>

      <Card className="bg-amber-500/5 border-amber-500/20 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Vinculados a GC</p>
            <p className="text-2xl font-black text-amber-600">{emGc} <span className="text-xs font-semibold text-amber-500">({emGcPercent}%)</span></p>
          </div>
          <HeartHandshake className="size-8 text-amber-500/40" />
        </CardContent>
      </Card>

      <Card className="bg-indigo-500/5 border-indigo-500/20 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Voluntários Ativos</p>
            <p className="text-2xl font-black text-indigo-600">{voluntários} <span className="text-xs font-semibold text-indigo-500">({voluntáriosPercent}%)</span></p>
          </div>
          <HandHelping className="size-8 text-indigo-500/40" />
        </CardContent>
      </Card>

      <Card className="bg-purple-500/5 border-purple-500/20 shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Contato WhatsApp</p>
            <p className="text-2xl font-black text-purple-600">{comWhatsapp}</p>
          </div>
          <Phone className="size-8 text-purple-500/40" />
        </CardContent>
      </Card>
    </div>
  );
}
