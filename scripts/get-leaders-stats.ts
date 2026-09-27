import { getAdminDb } from '../src/lib/firebase-admin';

async function run() {
  const db = getAdminDb();
  
  const cellsSnap = await db.collection('cells').where('status', '==', 'active').get();
  let lideresGC = new Set<string>();
  
  cellsSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.liderId) lideresGC.add(data.liderId);
    if (data.liderCasalId) lideresGC.add(data.liderCasalId);
  });

  console.log(`Líderes de GC: ${lideresGC.size}`);
}

run().catch(console.error);
