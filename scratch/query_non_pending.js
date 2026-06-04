const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const FALLBACK_PROJECT_ID = "studio-1424813022-71754";
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

let app;
if (serviceAccountKey) {
  try {
    let cleanKey = serviceAccountKey.trim();
    if (cleanKey.startsWith("'") && cleanKey.endsWith("'")) {
      cleanKey = cleanKey.slice(1, -1);
    }
    const sa = JSON.parse(cleanKey);
    app = initializeApp({
      credential: cert(sa),
      projectId: sa.project_id || FALLBACK_PROJECT_ID
    });
  } catch (e) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY", e);
    app = initializeApp({ projectId: FALLBACK_PROJECT_ID });
  }
} else {
  app = initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || FALLBACK_PROJECT_ID
  });
}

const db = getFirestore(app);

async function run() {
  console.log("Buscando solicitações com status diferente de pending...");
  const snap = await db.collection('finance_requests').where('status', '!=', 'pending').get();
  
  if (snap.empty) {
    console.log("Nenhuma solicitação encontrada com status diferente de pending.");
    return;
  }

  snap.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id}`);
    console.log(`  Solicitante: ${data.requesterName}`);
    console.log(`  E-mail: ${data.email}`);
    console.log(`  Telefone: ${data.phone}`);
    console.log(`  Objetivo: ${data.objective}`);
    console.log(`  Valor: R$ ${data.amount}`);
    console.log(`  Status: ${data.status}`);
    console.log(`  Criado em: ${data.createdAt ? data.createdAt.toDate().toISOString() : 'N/A'}`);
    console.log("-----------------------------------------");
  });
}

run().catch(console.error);
