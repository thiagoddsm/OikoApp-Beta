'use client';

import { Handshake, MapIcon, Briefcase, Church, Group, UserPlus, Award, Shield, UserX, UserCheck, GraduationCap, Target } from 'lucide-react';

/**
 * Definição central das etapas da jornada de um membro na igreja.
 * Esta lista dita a ordem de progressão na trilha de discipulado (11 níveis oficiais).
 */
export const journeyColumns = [
    { id: 'nao_alcancado', title: 'Cidade (Não Alcançado)' },
    { id: 'novo_convertido', title: 'Novo Convertido' },
    { id: 'reconciliado', title: 'Reconciliado' },
    { id: 'transferido', title: 'Transferido' },
    { id: 'membro', title: 'Membro' },
    { id: 'consolidado', title: 'Consolidado' },
    { id: 'lider_treinamento', title: 'Líder em Treinamento' },
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

/**
 * Opções de Início de Caminhada (Status Inicial em linguagem clara)
 */
export const CAMINHADA_INICIO_OPTIONS = [
    { value: 'conversao', label: 'Me converti / Aceitei a Cristo aqui na IBM', initialStatus: 'novo_convertido' },
    { value: 'reconciliacao', label: 'Me reconciliei com Jesus aqui', initialStatus: 'novo_convertido' },
    { value: 'transferencia', label: 'Já era cristão(ã) e vim transferido(a) de outra igreja', initialStatus: 'membro_outra_igreja' },
    { value: 'conhecendo', label: 'Ainda estou conhecendo a fé cristã / Não sou convertido', initialStatus: 'visitante' },
];

/**
 * Opções de Desejos de Conexão / Próximos Passos (Opcional)
 */
export const PROXIMOS_PASSOS_OPTIONS = [
    { value: 'batismo', label: 'Quero me batizar nas águas' },
    { value: 'gc', label: 'Quero me integrar em uma Célula / GC' },
    { value: 'voluntariado', label: 'Quero me voluntariar em uma área de serviço' },
    { value: 'congregar', label: 'Estou procurando uma igreja para me integrar e congregar' },
    { value: 'aconselhamento', label: 'Preciso de atendimento pastoral ou aconselhamento' },
];

export const getProximoPassoLabel = (key: string): string => {
    const found = PROXIMOS_PASSOS_OPTIONS.find(o => o.value === key);
    if (found) return found.label;
    
    // Mapeamentos legados
    if (key === 'Decisão por Cristo') return 'Quero me batizar nas águas';
    if (key === 'Reconciliação') return 'Me reconciliei com Jesus';
    if (key === 'Ingressar em um GC') return 'Quero me integrar em uma Célula / GC';
    if (key === 'Procurando uma igreja para congregar' || key === 'Procurando uma igreja para me integrar/congregar') return 'Estou procurando uma igreja para me integrar e congregar';
    if (key === 'Apenas Visitando') return 'Apenas visitando a igreja';
    
    return key;
};

export const getCaminhadaInicioLabel = (value?: string, fallbackInitialStatus?: string): string => {
    if (value) {
        const found = CAMINHADA_INICIO_OPTIONS.find(o => o.value === value);
        if (found) return found.label;
    }
    if (fallbackInitialStatus) {
        if (fallbackInitialStatus === 'novo_convertido') return 'Me converti / Aceitei a Cristo aqui na IBM';
        if (fallbackInitialStatus === 'reconciliado') return 'Me reconciliei com Jesus aqui';
        if (fallbackInitialStatus === 'membro_outra_igreja') return 'Já era cristão(ã) e vim transferido(a) de outra igreja';
        if (fallbackInitialStatus === 'nao_convertido' || fallbackInitialStatus === 'visitante') return 'Ainda estou conhecendo a fé cristã / Não sou convertido';
        return fallbackInitialStatus.replace('_', ' ');
    }
    return 'Não informado';
};