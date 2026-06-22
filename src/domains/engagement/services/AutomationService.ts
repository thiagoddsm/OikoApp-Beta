import { Activity } from '../entities/Activity';
import { AutomationRule } from '../entities/Automation';
import { AutomationRepository } from '../repositories/AutomationRepository';

export class AutomationService {
  constructor(private repository: AutomationRepository) {}

  /**
   * Avalia as regras ativas de automação contra uma atividade recém-criada.
   * Isolado da persistência do Firestore para facilitar testes em memória.
   */
  async evaluateTriggers(activity: Activity): Promise<void> {
    const rules = await this.repository.getActiveRules(activity.tenantId, activity.type);

    for (const rule of rules) {
      const isMatch = this.checkConditions(activity, rule);
      if (isMatch) {
        await this.queueAction(activity, rule);
      }
    }
  }

  private checkConditions(activity: Activity, rule: AutomationRule): boolean {
    if (!rule.conditions || rule.conditions.length === 0) return true;

    for (const condition of rule.conditions) {
      const fieldValue = this.getNestedValue(activity, condition.field);
      
      switch (condition.operator) {
        case 'equals':
          if (fieldValue !== condition.value) return false;
          break;
        case 'greater_than':
          if (fieldValue <= condition.value) return false;
          break;
        case 'less_than':
          if (fieldValue >= condition.value) return false;
          break;
        case 'contains':
          if (!String(fieldValue).includes(String(condition.value))) return false;
          break;
        default:
          return false;
      }
    }
    return true;
  }

  private async queueAction(activity: Activity, rule: AutomationRule) {
    // Aqui não executamos a ação de forma síncrona (ex: envio de e-mail)
    // Em vez disso, enfileiramos na coleção automation_jobs para um Worker processar depois
    // TODO (Sprint 8.4): Inserir na coleção automation_jobs
    console.log(`[AutomationQueue] Action ${rule.actionType} queued for activity ${activity.id}`);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }
}
