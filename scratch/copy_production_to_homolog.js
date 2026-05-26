const dotenv = require('dotenv');
dotenv.config();

const { initializeApp: initializeClient } = require('firebase/app');
const { getFirestore: getClientFirestore, collection: clientCollection, getDocs: getClientDocs } = require('firebase/firestore');
const admin = require('firebase-admin');

// Production Client Config (used to read)
const productionConfig = {
  "projectId": "studio-1424813022-71754",
  "appId": "1:989586605112:web:66250f4d31e88166a212cd",
  "storageBucket": "studio-1424813022-71754.firebasestorage.app",
  "apiKey": "AIzaSyAOSAJ0WPPXAxbSMtiq7UZxkjzE6vizVq8",
  "authDomain": "studio-1424813022-71754.firebaseapp.com",
  "messagingSenderId": "989586605112"
};

// Initialize Production Client
const prodApp = initializeClient(productionConfig, 'production-client');
const prodDb = getClientFirestore(prodApp);

// Initialize Homologation Admin
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  console.error("FIREBASE_SERVICE_ACCOUNT_KEY not found in .env");
  process.exit(1);
}

let sa;
try {
  let cleanKey = serviceAccountKey.trim();
  if (cleanKey.startsWith("'") && cleanKey.endsWith("'")) {
    cleanKey = cleanKey.slice(1, -1);
  }
  sa = JSON.parse(cleanKey);
} catch (e) {
  console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", e.message);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(sa),
  projectId: sa.project_id
});

const homologDb = admin.firestore();

async function copyCollection(colName) {
  console.log(`\nCopying collection "${colName}" from Production to Homologation (${sa.project_id})...`);
  
  const prodSnap = await getClientDocs(clientCollection(prodDb, colName));
  console.log(`Fetched ${prodSnap.size} documents from Production.`);

  let copied = 0;
  const batchLimit = 400;
  let batch = homologDb.batch();

  for (const docSnap of prodSnap.docs) {
    const docData = docSnap.data();
    const docRef = homologDb.collection(colName).doc(docSnap.id);
    
    batch.set(docRef, docData);
    copied++;

    if (copied % batchLimit === 0) {
      console.log(`Committing batch of ${batchLimit} documents...`);
      await batch.commit();
      batch = homologDb.batch();
    }
  }

  if (copied % batchLimit !== 0) {
    console.log(`Committing remaining documents...`);
    await batch.commit();
  }

  console.log(`✅ Finished copying ${copied} documents for "${colName}"`);
}

async function run() {
  console.log("=== Copying Data to Homologation ===");
  await copyCollection('courses');
  await copyCollection('classes');
  await copyCollection('users');
  console.log("\n🎉 Data migration complete!");
  process.exit(0);
}

run().catch(e => {
  console.error("Error during migration:", e);
  process.exit(1);
});
