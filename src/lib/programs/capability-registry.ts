import { CapabilityId, CapabilityMetadata } from './types';
import { 
  CheckSquare, 
  History, 
  DollarSign, 
  Building2, 
  HelpCircle, 
  PlayCircle, 
  Award, 
  GraduationCap, 
  FileText 
} from 'lucide-react';

export const CAPABILITIES_METADATA: Record<CapabilityId, CapabilityMetadata & { icon: any }> = {
  electronic_point: {
    id: 'electronic_point',
    label: 'Ponto Eletrônico & Diário',
    description: 'Captura imutável de horário por servidor e preenchimento obrigatório de diário.',
    category: 'attendance',
    icon: CheckSquare
  },
  replacement_queue: {
    id: 'replacement_queue',
    label: 'Fila de Reposições',
    description: 'Gestão de faltas de alunos/professores e reagendamento automático de reposições.',
    category: 'attendance',
    icon: History
  },
  financial: {
    id: 'financial',
    label: 'Módulo Financeiro',
    description: 'Gestão de mensalidades, fluxo de caixa e repasse financeiro a mentores.',
    category: 'financial',
    premium: true,
    icon: DollarSign
  },
  room_allocation: {
    id: 'room_allocation',
    label: 'Alocação de Salas',
    description: 'Integração de horários de turmas com as salas e espaços físicos da igreja.',
    category: 'academic',
    icon: Building2
  },
  quizzes: {
    id: 'quizzes',
    label: 'Quizzes & Avaliações',
    description: 'Questionários de múltipla escolha e redações avaliadas por IA ou professores.',
    category: 'academic',
    icon: HelpCircle
  },
  streaming: {
    id: 'streaming',
    label: 'TheoFlix (Vídeo EAD)',
    description: 'Publicação e reprodução das mídias das aulas no catálogo do TheoFlix.',
    category: 'media',
    icon: PlayCircle
  },
  certificates: {
    id: 'certificates',
    label: 'Emissão de Certificados',
    description: 'Geração automática de certificados de conclusão para alunos aprovados.',
    category: 'academic',
    icon: Award
  },
  grading: {
    id: 'grading',
    label: 'Boletim & Notas',
    description: 'Registro de notas pedagógicas e histórico escolar dos alunos.',
    category: 'academic',
    icon: GraduationCap
  },
  materials: {
    id: 'materials',
    label: 'Materiais & Apostilas',
    description: 'Upload e download de arquivos PDF e materiais didáticos para os alunos.',
    category: 'media',
    icon: FileText
  }
};

export function resolveEffectiveCapabilities(
  programCapabilities: CapabilityId[],
  courseCapabilitiesOverrides?: CapabilityId[],
  classCapabilitiesOverrides?: CapabilityId[]
): CapabilityId[] {
  let effective = [...programCapabilities];

  if (courseCapabilitiesOverrides) {
    effective = [...courseCapabilitiesOverrides];
  }

  if (classCapabilitiesOverrides) {
    effective = [...classCapabilitiesOverrides];
  }

  return Array.from(new Set(effective));
}
