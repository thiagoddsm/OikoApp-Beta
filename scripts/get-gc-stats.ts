import { getAdminDb } from '../src/lib/firebase-admin';

async function run() {
  const db = getAdminDb();
  const cellsSnap = await db.collection('cells').where('status', '==', 'active').get();
  
  const hosts = new Set<string>();
  
  cellsSnap.docs.forEach((doc) => {
    const data = doc.data();
    
    // Find the host
    let hostId = data.anfitriaoId;
    if (!hostId && data.liderEAnfitriao) {
      hostId = data.liderId;
    }
    // se não tiver anfitrião explícito, vamos contar o GC como 1 casa única (sem id conhecido)
    if (hostId) {
       hosts.add(hostId);
    } else {
       hosts.add(`unknown_host_for_gc_${doc.id}`);
    }
  });

  console.log(`Unique hosts (approx houses): ${hosts.size} for ${cellsSnap.size} GCs.`);
}

run().catch(console.error);
