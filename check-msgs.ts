require('dotenv').config({ path: '.env.local' });
import { getAdminDb } from './src/lib/firebase-admin';

async function check() {
  const db = getAdminDb();
  const snap = await db.collection('notifications_messages').where('from', 'in', ['5521989001302', '21989001302']).get();
  console.log('Size:', snap.size);
  snap.forEach(doc => {
    console.log(doc.data().from, doc.data().content, doc.data().receivedAt?.toDate());
  });
}
check().catch(console.error);
