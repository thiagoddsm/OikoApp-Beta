import { Firestore, collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { AutomationRule } from '../entities/Automation';

export class AutomationRepository {
  constructor(private firestore: Firestore) {}

  private getCollection() {
    return collection(this.firestore, 'automation_rules');
  }

  async getActiveRules(tenantId: string, triggerEvent: string): Promise<AutomationRule[]> {
    const q = query(
      this.getCollection(),
      where('tenantId', '==', tenantId),
      where('triggerEvent', '==', triggerEvent),
      where('isActive', '==', true)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AutomationRule));
  }

  async getAllRules(tenantId: string): Promise<AutomationRule[]> {
    const q = query(
      this.getCollection(),
      where('tenantId', '==', tenantId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AutomationRule));
  }

  async create(rule: Omit<AutomationRule, 'id'>): Promise<AutomationRule> {
    const docRef = await addDoc(this.getCollection(), rule);
    return { id: docRef.id, ...rule };
  }

  async update(id: string, updates: Partial<AutomationRule>): Promise<void> {
    const docRef = doc(this.firestore, 'automation_rules', id);
    await updateDoc(docRef, updates);
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(this.firestore, 'automation_rules', id);
    await deleteDoc(docRef);
  }
}
