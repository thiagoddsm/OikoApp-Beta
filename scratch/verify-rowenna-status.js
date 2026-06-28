const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();

const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
const cleanJson = rawKey.startsWith("'") && rawKey.endsWith("'") ? rawKey.slice(1, -1) : rawKey;
const serviceAccount = JSON.parse(cleanJson);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function run() {
  const userQuery = await db.collection('users').where('email', '==', 'rowenna_coubelle@hotmail.com').get();
  const userId = userQuery.docs[0].id;
  const userDoc = userQuery.docs[0].data();

  console.log('--- USUARIO ---');
  console.log('Nome:', userDoc.name);
  console.log('Progresso estruturado (journey.theoflixProgress.crescer):', 
    JSON.stringify(userDoc.journey?.theoflixProgress?.crescer, null, 2)
  );

  const classesSnap = await db.collection('classes').get();
  classesSnap.forEach(doc => {
    const cls = doc.data();
    if (cls.students?.includes(userId)) {
      console.log('--- CLASSE ---');
      console.log('Nome da classe:', cls.name);
      
      const atts = (cls.attendance || []).filter(a => a.onlineStudentIds?.includes(userId));
      console.log('Datas marcadas como Online (Theoflix):');
      atts.forEach(a => {
        console.log(`- Data: ${a.date}`);
      });
    }
  });
}

run().catch(console.error);
