import { getAdminDb } from '../src/lib/firebase-admin';

async function main() {
  const db = getAdminDb();
  const snapshot = await db.collection('gc_report_sessions').get();
  
  console.log("=== SESSÕES ATIVAS ===");
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`ID (Phone): ${doc.id}`);
    console.log(` -> Step: ${data.step}`);
    console.log(` -> CellId: ${data.cellId}`);
    console.log(` -> Members count: ${data.members?.length}`);
    console.log(` -> Selections:`, JSON.stringify(data.pollSelections));
    console.log("-----------------------------------------");
  });
}

main().catch(console.error);
