# Plano de Transição Segura: Curso Pertencer (De 4 para 12 Aulas)

Alterar a carga horária de um curso "core" (como o de membresia) exige muito cuidado. A principal regra de ouro nesse cenário é **nunca alterar a ementa do curso original que já possui alunos formados**.

Se simplesmente adicionarmos 8 aulas ao curso atual, o sistema entenderá que o curso *sempre* teve 12 aulas. Isso fará com que o sistema recalcule a porcentagem de todos os membros antigos, rebaixando a frequência deles de 100% (4/4) para 33% (4/12). Isso poderia desconfigurar dashboards e gerar riscos na validação de quem é membro.

Abaixo está o plano estruturado e 100% seguro para realizar essa alteração sem impacto nos membros atuais.

---

### Passo 1: Congelar o Histórico (Versionamento)
Não edite a ementa (syllabus) do curso Pertencer existente. O que faremos é "arquivá-lo" ativamente:
1. Acesse o **Painel Administrativo > Academia Lumine > Cursos**.
2. Edite o curso "Pertencer" atual.
3. Mude o nome dele para **"Pertencer (Legado)"** ou **"Pertencer (V1)"**.
4. Mantenha ele exatamente com as 4 aulas.

**Por que isso é seguro?** 
Todo o histórico de chamadas, faltas e aprovações dos alunos antigos está amarrado a esse ID de curso. Ao mantê-lo intacto com 4 módulos, a taxa de conclusão dos membros atuais permanece em 100%.

### Passo 2: Criar a Nova Versão
1. No mesmo painel, clique em **Criar Novo Curso**.
2. Nomeie como **"Pertencer"** (esse será o curso oficial daqui para frente).
3. Adicione os **12 módulos/aulas** completos na ementa.
4. Configure as exigências de aprovação (ex: 75% de presença).

**E a Inteligência de Membresia do Sistema?** 
Nosso código atual possui uma função chamada `isMembershipCourse`. Ela é inteligente e escaneia automaticamente cursos que tenham a palavra *"Pertencer"* ou *"Membros"* no título. 
Isso significa que **ambos os cursos** (o Legado e o Novo) serão reconhecidos pelo sistema como portas de entrada oficiais para a membresia da igreja. O membro antigo usará a aprovação do curso Legado, e o novo usará a aprovação do curso Novo. Ninguém perde o status.

### Passo 3: Transição Prática de Turmas
1. **Turmas em Andamento:** Se existir alguma turma do Pertencer rodando agora nas semanas finais de 4 aulas, deixe-os terminar e os aprove no curso Legado.
2. **Novas Turmas:** Quando for abrir a próxima turma de 12 aulas, crie a turma vinculando-a obrigatoriamente ao curso recém-criado.
3. **Inscrições Públicas:** Ao divulgar as inscrições, elas automaticamente vão cair para a turma conectada ao novo curso.

---

### Resumo dos Impactos e Mitigações

| Risco Potencial | Mitigação no Plano |
| :--- | :--- |
| **Membros antigos perderem o status de membro** | Evitado. Eles continuarão sendo membros pois foram aprovados no curso "Pertencer (Legado)", que o sistema ainda reconhece. |
| **Porcentagem de presença de turmas passadas quebrar** | Evitado. O curso Legado manterá a base de cálculo sobre 4 módulos permanentemente. |
| **Conflito de solicitações pendentes** | Qualquer aluno aguardando na fila deve ser alocado na nova turma do novo curso. Se houver solicitações velhas pendentes, basta recusá-las com a nota de redirecionamento. |

Este plano resolve o seu problema 100% via painel, sem necessitar de reescrita de banco de dados ou migrações complexas de código.
