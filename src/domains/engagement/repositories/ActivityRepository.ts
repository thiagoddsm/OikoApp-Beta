import { Firestore, collection, query, where, orderBy, getDocs, addDoc, limit } from 'firebase/firestore';
import { Activity } from '../entities/Activity';

export class ActivityRepository {
  constructor(private firestore: Firestore) {}

  private getCollection() {
    return collection(this.firestore, 'activities');
  }

  async create(activity: Omit<Activity, 'id'>): Promise<Activity> {
    const docRef = await addDoc(this.getCollection(), activity);
    return { id: docRef.id, ...activity };
  }

  async findByMember(tenantId: string, memberId: string, maxResults = 50): Promise<Activity[]> {
    const q = query(
      this.getCollection(),
      where('tenantId', '==', tenantId),
      where('memberId', '==', memberId),
      orderBy('createdAt', 'desc'),
      limit(maxResults)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity));
  }
}
