import { getAdminDb } from '@/lib/firebase-admin';
import { FilterRuleBlock, MembershipBoardConfig } from '@/types/membership-board-types';

export interface ProcessedPersonResult {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  membershipStatus?: string;
  gender?: string;
  age?: number;
  cellName?: string;
  matchedCategories: string[];
}

export class QueryBuilderEngine {
  /**
   * Processa as regras de um Quadro Dinâmico e retorna os membros filtrados + contagem total.
   */
  static async executeQuery(
    boardConfig: MembershipBoardConfig,
    tenantId?: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ totalCount: number; people: ProcessedPersonResult[] }> {
    const db = getAdminDb();

    // 1. Carregar todos os usuários/membros ativos do tenant (base primária)
    let usersQuery: any = db.collection('users');
    if (tenantId) {
      usersQuery = usersQuery.where('tenantId', '==', tenantId) as any;
    }
    const usersSnap = await usersQuery.get();
    
    if (usersSnap.empty) {
      return { totalCount: 0, people: [] };
    }

    const allUsers: any[] = usersSnap.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Se não houver regras, retorna todos
    if (!boardConfig.rules || boardConfig.rules.length === 0) {
      const people = allUsers.map(u => this.formatPerson(u, ['membresia']));
      return {
        totalCount: people.length,
        people: options?.limit ? people.slice(options.offset || 0, (options.offset || 0) + options.limit) : people,
      };
    }

    // 2. Carregar coleções auxiliares em cache de memória para cruzamento ultra-rápido
    const [eventsSnap, tuitionFeesSnap, classesSnap, cellsSnap, volunteersSnap] = await Promise.all([
      db.collection('event_registrations').get().catch(() => ({ empty: true, docs: [] } as any)),
      db.collection('tuition_fees').get().catch(() => ({ empty: true, docs: [] } as any)),
      db.collection('classes').get().catch(() => ({ empty: true, docs: [] } as any)),
      db.collection('cells').get().catch(() => ({ empty: true, docs: [] } as any)),
      db.collection('volunteers').get().catch(() => ({ empty: true, docs: [] } as any)),
    ]);

    const eventRegistrations = eventsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    const tuitionFees = tuitionFeesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    const classes = classesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    const cells = cellsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    const volunteers = volunteersSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    // 3. Filtrar usuários pessoa por pessoa aplicando a álgebra booleana das regras
    const filteredPeople: ProcessedPersonResult[] = [];

    for (const user of allUsers) {
      let isMatch = true;
      const matchedCats = new Set<string>();

      for (let i = 0; i < boardConfig.rules.length; i++) {
        const rule = boardConfig.rules[i];
        const ruleMatches = this.evaluateRuleForUser(user, rule, {
          eventRegistrations,
          tuitionFees,
          classes,
          cells,
          volunteers,
        });

        // Aplica a lógica de negação (isNegated)
        // Se isNegated === true: inverter o resultado da regra
        const finalRuleMatch = rule.isNegated ? !ruleMatches : ruleMatches;

        if (finalRuleMatch) {
          matchedCats.add(rule.category);
        }

        if (i === 0) {
          isMatch = finalRuleMatch;
        } else {
          // Pela Lei de De Morgan: Para blocos de EXCLUSÃO (isNegated = true), a combinação de EXCLUIR A OU EXCLUIR B 
          // significa que a pessoa NÃO pode atender a A E NÃO pode atender a B (interseção estrita de exclusão).
          if (rule.isNegated) {
            isMatch = isMatch && finalRuleMatch;
          } else if (rule.logicalOperator === 'OR') {
            isMatch = isMatch || finalRuleMatch;
          } else {
            isMatch = isMatch && finalRuleMatch;
          }
        }
      }

      if (isMatch) {
        filteredPeople.push(this.formatPerson(user, Array.from(matchedCats)));
      }
    }

    const totalCount = filteredPeople.length;
    const paginatedPeople = options?.limit
      ? filteredPeople.slice(options.offset || 0, (options.offset || 0) + options.limit)
      : filteredPeople;

    return { totalCount, people: paginatedPeople };
  }

  /**
   * Avalia uma única regra contra uma pessoa.
   */
  private static evaluateRuleForUser(
    user: any,
    rule: FilterRuleBlock,
    context: {
      eventRegistrations: any[];
      tuitionFees: any[];
      classes: any[];
      cells: any[];
      volunteers: any[];
    }
  ): boolean {
    const { category, field, operator, value } = rule;

    switch (category) {
      case 'membresia': {
        const userValue = user[field];
        return this.compareValues(userValue, operator, value);
      }

      case 'eventos': {
        // Busca inscrições do usuário em eventos
        const userEvents = context.eventRegistrations.filter(
          e => e.userId === user.id || e.email?.toLowerCase() === user.email?.toLowerCase()
        );

        if (userEvents.length === 0) return false;

        if (field === 'eventId') {
          return userEvents.some(e => this.compareValues(e.eventId, operator, value));
        }
        if (field === 'status') {
          return userEvents.some(e => this.compareValues(e.payment?.status || e.status, operator, value));
        }
        return userEvents.length > 0;
      }

      case 'ensino': {
        // Busca turmas em que o aluno está inscrito
        const userClasses = context.classes.filter(
          c => Array.isArray(c.students) && c.students.includes(user.id)
        );
        // E buscas de cobranças de mensalidades
        const userFees = context.tuitionFees.filter(
          f => f.studentId === user.id || f.email?.toLowerCase() === user.email?.toLowerCase()
        );

        if (field === 'courseId') {
          return userClasses.some(c => this.compareValues(c.courseId, operator, value));
        }
        if (field === 'classId') {
          return userClasses.some(c => this.compareValues(c.id, operator, value));
        }
        if (field === 'paymentStatus') {
          return userFees.some(f => this.compareValues(f.status, operator, value));
        }
        return userClasses.length > 0;
      }

      case 'pequenos_grupos': {
        // Encontra todas as células vinculadas a esta pessoa (como membro, celulaId, hierarchy ou liderança)
        const userCellId = user.cellId || user.hierarchy?.celulaId || user.gcId;
        const linkedCell = userCellId ? context.cells.find(c => c.id === userCellId) : null;

        const userCells = context.cells.filter(cell => 
          cell.id === userCellId ||
          cell.leaderId === user.id ||
          cell.liderId === user.id ||
          cell.leaderId1 === user.id ||
          cell.leaderId2 === user.id ||
          cell.viceLeaderId === user.id ||
          cell.hostId === user.id ||
          cell.anfitriaoId === user.id ||
          (Array.isArray(cell.leaders) && cell.leaders.includes(user.id)) ||
          (Array.isArray(cell.coLeaders) && cell.coLeaders.includes(user.id)) ||
          (Array.isArray(cell.members) && cell.members.includes(user.id))
        );

        const isInAnyCell = userCells.length > 0 || (!!linkedCell);

        // 1. Filtro Geral: "Participa de Algum GC (Sim / Não)"
        if (field === 'in_cell' || field === 'hasCell' || field === 'inCell') {
          if (operator === 'is_active') {
            return isInAnyCell;
          }
          if (operator === 'equals') {
            const isTargetYes = String(value).toLowerCase() === 'sim' || String(value).toLowerCase() === 'true' || String(value).toLowerCase() === 'ativo';
            return isTargetYes ? isInAnyCell : !isInAnyCell;
          }
          return isInAnyCell;
        }

        // 2. Filtro por Rede do GC
        if (field === 'redeId') {
          return userCells.some(cell => this.compareValues(cell.redeId, operator, value));
        }

        // 3. Filtro por Área do GC
        if (field === 'areaId') {
          return userCells.some(cell => this.compareValues(cell.areaId, operator, value));
        }

        // 4. Filtro por GC / Célula específica
        if (field === 'cellId') {
          if (userCellId && this.compareValues(userCellId, operator, value)) return true;
          return userCells.some(cell => this.compareValues(cell.id, operator, value) || this.compareValues(cell.nome || cell.name, operator, value));
        }

        // 5. Filtro por Cargo no GC (Líder / Vice / Anfitrião / Membro Regular)
        if (field === 'role') {
          // Se a pessoa NÃO está em nenhum GC, ela não possui cargo no GC
          if (!isInAnyCell) {
            return operator === 'not_equals';
          }

          const valStr = String(value || '').toLowerCase();
          const isTargetLider = valStr.includes('lider') || valStr.includes('líder');
          const isTargetVice = valStr.includes('vice');
          const isTargetAnfitriao = valStr.includes('anfitriao') || valStr.includes('anfitrião');
          const isTargetMembro = valStr.includes('membro');

          const userIsLeaderInCell = userCells.some(cell => {
            const mainLeaderId = cell.leaderId || cell.liderId || cell.leaderId1;
            
            // 1. Checagem direta de IDs dos Líderes Titulares e Casal Líder Titular
            if (
              cell.leaderId === user.id ||
              cell.liderId === user.id ||
              cell.leaderId1 === user.id ||
              cell.leaderId2 === user.id ||
              cell.liderCasalId === user.id ||
              cell.leaderCasalId === user.id ||
              cell.spouseLeaderId === user.id
            ) return true;

            // 2. Checagem de cônjuge no perfil do usuário se o parceiro for o líder principal da célula
            if (user.spouseId && mainLeaderId && (user.spouseId === mainLeaderId || user.casalId === mainLeaderId)) return true;
            if (user.casalId && mainLeaderId && (user.casalId === mainLeaderId || user.spouseId === mainLeaderId)) return true;

            return false;
          });

          const userIsViceInCell = userCells.some(cell => 
            cell.viceLeaderId === user.id ||
            (Array.isArray(cell.coLeaders) && cell.coLeaders.includes(user.id)) ||
            (Array.isArray(cell.coLideres) && cell.coLideres.some((cl: any) => cl.id === user.id || cl.casalId === user.id))
          );

          const userIsAnfitriaoInCell = userCells.some(cell => 
            cell.hostId === user.id || cell.anfitriaoId === user.id
          );

          const userRole = String(user.cellRole || user.hierarchy?.role || user.role || '').toLowerCase();

          if (isTargetLider) {
            const isMatch = userIsLeaderInCell || userRole.includes('lider') || userRole.includes('líder') || user.isLeader === true;
            return operator === 'not_equals' ? !isMatch : isMatch;
          }
          if (isTargetVice) {
            const isMatch = userIsViceInCell || userRole.includes('vice');
            return operator === 'not_equals' ? !isMatch : isMatch;
          }
          if (isTargetAnfitriao) {
            const isMatch = userIsAnfitriaoInCell || userRole.includes('anfitriao') || userRole.includes('anfitrião');
            return operator === 'not_equals' ? !isMatch : isMatch;
          }
          if (isTargetMembro) {
            const isLeaderOrViceOrHost = userIsLeaderInCell || userIsViceInCell || userIsAnfitriaoInCell || userRole.includes('lider') || userRole.includes('líder') || user.isLeader === true;
            const isMatch = !isLeaderOrViceOrHost;
            return operator === 'not_equals' ? !isMatch : isMatch;
          }

          return this.compareValues(user.cellRole || user.hierarchy?.role || 'membro', operator, value);
        }

        return isInAnyCell;
      }

      case 'ministerios': {
        const userVolunteers = context.volunteers.filter(
          v => v.userId === user.id || v.personId === user.id
        );
        if (field === 'ministryId') {
          return userVolunteers.some(v => this.compareValues(v.ministryId || v.departmentId, operator, value));
        }
        return userVolunteers.length > 0;
      }

      case 'financeiro': {
        const userFees = context.tuitionFees.filter(
          f => f.studentId === user.id || f.email?.toLowerCase() === user.email?.toLowerCase()
        );
        if (field === 'status') {
          return userFees.some(f => this.compareValues(f.status, operator, value));
        }
        if (field === 'isDizimista') {
          return this.compareValues(user.isDizimista ?? false, operator, value);
        }
        return userFees.length > 0;
      }

      case 'discipulado': {
        if (field === 'hasDiscipulador') {
          return this.compareValues(!!user.discipuladorId, operator, value);
        }
        if (field === 'isDiscipulador') {
          return this.compareValues(!!user.isDiscipulador, operator, value);
        }
        return !!user.discipuladorId;
      }

      default:
        return false;
    }
  }

  /**
   * Helper para comparação de operadores.
   */
  private static compareValues(actual: any, operator: string, target: any): boolean {
    if (actual === undefined || actual === null) {
      return operator === 'not_equals';
    }

    switch (operator) {
      case 'equals':
        return String(actual).toLowerCase() === String(target).toLowerCase();
      case 'not_equals':
        return String(actual).toLowerCase() !== String(target).toLowerCase();
      case 'contains':
        return String(actual).toLowerCase().includes(String(target).toLowerCase());
      case 'greater_than':
        return Number(actual) > Number(target);
      case 'less_than':
        return Number(actual) < Number(target);
      case 'in':
        if (Array.isArray(target)) {
          return target.map(t => String(t).toLowerCase()).includes(String(actual).toLowerCase());
        }
        return String(target).split(',').map(s => s.trim().toLowerCase()).includes(String(actual).toLowerCase());
      case 'is_active':
        return Boolean(actual) === true || String(actual).toLowerCase() === 'ativo';
      default:
        return false;
    }
  }

  private static formatPerson(user: any, categories: string[]): ProcessedPersonResult {
    return {
      id: user.id,
      name: user.name || 'Sem nome',
      email: user.email,
      phone: user.phone,
      photoUrl: user.photoUrl,
      membershipStatus: user.status || user.membershipStatus || 'ativo',
      gender: user.gender,
      age: user.age,
      cellName: user.cellName,
      matchedCategories: categories,
    };
  }
}
