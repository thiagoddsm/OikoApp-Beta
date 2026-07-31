'use client';

import { useEffect } from 'react';

// Timestamp da versão atual da build para invalidação global de cache
export const CURRENT_APP_VERSION = '2026-07-31-v3-beta';

export function SystemCacheCleaner() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storedVersion = localStorage.getItem('oiko_app_version');

      // Se a versão no navegador do usuário for diferente da versão atual da build
      if (storedVersion !== CURRENT_APP_VERSION) {
        console.log(`[CacheBuster] Nova versão detectada (${CURRENT_APP_VERSION}). Purgando cache do usuário...`);

        // 1. Limpa CacheStorage (PWA e recursos estáticos armazenados)
        if ('caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => {
              caches.delete(name);
            });
          });
        }

        // 2. Desregistra Service Workers antigos caso existam
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (const registration of registrations) {
              registration.unregister();
            }
          });
        }

        // 3. Atualiza a versão registrada no navegador do usuário
        localStorage.setItem('oiko_app_version', CURRENT_APP_VERSION);
      }
    } catch (e) {
      console.warn('[CacheBuster] Erro ao verificar versão do cache:', e);
    }
  }, []);

  return null;
}

// Função utilitária para forçar a limpeza manual de cache sob demanda
export async function forcePurgeUserCache() {
  if (typeof window === 'undefined') return;

  try {
    // 1. Limpar Caches da Cache API
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }

    // 2. Desregistrar Service Workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
    }

    // 3. Atualizar versão
    localStorage.setItem('oiko_app_version', CURRENT_APP_VERSION);

    // 4. Forçar recarregamento ignorando o cache do navegador
    window.location.reload();
  } catch (err) {
    console.error('Erro ao purgar cache:', err);
    window.location.reload();
  }
}
