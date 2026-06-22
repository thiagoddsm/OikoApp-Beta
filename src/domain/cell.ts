export type Cell = { 
  id: string; 
  nome: string; 
  liderId: string; 
  areaId: string; 
  redeId: string; 
  membros: string[]; 
  tenantId?: string;
};

export type Area = { 
  id: string; 
  nome: string; 
  liderId: string; 
  redeId: string; 
  tenantId?: string;
};

export type Rede = { 
  id: string; 
  nome: string; 
  liderId: string; 
  pastorId: string; 
  tenantId?: string;
};
