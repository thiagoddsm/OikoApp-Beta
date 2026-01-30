'use client';

import { Handshake, School, MapIcon, Briefcase, Church, Group, BookOpen, UserPlus, Award, Shield, Target, UserX, UserCheck, GraduationCap } from 'lucide-react';

export const journeyColumns = [
    { id: 'nao_alcancado', title: 'Não Alcançado' },
    { id: 'novo_convertido', title: 'Novo Convertido' },
    { id: 'reconciliado', title: 'Reconciliado' },
    { id: 'transferido', title: 'Transferido' },
    { id: 'membro', title: 'Membro' },
    { id: 'consolidado', title: 'Consolidado' },
    { id: 'lider_treinamento', title: 'Líder em treinamento' },
    { id: 'lider_gc', title: 'Líder de GC' },
    { id: 'lider_area', title: 'Líder de Área' },
    { id: 'lider_rede', title: 'Líder de Rede' },
    { id: 'pastor', title: 'Pastor' },
];

export const statusToPhaseMap: { [key: string]: string } = {
    nao_alcancado: '1',
    novo_convertido: '1',
    reconciliado: '1',
    transferido: '1',
    membro: '2',
    consolidado: '2',
    lider_treinamento: '3',
    lider_gc: '3',
    lider_area: '4',
    lider_rede: '4',
    pastor: '4',
};

export const phaseConfig: { [key: string]: { name: string; color: string } } = {
    '1': { name: 'Integração', color: 'bg-blue-100 text-blue-700' },
    '2': { name: 'Comunhão', color: 'bg-emerald-100 text-emerald-700' },
    '3': { name: 'Serviço', color: 'bg-amber-100 text-amber-700' },
    '4': { name: 'Liderança', color: 'bg-indigo-100 text-indigo-700' },
};

export const iconMap: { [key: string]: React.ElementType } = {
    nao_alcancado: UserX,
    novo_convertido: UserPlus,
    reconciliado: Handshake,
    transferido: Church,
    membro: Award,
    consolidado: UserCheck,
    lider_treinamento: GraduationCap,
    lider_gc: Group,
    lider_area: MapIcon,
    lider_rede: Shield,
    pastor: Briefcase,
    default: BookOpen,
};
