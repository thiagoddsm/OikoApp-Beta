'use client';

import React from 'react';
import { UnderConstruction } from '@/components/common/under-construction';

/**
 * Página principal do Briefing Pro.
 * Atualmente sinalizada como em construção enquanto a lógica de roteiros profissionais é finalizada.
 */
export default function BriefingProPage() {
  return (
    <UnderConstruction 
      pageTitle="Briefing Pro" 
      pageDescription="Ferramenta profissional para roteiros de culto, cronometragem de palco e coordenação de eventos em tempo real."
    />
  );
}
