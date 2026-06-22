import { getAdminDb } from '../src/lib/firebase-admin';

async function main() {
  const db = getAdminDb();
  const snapshot = await db.collection('webhook_dedup').get();
  
  console.log("=== CHAVES DE DEDUPLICAÇÃO ===");
  snapshot.forEach(doc => {
    console.log(doc.id, doc.data());
  });
}

main().catch(console.error);
