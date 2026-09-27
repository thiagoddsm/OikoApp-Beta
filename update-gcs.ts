import { getAdminDb } from './src/lib/firebase-admin';

async function main() {
  const db = getAdminDb();
  
  const cellsSnap = await db.collection('cells').get();
  
  const targetUpdates = [
    { query: 'esperança', url: '/uploads/gc-tv-esperanca.jpg' },
    { query: 'tv.', url: '/uploads/gc-tv-esperanca.jpg' },
    { query: 'tv esperança', url: '/uploads/gc-tv-esperanca.jpg' },
    { query: 'salgueiro', url: '/uploads/gc-salgueiro.jpg' },
    { query: 'pda iv', url: '/uploads/gc-pda-iv.jpg' },
    { query: 'pda 4', url: '/uploads/gc-pda-iv.jpg' },
  ];

  for (const doc of cellsSnap.docs) {
    const data = doc.data();
    const name = (data.name || data.nome || '').toLowerCase();
    
    for (const target of targetUpdates) {
      if (name.includes(target.query)) {
         console.log(`Found match: [${name}] -> updating to ${target.url}`);
         await doc.ref.update({ imageUrl: target.url });
         break; // Only update once per doc
      }
    }
  }
  
  console.log("Done checking/updating GCs.");
}

main().catch(console.error);
