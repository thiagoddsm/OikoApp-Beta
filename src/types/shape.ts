import { Timestamp } from 'firebase/firestore';

export interface ShapeTop3Item {
  id: string;
  nome: string;
  score: number;
  desc?: string;
}

export interface ShapeAiAnalysis {
  resumoServidor: string;
  areasRecomendadas: string[];
  alertas: string[];
  proximosPassos: string[];
  generatedAt: string; // ISO string após sanitize
}

export interface ShapeResult {
  id: string;
  userId: string | null;
  nome: string;
  email: string;
  telefone?: string;
  dataNascimento?: string;
  estadoCivil?: string;
  gcInfo?: string;
  formacao?: string;
  profissao?: string;
  habilidades: string[];
  coracao: Record<string, string>;
  perso: Record<string, number>;
  dom: Record<string, number>;
  quadrante: string; // ex: "Pessoas / Formal"
  orgScore: number;
  motScore: number;
  domScores: Record<string, number>;
  top3: ShapeTop3Item[];
  experiencias?: Record<string, string>;
  createdAt: string; // ISO string após sanitize
  aiAnalysis?: ShapeAiAnalysis | null;
}

export type ShapeQuadrante = 'Tarefas / Formal' | 'Tarefas / Informal' | 'Pessoas / Formal' | 'Pessoas / Informal';

export const QUADRANTE_META: Record<string, { label: string; emoji: string; color: string; bg: string; border: string }> = {
  'Tarefas / Formal': { label: 'Tarefas / Formal', emoji: '🎯', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  'Tarefas / Informal': { label: 'Tarefas / Informal', emoji: '⚡', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  'Pessoas / Formal': { label: 'Pessoas / Formal', emoji: '❤️', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
  'Pessoas / Informal': { label: 'Pessoas / Informal', emoji: '🤝', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
};

export const HABILIDADES_MAP: Record<string, { nome: string; icon: string }> = {
  s1: { nome: 'Construção Civil', icon: '🛠️' },
  s2: { nome: 'Tecnologia / TI', icon: '💻' },
  s3: { nome: 'Áudio e Vídeo', icon: '🎬' },
  s4: { nome: 'Design Gráfico', icon: '🎨' },
  s5: { nome: 'Contabilidade / Finanças', icon: '📊' },
  s6: { nome: 'Direito / Jurídico', icon: '⚖️' },
  s7: { nome: 'Saúde / Psicologia', icon: '🩺' },
  s8: { nome: 'Educação / Pedagogia', icon: '🎓' },
  s9: { nome: 'Culinária', icon: '🍳' },
  s10: { nome: 'Costura / Artesanato', icon: '🧵' },
  s11: { nome: 'Música / Instrumentos', icon: '🎵' },
  s12: { nome: 'Gestão / Administração', icon: '🗂️' },
  s13: { nome: 'Marketing / Redes Sociais', icon: '📱' },
  s14: { nome: 'Programação / Dev', icon: '⌨️' },
  s15: { nome: 'Edição de Vídeo', icon: '🎞️' },
  s16: { nome: 'Fotografia / Edição de Foto', icon: '📷' },
  s17: { nome: 'Criação de Cenários', icon: '🎭' },
  s18: { nome: 'Organização de Eventos', icon: '📅' },
  s19: { nome: 'Organização de Festas', icon: '🎈' },
  s20: { nome: 'Pintura / Artes', icon: '🖌️' },
  s21: { nome: 'Planilhas / Excel', icon: '📝' },
  s22: { nome: 'Manutenção / Elétrica', icon: '⚡' },
  s23: { nome: 'Redação / Copywriting', icon: '✍️' },
  s24: { nome: 'Transmissão / Streaming', icon: '🎥' },
  s25: { nome: 'Logística / Transporte', icon: '🚚' },
  s26: { nome: 'Mentoria / Aconselhamento', icon: '🤝' },
  s27: { nome: 'Atendimento / Recepção', icon: '👋' },
  s28: { nome: 'Tradução / Idiomas', icon: '🗣️' },
  s29: { nome: 'Operação de Áudio', icon: '🎧' },
  s30: { nome: 'Dança / Teatro', icon: '🩰' },
};
