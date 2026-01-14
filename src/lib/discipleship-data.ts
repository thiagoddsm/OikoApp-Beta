// Data structure for discipleship phases and their questions
export const discipleshipPhasesData = [
  { id: 'novo_convertido', title: 'Novo Convertido', questions: [
      { id: 'contact_attempt_1', label: 'Primeiro contato' },
      { id: 'contact_attempt_2', label: 'Segundo contato' },
      { id: 'contact_attempt_3', label: 'Terceiro contato' },
      { id: 'contact_success', label: 'Contato com sucesso' },
      { id: 'contact_fail', label: 'Contato sem sucesso' },
      { id: 'leader_contacted_visitor', label: 'O líder entrou em contato com o visitante?' },
      { id: 'visitor_attended_gc', label: 'O visitante foi ao GC?' },
    ],
  },
  { id: 'reconciliado', title: 'Reconciliado', questions: [
      { id: 'contact_attempt_1', label: 'Primeiro contato' },
      { id: 'contact_attempt_2', label: 'Segundo contato' },
      { id: 'contact_attempt_3', label: 'Terceiro contato' },
      { id: 'contact_success', label: 'Contato com sucesso' },
      { id: 'contact_fail', label: 'Contato sem sucesso' },
      { id: 'leader_contacted_visitor', label: 'O líder entrou em contato com o visitante?' },
      { id: 'visitor_attended_gc', label: 'O visitante foi ao GC?' },
    ],
  },
  { id: 'transferido', title: 'Transferido', questions: [
      { id: 'contact_attempt_1', label: 'Primeiro contato' },
      { id: 'contact_attempt_2', label: 'Segundo contato' },
      { id: 'contact_attempt_3', label: 'Terceiro contato' },
      { id: 'contact_success', label: 'Contato com sucesso' },
      { id: 'contact_fail', label: 'Contato sem sucesso' },
      { id: 'leader_contacted_visitor', label: 'O líder entrou em contato com o visitante?' },
      { id: 'visitor_attended_gc', label: 'O visitante foi ao GC?' },
    ],
  },
  { id: 'membro', title: 'Membro', questions: [
       { id: 'spiritual_gifts_test', label: 'Realizou o teste de dons espirituais?' },
       { id: 'ministry_interest', label: 'Demonstrou interesse em servir em algum ministério?' },
    ],
  },
  { id: 'consolidado', title: 'Consolidado', questions: [
       { id: 'td_started', label: 'Iniciou o Trilho do Crescimento (TD)?' },
       { id: 'discipleship_1_on_1_started', label: 'Iniciou discipulado um a um?' },
    ],
  },
  { id: 'lider_treinamento', title: 'Líder em Treinamento', questions: [
      { id: 'co_leading_gc', label: 'Está co-liderando reuniões do GC?' },
      { id: 'mentoring_new_member', label: 'Está discipulando um novo membro?' },
    ],
  },
   { id: 'lider_gc', title: 'Líder de GC', questions: [
      { id: 'leadership_feedback_1', label: 'Primeiro feedback de liderança realizado com supervisor?' },
      { id: 'multiplication_plan_set', label: 'Plano de multiplicação da célula definido?' },
    ],
  },
];
