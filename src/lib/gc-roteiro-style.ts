/**
 * Utilitário de Estilização e Aprimoramento Visual para Roteiros de GC (IBM).
 * Garante contraste WCAG AAA, paleta editorial nobre e elimina problemas de legibilidade
 * (como texto escuro sobre fundo verde escuro em .moment-title e cabeçalhos de momentos).
 */

export const IBM_ROTEIRO_THEME_CSS = `
  <style id="ibm-roteiro-theme-enhancement">
    /* ========================================================
       IBM GC ROTEIRO — ELEVAÇÃO DE CORES & CONTRASTE (WCAG AAA)
       ======================================================== */
    
    /* 1. Faixas de Momentos (.moment-title, faixas verdes escuras) */
    .moment-title,
    .card .moment-title,
    div.moment-title,
    .bg-\\[\\#244735\\],
    [style*="#244735"],
    [style*="background-color: #244735"],
    [style*="background-color:#244735"],
    [style*="background:#244735"],
    [style*="#1e3a2b"],
    [style*="#1E3A2B"],
    [style*="#1a3325"],
    .momento-header-dark {
      background-color: #244735 !important;
      color: #FFFFFF !important;
      border-left: 5px solid #D99A28 !important;
      border-radius: 8px !important;
      padding: 12px 18px !important;
      margin-top: 28px !important;
      margin-bottom: 18px !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      box-shadow: 0 2px 8px rgba(36, 71, 53, 0.15) !important;
    }

    /* FORÇA TEXTO BRANCO PURO NO H3 E FILHOS DE .moment-title (SOBREPÕE .card h3) */
    .moment-title h1, .moment-title h2, .moment-title h3, .moment-title h4, .moment-title h5,
    .card .moment-title h1, .card .moment-title h2, .card .moment-title h3, .card .moment-title h4, .card .moment-title h5,
    div.moment-title h3,
    .card .moment-title *,
    .moment-title *,
    .bg-\\[\\#244735\\] h1, .bg-\\[\\#244735\\] h2, .bg-\\[\\#244735\\] h3, .bg-\\[\\#244735\\] h4, .bg-\\[\\#244735\\] h5,
    .bg-\\[\\#244735\\] p, .bg-\\[\\#244735\\] div,
    [style*="#244735"] h1, [style*="#244735"] h2, [style*="#244735"] h3, [style*="#244735"] h4, [style*="#244735"] h5,
    [style*="#244735"] p, [style*="#244735"] div,
    [style*="background-color: #244735"] h1, [style*="background-color: #244735"] h2, [style*="background-color: #244735"] h3,
    [style*="#1e3a2b"] h1, [style*="#1e3a2b"] h2, [style*="#1e3a2b"] h3 {
      color: #FFFFFF !important;
      font-weight: 700 !important;
      letter-spacing: -0.01em !important;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3) !important;
      margin: 0 !important;
      border: none !important;
    }

    /* Badges de duração (ex: 5 MIN, 10 MIN, 25 MIN) */
    .moment-title span,
    .card .moment-title span,
    .moment-title span:last-child,
    .card .moment-title span:last-child,
    .bg-\\[\\#244735\\] .badge-step,
    [style*="#244735"] .badge-step,
    .bg-\\[\\#244735\\] span[class*="rounded"],
    [style*="#244735"] span[class*="rounded"],
    [style*="#1e3a2b"] span[class*="rounded"] {
      background-color: rgba(255, 255, 255, 0.18) !important;
      color: #FDE68A !important;
      border: 1px solid rgba(253, 230, 138, 0.4) !important;
      font-weight: 700 !important;
      font-size: 0.78rem !important;
      padding: 3px 12px !important;
      border-radius: 9999px !important;
      letter-spacing: 0.04em !important;
      white-space: nowrap !important;
    }

    /* 2. Tipografia e Conteúdo dos Momentos */
    /* Títulos de Dinâmica, Sugestões e Perguntas */
    .dinamica-title,
    h4.dinamica,
    h4:has(+ ul),
    p strong:first-child {
      color: #1F2937;
    }

    /* Orientações Pastorais e Notas ao Facilitador em itálico */
    em, i, .orientacao-pastoral, .dica-facilitador {
      color: #64748B !important;
      font-style: italic;
    }

    /* 3. Colunas de A Palavra no Centro (Entender, Sentir, Agir) */
    .col-entender, [data-dimensao="entender"] {
      background-color: #F8FAFC !important;
      border: 1px solid #E2E8F0 !important;
      border-top: 3px solid #3B82F6 !important;
      border-radius: 12px !important;
    }
    .col-sentir, [data-dimensao="sentir"] {
      background-color: #FFFDF9 !important;
      border: 1px solid #FEF3C7 !important;
      border-top: 3px solid #D99A28 !important;
      border-radius: 12px !important;
    }
    .col-agir, [data-dimensao="agir"] {
      background-color: #F6FBF8 !important;
      border: 1px solid #D1FAE5 !important;
      border-top: 3px solid #10B981 !important;
      border-radius: 12px !important;
    }

    /* 4. Caixa de Destaque 'VERDADE DO TÓPICO' */
    .verdade-topico,
    [class*="verdade-do-topico"] {
      background: #F0FDF4 !important;
      border-left: 4px solid #059669 !important;
      border-radius: 0 12px 12px 0 !important;
      padding: 14px 18px !important;
    }
    .verdade-topico h5, .verdade-topico span:first-child {
      color: #065F46 !important;
      font-weight: 800 !important;
      letter-spacing: 0.05em !important;
      font-size: 0.75rem !important;
      text-transform: uppercase !important;
    }
    .verdade-topico p {
      color: #064E3B !important;
      font-weight: 600 !important;
    }

    /* 5. Material de Apoio ao Líder (#apoio) */
    #apoio, .apoio-lider {
      background-color: #1A241E !important;
      color: #E2E8F0 !important;
      border: 1px solid #2D3E33 !important;
      border-radius: 16px !important;
    }
    #apoio h2, #apoio h3, #apoio h4, .apoio-lider h2, .apoio-lider h3, .apoio-lider h4 {
      color: #FDE68A !important;
    }
    #apoio p, #apoio li, .apoio-lider p, .apoio-lider li {
      color: #CBD5E1 !important;
    }
    #apoio a, .apoio-lider a {
      color: #93C5FD !important;
    }
  </style>
`;

/**
 * Higieniza e aprimora as cores do HTML do roteiro de GC.
 * Garante que a folha de estilo oficial da IBM esteja sempre injetada
 * e corrige atributos inline e classes que possam gerar baixo contraste.
 */
export function enhanceGcRoteiroColors(html: string): string {
  if (!html) return html;

  let enhanced = html;

  // 1. Corrige max-heights de acordeões
  enhanced = enhanced
    .replace(/max-height:\s*1200px/gi, 'max-height: 15000px')
    .replace(/max-height:\s*1000px/gi, 'max-height: 15000px');

  // 2. Remove injeções antigas do tema se já existirem
  enhanced = enhanced.replace(/<style id="ibm-roteiro-theme-enhancement">[\s\S]*?<\/style>/gi, '');

  // 3. Injeta a folha de estilo IBM no <head>
  if (enhanced.includes('</head>')) {
    enhanced = enhanced.replace('</head>', `${IBM_ROTEIRO_THEME_CSS}\n</head>`);
  } else if (enhanced.includes('<body')) {
    enhanced = enhanced.replace('<body', `${IBM_ROTEIRO_THEME_CSS}\n<body`);
  } else {
    enhanced = IBM_ROTEIRO_THEME_CSS + '\n' + enhanced;
  }

  // 4. Substituição DIRETA no HTML para garantir estilo inline no h3 e no span de .moment-title
  // Isso resolve definitivamente qualquer herança indesejada de .card h3 { color: var(--text-color); }
  enhanced = enhanced.replace(
    /(<div[^>]*?class=["'][^"']*?moment-title[^"']*?["'][^>]*?>)([\s\S]*?)(<\/div>)/gi,
    (match: string, openDiv: string, content: string, closeDiv: string) => {
      let fixedContent = content
        // Força cor branca no h3
        .replace(/<h3([^>]*)style=["']([^"']*)["']([^>]*)>/gi, (_m: string, p1: string, style: string, p2: string) => {
          const cleanStyle = style.replace(/color:[^;]+;?/gi, '');
          return `<h3${p1}style="color: #FFFFFF !important; ${cleanStyle}"${p2}>`;
        })
        .replace(/<h3(?![^>]*style=)([^>]*)>/gi, '<h3$1 style="color: #FFFFFF !important;">')
        // Força cor dourada/âmbar no span de tempo
        .replace(/<span([^>]*)style=["']([^"']*)["']([^>]*)>/gi, (_m: string, p1: string, style: string, p2: string) => {
          const cleanStyle = style.replace(/color:[^;]+;?/gi, '').replace(/background[^;]+;?/gi, '');
          return `<span${p1}style="color: #FDE68A !important; background-color: rgba(255, 255, 255, 0.18) !important; ${cleanStyle}"${p2}>`;
        })
        .replace(/<span(?![^>]*style=)([^>]*)>/gi, '<span$1 style="color: #FDE68A !important; background-color: rgba(255, 255, 255, 0.18) !important; border-radius: 9999px; padding: 3px 10px; font-weight: 700; font-size: 0.78rem;">')
        // Remove classes de texto escuro
        .replace(/text-stone-\d+/g, 'text-white')
        .replace(/text-gray-\d+/g, 'text-white')
        .replace(/text-slate-\d+/g, 'text-white');

      // Garante estilo inline no container .moment-title
      let fixedOpenDiv = openDiv;
      if (!fixedOpenDiv.includes('style=')) {
        fixedOpenDiv = fixedOpenDiv.replace('>', ' style="background-color: #244735 !important; border-left: 5px solid #D99A28 !important; color: #FFFFFF !important;">');
      } else {
        fixedOpenDiv = fixedOpenDiv.replace(/style=["']([^"']*)["']/i, (_m: string, s: string) => {
          const clean = s.replace(/background-color:[^;]+;?/gi, '').replace(/border-left:[^;]+;?/gi, '');
          return `style="${clean}; background-color: #244735 !important; border-left: 5px solid #D99A28 !important; color: #FFFFFF !important;"`;
        });
      }

      return `${fixedOpenDiv}${fixedContent}${closeDiv}`;
    }
  );

  // 5. Correção também para faixas com fundo verde escuro sem a classe .moment-title
  enhanced = enhanced.replace(
    /(<div[^>]*?(?:bg-\[\#244735\]|#244735|#1e3a2b)[^>]*?>)([\s\S]*?)(<\/div>)/gi,
    (match: string, openTag: string, content: string, closeTag: string) => {
      if (!content.includes('<div')) {
        let fixedContent = content
          .replace(/<h3(?![^>]*style=)([^>]*)>/gi, '<h3$1 style="color: #FFFFFF !important;">')
          .replace(/text-stone-\d+/g, 'text-white')
          .replace(/text-gray-\d+/g, 'text-white')
          .replace(/text-slate-\d+/g, 'text-white');
        return `${openTag}${fixedContent}${closeTag}`;
      }
      return match;
    }
  );

  return enhanced;
}
