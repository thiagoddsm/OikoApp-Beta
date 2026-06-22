import { doc, collection, addDoc, getDoc, getDocs, query, where, Firestore } from 'firebase/firestore';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Member, User } from '@/domain/member';

export class MembersRepository {
  private db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  async getById(id: string): Promise<Member | null> {
    // Agora que os membros e usuários foram separados (Fase 3),
    // essa função pode unificar a leitura dependendo do requisito.
    // Lendo de users por enquanto para retrocompatibilidade
    const docRef = doc(this.db, 'users', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Member;
    }
    return null;
  }

  async getByCell(cellId: string): Promise<Member[]> {
    const q = query(collection(this.db, 'users'), where('hierarchy.celulaId', '==', cellId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member));
  }

  async updateMemberCell(memberId: string, cellId: string | null): Promise<void> {
    await updateDocumentNonBlocking(doc(this.db, 'users', memberId), {
      'hierarchy.celulaId': cellId
    });
  }

  async update(id: string, data: Partial<Member>): Promise<void> {
    await updateDocumentNonBlocking(doc(this.db, 'users', id), data);
  }
}
