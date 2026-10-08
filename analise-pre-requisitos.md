# Análise: Verificação de Pré-requisitos nas Solicitações de Curso

**O Problema Relatado:**
Atualmente, qualquer pessoa pode solicitar inscrição em qualquer curso através do link público. Quando essas solicitações chegam no painel ("Solicitações"), a equipe não consegue saber visualmente se o aluno já foi aprovado no ciclo anterior (pré-requisito). O Breno apontou a necessidade de exibir essa informação (curso anterior e frequência) para que a equipe possa decidir se aprova o aluno ou se abre uma exceção.

---

### 1. Viabilidade Técnica: É possível fazer isso?
**Sim, totalmente viável!** 
Nossa estrutura atual de banco de dados e arquitetura já suporta tudo o que precisamos para trazer essa informação para a tela de aprovação sem precisar de grandes malabarismos.

**Como os dados estão estruturados hoje:**
1. **O Pré-requisito:** Os cursos já possuem um campo `prerequisiteCourseId`. Ou seja, o sistema sabe que para fazer o *Crescer*, por exemplo, é necessário ter feito o *Pertencer*.
2. **O Aluno:** Quando alguém faz a solicitação, temos o email/telefone da pessoa. Conseguimos cruzar isso para encontrar o ID desse aluno no sistema.
3. **O Histórico:** O sistema já salva no perfil do aluno (na árvore `journey.courseStatus`) os cursos em que ele já foi `approved` (aprovado). Além disso, todas as frequências ficam gravadas nas listas de presença (`attendance` nas coleções de turmas - `classes`).

---

### 2. A Solução Proposta

Como o Breno mencionou a frase *"para decidirmos se ainda assim vamos aprovar ou não"*, **não devemos criar uma trava rígida (hard lock)** no formulário público impedindo a inscrição. A flexibilidade de abrir exceções é importante.

A solução ideal é enriquecer a tabela do componente `enrollment-requests-list.tsx` no Painel da Academia Lumine:

*   **Nova Coluna "Histórico / Pré-requisito":** Ao lado da coluna "Curso Desejado", adicionaremos essa nova coluna.
*   **Inteligência Automática:** Para cada solicitação, o sistema fará o seguinte cruzamento automático:
    1. Identifica qual é o curso desejado.
    2. Verifica qual é o curso pré-requisito (ex: *Pertencer*).
    3. Busca o cadastro do interessado.
    4. Procura o histórico do aluno na turma daquele pré-requisito e calcula a frequência.
*   **Visualização:** O coordenador verá tags coloridas e informativas:
    *   🟢 **Aprovado em [Curso Anterior] (Frequência: 100%)**
    *   🔴 **Reprovado em [Curso Anterior] (Frequência: 40%)**
    *   🟡 **Pendente/Não cursou [Curso Anterior]**

Dessa forma, o coordenador bate o olho na tabela e sabe imediatamente se clica no ✅ (Aprovar) ou se descarta a solicitação, ou até se aprova mesmo reprovado assumindo a exceção.

---

### 3. Próximo Passo

Posso implementar essa melhoria imediatamente! O processo envolverá:
1. Buscar e importar a lista de `users` (alunos) para dentro daquele componente.
2. Criar a lógica que calcula o status do pré-requisito baseado nas presenças passadas.
3. Atualizar o layout da tabela para exibir as badges com a frequência.

Podemos seguir com a implementação dessa funcionalidade no Painel?
