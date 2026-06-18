import { doc, collection, addDoc, getDoc, getDocs, query, where, Firestore } from 'firebase/firestore';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Cell } from '@/domain/cell';

export class CellsRepository {
  private db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  async getById(id: string): Promise<Cell | null> {
    const docRef = doc(this.db, 'cells', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Cell;
    }
    return null;
  }

  async getByTenant(tenantId: string): Promise<Cell[]> {
    const q = query(collection(this.db, 'cells'), where('tenantId', '==', tenantId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cell));
  }

  async create(data: Omit<Cell, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(this.db, 'cells'), data);
    return docRef.id;
  }

  async update(id: string, data: Partial<Cell>): Promise<void> {
    await updateDocumentNonBlocking(doc(this.db, 'cells', id), data);
  }

  async delete(id: string): Promise<void> {
    await deleteDocumentNonBlocking(doc(this.db, 'cells', id));
  }
}
