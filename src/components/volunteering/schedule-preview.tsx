
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type GeneratedSchedule = {
  date: Date;
  teamName: string;
  teamId: string;
};

interface SchedulePreviewProps {
  schedule: GeneratedSchedule[];
}

export function SchedulePreview({ schedule }: SchedulePreviewProps) {
  if (!schedule || schedule.length === 0) {
    return <p className="text-center text-muted-foreground">Nenhuma escala para exibir.</p>;
  }
  
  const monthName = format(schedule[0].date, 'MMMM yyyy', { locale: ptBR });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="capitalize">Escala de {monthName}</CardTitle>
        <CardDescription>Equipes escaladas para servir nos domingos do mês.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Dia da Semana</TableHead>
                <TableHead>Equipe Escalada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.map(({ date, teamName, teamId }) => (
                <TableRow key={date.toISOString()}>
                  <TableCell className="font-medium">{format(date, 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{format(date, 'EEEE', { locale: ptBR })}</TableCell>
                  <TableCell>
                    <Badge>{teamName}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
