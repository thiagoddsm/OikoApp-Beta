'use client';

import { Handshake, MapIcon, Briefcase, Church, Group, UserPlus, Award, Shield, UserX, UserCheck, GraduationCap, User, LogIn, Target } from 'lucide-react';

/**
 * Definição central das etapas da jornada de um membro na igreja.
 * Esta lista dita a ordem de progressão na trilha de discipulado.
 */
export const journeyColumns = [
    { id: 'nao_alcancado', title: 'Cidade (Não Alcançado)' },
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

/**
 * Mapeamento das etapas para as 4 grandes fases do organismo da igreja.
 */
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
    '1': { name: 'Integração', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    '2': { name: 'Comunhão', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    '3': { name: 'Serviço', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    '4': { name: 'Liderança', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
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
    default: Target,
};
