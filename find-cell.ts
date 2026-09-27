import { getAdminDb } from './src/lib/firebase-admin';

async function main() {
  const db = getAdminDb();
  const cellsSnap = await db.collection('cells').where('nome', '>=', 'Mena').where('nome', '<=', 'Mena\uf8ff').get();
  
  if (cellsSnap.empty) {
    const allCells = await db.collection('cells').get();
    const mena = allCells.docs.find(d => d.data().nome?.includes('Mena') || d.data().name?.includes('Mena'));
    if (mena) {
      console.log('Cell found by includes:', mena.id, mena.data());
    } else {
      console.log('Cell Mena Barreto not found');
    }
  } else {
    cellsSnap.forEach(doc => {
      console.log('Cell:', doc.id, doc.data());
    });
  }
}
main().catch(console.error);
