const dotenv = require('dotenv');
dotenv.config();

const admin = require('firebase-admin');

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  console.error("FIREBASE_SERVICE_ACCOUNT_KEY not found");
  process.exit(1);
}

let sa = JSON.parse(serviceAccountKey);

admin.initializeApp({
  credential: admin.credential.cert(sa),
  projectId: sa.project_id
});

const db = admin.firestore();

async function run() {
  const email = 'thiagoddsm@gmail.com';
  console.log(`Buscando usuário com e-mail: ${email}`);
  
  const usersSnap = await db.collection('users').where('email', '==', email).get();
  
  if (usersSnap.empty) {
    console.error(`Nenhum usuário encontrado com e-mail ${email}`);
    process.exit(1);
  }
  
  const userDoc = usersSnap.docs[0];
  const uid = userDoc.id;
  const userData = userDoc.data();
  console.log(`Usuário encontrado: ${userData.name} (UID: ${uid})`);
  
  // Criar ou atualizar na coleção userTenants
  console.log(`Associando UID ${uid} como admin no tenant 'ibm'...`);
  await db.collection('userTenants').doc(uid).set({
    tenantId: 'ibm',
    role: 'admin',
    email: email,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  
  // Garantir que a hierarchy.role também seja 'admin' se o layout.tsx ainda usar ela
  console.log(`Atualizando hierarchy.role para 'admin' no documento do usuário...`);
  await db.collection('users').doc(uid).update({
    'hierarchy.role': 'admin'
  });
  
  console.log("Sucesso! Usuário promovido a Admin no Multi-tenant.");
}

run().catch(console.error);
