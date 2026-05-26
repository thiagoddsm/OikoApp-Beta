'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function ZaiaCleanup() {
  const pathname = usePathname();

  useEffect(() => {
    // Se não estivermos na Home (/) ou no Chat (/chat), removemos os elementos do Neemias (Zaia)
    const isZaiaAllowedPage = pathname === '/' || pathname === '/chat';

    if (!isZaiaAllowedPage) {
      // 1. Remover o botão flutuante
      const fab = document.querySelector('#chatbot-fab');
      if (fab) {
        fab.remove();
      }

      // 2. Remover iframes do Zaia
      document.querySelectorAll('iframe').forEach(iframe => {
        if (iframe.src && iframe.src.includes('zaia.app')) {
          iframe.remove();
        }
      });

      // 3. Remover outros elementos injetados pelo widget da Zaia
      // Geralmente eles criam containers no final do body
      document.querySelectorAll('div').forEach(div => {
        // Se a classe ou ID contiver zaia ou endless
        if (
          (div.id && div.id.toLowerCase().includes('zaia')) ||
          (div.className && typeof div.className === 'string' && div.className.toLowerCase().includes('zaia'))
        ) {
          div.remove();
        }
      });

      // 4. Remover folhas de estilo ou scripts remanescentes
      document.querySelectorAll('link[href*="zaia.app"]').forEach(link => link.remove());
      document.querySelectorAll('script[src*="zaia.app"]').forEach(script => script.remove());
    }
  }, [pathname]);

  return null;
}
