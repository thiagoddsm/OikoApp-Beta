export type Member = {
  id: string;
  name: string;
  avatar: string;
  status: 'membro' | 'frequente' | 'visitante';
  lastSeen: string;
  absenceCount: number;
};

export type Leader = {
  id: string;
  name: string;
  avatar: string;
  cellName: string;
  lastReport: string;
  reportStatus: 'on-time' | 'late' | 'missing';
};

export const overviewData = {
  totalMembers: 125,
  avgAttendance: 98,
  newVisitors: 12,
  conversions: 4,
};

export const attendanceData = [
  { name: 'Sem 1', Total: 80 },
  { name: 'Sem 2', Total: 85 },
  { name: 'Sem 3', Total: 90 },
  { name: 'Sem 4', Total: 88 },
  { name: 'Sem 5', Total: 92 },
  { name: 'Sem 6', Total: 95 },
  { name: 'Sem 7', Total: 105 },
  { name: 'Sem 8', Total: 110 },
];

export const careAlerts: Member[] = [
  { id: '1', name: 'Ana Silva', avatar: 'avatar-1', status: 'membro', lastSeen: '2 semanas atrás', absenceCount: 2 },
  { id: '2', name: 'Carlos Souza', avatar: 'avatar-2', status: 'frequente', lastSeen: '3 semanas atrás', absenceCount: 3 },
  { id: '3', name: 'Mariana Costa', avatar: 'avatar-3', status: 'membro', lastSeen: '2 semanas atrás', absenceCount: 2 },
];

export const leaderActivity: Leader[] = [
  { id: 'l1', name: 'João Pereira', avatar: 'avatar-4', cellName: 'Conexão Jovem', lastReport: 'Ontem', reportStatus: 'on-time' },
  { id: 'l2', name: 'Beatriz Lima', avatar: 'avatar-5', cellName: 'Famílias Restauradas', lastReport: '3 dias atrás', reportStatus: 'late' },
  { id: 'l3', name: 'Ricardo Alves', avatar: 'avatar-6', cellName: 'Homens de Honra', lastReport: '8 dias atrás', reportStatus: 'missing' },
];

export const cellMembers: Member[] = [
    { id: '1', name: 'Ana Silva', avatar: 'avatar-1', status: 'membro', lastSeen: 'Presente', absenceCount: 0 },
    { id: '2', name: 'Carlos Souza', avatar: 'avatar-2', status: 'frequente', lastSeen: 'Presente', absenceCount: 0 },
    { id: '3', name: 'Mariana Costa', avatar: 'avatar-3', status: 'membro', lastSeen: 'Presente', absenceCount: 0 },
    { id: '4', name: 'Lucas Martins', avatar: 'avatar-4', status: 'membro', lastSeen: 'Presente', absenceCount: 0 },
    { id: '5', name: 'Sofia Oliveira', avatar: 'avatar-5', status: 'visitante', lastSeen: 'Presente', absenceCount: 0 },
];
