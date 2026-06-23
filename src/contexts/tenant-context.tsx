'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type TenantContextType = {
  tenantId: string;
  setTenantId: (id: string) => void;
};

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  // Inicializamos com o tenant padrão fixo que criamos no script de backfill.
  // Futuramente isso será inferido a partir do AuthContext ou do subdomínio.
  const [tenantId, setTenantId] = useState<string>('w3m93SHQeBRhiDnt7208');

  return (
    <TenantContext.Provider value={{ tenantId, setTenantId }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
