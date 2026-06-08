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
  const uids = ['9Sm2pIH1zIOj9k8D8EcLS3bkKad2', 'zYyvW5NPlMUldlr2rqVuGaprx1R2'];
  const email = 'thiagoddsm@gmail.com';
  
  for (const uid of uids) {
    console.log(`\n=== Ajustando UID: ${uid} ===`);
    
    // 1. Garantir documento na coleçao userTenants
    console.log(`Criando/Atualizando na coleção userTenants...`);
    await db.collection('userTenants').doc(uid).set({
      tenantId: 'ibm',
      role: 'admin',
      email: email,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    // 2. Garantir documento na coleçao users
    console.log(`Criando/Atualizando na coleção users...`);
    await db.collection('users').doc(uid).set({
      name: 'thiago dias',
      email: email,
      hierarchy: {
        role: 'admin',
        celulaId: '',
        supervisorId: ''
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log(`Pronto para UID: ${uid}`);
  }
  
  console.log("\nSucesso! Ambos os UIDs foram completamente configurados como Admin.");
}

run().catch(console.error);
