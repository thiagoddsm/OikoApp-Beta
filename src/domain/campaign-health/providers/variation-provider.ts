export interface TextVariation {
  id: string;
  label: string; // "Versão A", "Versão B"
  text: string;
}

export interface VariationProvider {
  name: string;
  generateVariations(originalText: string, count: number): Promise<TextVariation[]>;
}

export const SpintaxVariationProvider: VariationProvider = {
  name: 'Spintax Local Provider',
  async generateVariations(originalText: string, count: number): Promise<TextVariation[]> {
    const openings = [
      'Boa tarde, {{nome}}! Tudo bem?',
      'Olá, {{nome}}! Que a paz esteje com você.',
      'Paz do Senhor, {{nome}}! Esperamos que esteja bem.',
      'Olá, {{nome}}! Passando por aqui para falar com você.',
      'Oi, {{nome}}! Tudo certo por aí?'
    ];

    const bodyPrefixes = [
      'Estamos entrando em contato para',
      'Escrevemos para lembrar você de',
      'Passando aqui para solicitar que você possa',
      'Gostaríamos de pedir um minutinho da sua atenção para',
      'Temos um lembrete importante para'
    ];

    const closings = [
      'Deus abençoe grandemente seu dia!',
      'Qualquer dúvida, estamos à disposição por aqui.',
      'Um abraço de toda a equipe da igreja!',
      'Que Deus abençoe a sua semana!',
      'Fique na paz!'
    ];

    const variations: TextVariation[] = [];

    // Preservar Versão Original como A
    variations.push({
      id: 'var-a',
      label: 'Versão A (Original)',
      text: originalText
    });

    // Limpar saudações existentes para substituir nas alternativas
    let cleanBody = originalText
      .replace(/^(boa tarde|olá|paz do senhor|oi|graça e paz)[^.!?]*[.!?]/gi, '')
      .trim();

    if (!cleanBody) cleanBody = originalText;

    const labels = ['Versão B', 'Versão C', 'Versão D', 'Versão E'];

    for (let i = 0; i < count - 1; i++) {
      const open = openings[(i + 1) % openings.length];
      const prefix = bodyPrefixes[i % bodyPrefixes.length];
      const close = closings[i % closings.length];

      let generatedText = `${open}\n\n${cleanBody}\n\n${close}`;
      variations.push({
        id: `var-${String.fromCharCode(98 + i)}`,
        label: labels[i] || `Versão ${i + 2}`,
        text: generatedText
      });
    }

    return variations;
  }
};
