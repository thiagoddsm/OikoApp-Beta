require('dotenv').config({ path: '.env.local' });
import { getAdminDb } from './src/lib/firebase-admin';

async function main() {
  const db = getAdminDb();
  const cellId = 'b66qh1pDGJOWVcYo8EVR';
  const cellDoc = await db.collection('cells').doc(cellId).get();
  const visitors = cellDoc.data()?.visitors || [];
  console.log(JSON.stringify(visitors, null, 2));
}
main().catch(console.error);
