import { TeachingProgram } from '../programs/types';

export const INITIAL_IBM_PROGRAMS: TeachingProgram[] = [
  {
    id: 'wave',
    module: 'teaching',
    slug: 'wave',
    name: 'Wave - Escola de Música',
    description: 'Formação prática e mentoria de instrumentos musicais',
    icon: 'Music2',
    color: '#6366f1',
    capabilities: [
      'electronic_point',
      'replacement_queue',
      'room_allocation',
      'financial'
    ],
    attendanceMode: 'electronic',
    order: 1
  },
  {
    id: 'dis',
    module: 'teaching',
    slug: 'dis',
    name: 'DIS - Curso de Libras',
    description: 'Capacitação prática em Língua Brasileira de Sinais',
    icon: 'Hand',
    color: '#06b6d4',
    capabilities: [
      'electronic_point',
      'replacement_queue',
      'room_allocation',
      'materials'
    ],
    attendanceMode: 'electronic',
    order: 2
  },
  {
    id: 'lumine',
    module: 'teaching',
    slug: 'lumine',
    name: 'Lumine - Formação Espiritual',
    description: 'Trilhos de desenvolvimento bíblico, teológico e discipulado',
    icon: 'BookOpen',
    color: '#eab308',
    capabilities: [
      'quizzes',
      'materials',
      'certificates',
      'streaming'
    ],
    attendanceMode: 'manual',
    order: 3
  },
  {
    id: 'ministerial',
    module: 'teaching',
    slug: 'ministerial',
    name: 'Cursos Ministeriais',
    description: 'Formação para famílias, casais (Twogether), noivos e liderança',
    icon: 'HeartHandshake',
    color: '#ec4899',
    capabilities: [
      'materials',
      'certificates'
    ],
    attendanceMode: 'manual',
    order: 4
  },
  {
    id: 'theoflix',
    module: 'teaching',
    slug: 'theoflix',
    name: 'TheoFlix (Streaming EAD)',
    description: 'Plataforma de ensino em vídeo sob demanda e cursos online',
    icon: 'PlayCircle',
    color: '#8b5cf6',
    capabilities: [
      'streaming',
      'quizzes',
      'certificates',
      'materials'
    ],
    attendanceMode: 'automatic',
    order: 5
  }
];
