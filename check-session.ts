require('dotenv').config({ path: '.env.local' });
import { getAdminDb } from './src/lib/firebase-admin';

async function main() {
  const db = getAdminDb();
  const snap = await db.collection('gc_report_sessions').doc('21989001302').get();
  console.log(snap.data()?.step);
}
main().catch(console.error);
