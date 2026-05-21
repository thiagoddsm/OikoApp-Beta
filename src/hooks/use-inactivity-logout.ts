'use client';

import { useEffect, useRef, useCallback } from 'react';
import { signOut, Auth } from 'firebase/auth';

const STORAGE_KEY = 'oiko_last_activity';

/**
 * Hook de logout por inatividade.
 * @param auth - Instância do Firebase Auth
 * @param inactivityHours - Horas de inatividade antes do logout (padrão: 8h)
 */
export function useInactivityLogout(auth: Auth | null, inactivityHours = 8) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inactivityMs = inactivityHours * 60 * 60 * 1000;

  const logout = useCallback(async () => {
    if (!auth?.currentUser) return;
    localStorage.removeItem(STORAGE_KEY);
    try {
      await signOut(auth);
    } catch (e) {
      console.error('[InactivityLogout] Erro ao fazer logout:', e);
    }
  }, [auth]);

  const resetTimer = useCallback(() => {
    // Atualiza o timestamp de última atividade no localStorage
    localStorage.setItem(STORAGE_KEY, Date.now().toString());

    // Reinicia o timer local
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(logout, inactivityMs);
  }, [logout, inactivityMs]);

  useEffect(() => {
    if (!auth) return;

    // Verifica se já expirou desde a última vez que a página estava aberta
    const lastActivity = localStorage.getItem(STORAGE_KEY);
    if (lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity, 10);
      if (elapsed >= inactivityMs) {
        logout();
        return;
      }
      // Agenda o tempo restante
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(logout, inactivityMs - elapsed);
    } else {
      // Primeira vez — registra agora
      resetTimer();
    }

    // Eventos que indicam atividade do usuário
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    
    // Debounce: só atualiza no localStorage a cada 60s para não sobrecarregar
    let lastUpdate = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastUpdate > 60_000) {
        lastUpdate = now;
        resetTimer();
      }
    };

    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));

    // Quando outra aba atualiza o localStorage, sincroniza
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        if (timerRef.current) clearTimeout(timerRef.current);
        const remaining = inactivityMs - (Date.now() - parseInt(e.newValue, 10));
        if (remaining <= 0) {
          logout();
        } else {
          timerRef.current = setTimeout(logout, remaining);
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    // Verifica ao voltar para a aba (visibilitychange)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && Date.now() - parseInt(stored, 10) >= inactivityMs) {
          logout();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(e => window.removeEventListener(e, handleActivity));
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [auth, inactivityMs, resetTimer, logout]);
}
