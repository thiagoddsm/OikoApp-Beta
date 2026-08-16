import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getAdminDb } from './src/lib/firebase-admin';

async function main() {
  const db = getAdminDb();
  const doc = await db.collection('enrollment_requests').doc('VmgwHOvfa2YyNuoZYGqS').get();
  console.log('DOC VmgwHOvfa2YyNuoZYGqS:', doc.data());
}

main().catch(console.error);
