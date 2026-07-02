# Modelo de Associação de Membros a Células

## Status Atual: Opção B (`hierarchy.celulaId`)

Cada usuário carrega seu vínculo de célula no próprio perfil:

```
users/{userId} {
  hierarchy: {
    celulaId: "cell_abc",
    igrejaId: "church_xyz",   ← preparado para multi-igreja
    role: "membro" | "lider" | ...
  }
}
```

### Onde isso é usado
| Arquivo | Query |
|---|---|
| `gc/cells/[cellId]/page.tsx` | `users where hierarchy.celulaId == cellId` |
| `gc/cells/page.tsx` | `users where hierarchy.celulaId == cellId` |
| `gc/report/page.tsx` | `users where hierarchy.celulaId == cellId` |
| `gc/structure/page.tsx` | agrega counts via `membrosPorCelula` map |

### Índice necessário no Firestore
```
Collection: users
Fields: hierarchy.celulaId ASC, name ASC
```

---

## Próximo Passo: Opção C (Coleção `/memberships`)

Quando o sistema crescer para multi-igreja com usuários em múltiplos papéis,
migrar para uma coleção dedicada:

```
/memberships/{membershipId} {
  userId:    "user_abc",
  cellId:    "cell_xyz",
  churchId:  "church_123",    ← multi-tenância
  role:      "membro" | "lider" | "co_lider",
  joinedAt:  Timestamp,
  leftAt?:   Timestamp,       ← histórico de saída
  status:    "active" | "inactive"
}
```

### Vantagens da Opção C
- Usuário pode ser membro de uma célula **e** co-líder de outra
- Histórico completo de entrada/saída
- Multi-igreja nativa via `churchId`
- Queries bidirecionais: por célula OU por usuário
- Sem limite de membros por célula

### Queries equivalentes
```ts
// Membros de uma célula
query(collection(db, 'memberships'),
  where('cellId', '==', cellId),
  where('status', '==', 'active'))

// Células de um usuário
query(collection(db, 'memberships'),
  where('userId', '==', userId),
  where('status', '==', 'active'))
```

### Plano de migração
1. Criar coleção `memberships` populada a partir de `users.hierarchy.celulaId`
2. Atualizar escritas: `handleAddMember` → criar doc em `/memberships`
3. Atualizar leituras: trocar `where('hierarchy.celulaId', ...)` por query na coleção
4. Após validação: remover `hierarchy.celulaId` dos perfis de usuário

---

> **Nota:** O campo `cell.membros[]` foi **descontinuado** (Opção A).
> Não escrever nem ler dele em código novo.
