const { initializeApp: initializeAdminApp, cert: adminCert, getApps: getAdminApps } = require('firebase-admin/app');
const { getAuth: getAdminAuth } = require('firebase-admin/auth');
const { getFirestore: getAdminFirestore } = require('firebase-admin/firestore');

const { initializeApp: initializeClientApp } = require('firebase/app');
const { getAuth: getClientAuth, signInWithCustomToken } = require('firebase/auth');
const { getFirestore: getClientFirestore, collection, query, where, limit, getDocs, doc, getDoc } = require('firebase/firestore');

require('dotenv').config({ path: '.env' });

// Statically loaded from src/firebase/config.ts to match the client exactly
const firebaseConfig = {
  "projectId": "studio-1424813022-71754",
  "appId": "1:989586605112:web:66250f4d31e88166a212cd",
  "storageBucket": "studio-1424813022-71754.firebasestorage.app",
  "apiKey": "AIzaSyAOSAJ0WPPXAxbSMtiq7UZxkjzE6vizVq8",
  "authDomain": "studio-1424813022-71754.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "989586605112"
};

// Parse command line arguments
const args = {};
process.argv.slice(2).forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, val] = arg.slice(2).split('=');
    args[key] = val;
  }
});

const TARGET_UID = args.uid || '9Sm2pIH1zIOj9k8D8EcLS3bkKad2';
const TARGET_TENANT = args.tenant || 'w3m93SHQeBRhiDnt7208';
const SELECTED_COLLECTION = args.collection;
const TEST_ALL = args.all !== undefined || !SELECTED_COLLECTION;

async function testQuery(db, label, queryRef) {
  try {
    const snap = await getDocs(queryRef);
    console.log(`  ✓ ${label}: SUCCESS (returned ${snap.size} docs)`);
    return true;
  } catch (error) {
    console.log(`  ✗ ${label}: FAILED`);
    console.log(`    Error Details:`, {
      code: error.code,
      message: error.message,
      // If index is missing, the error message contains the link to create it.
      link: error.message && error.message.includes('https://console.firebase.google.com')
        ? error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/)[0]
        : null
    });
    return false;
  }
}

async function testDocRead(db, label, docRef) {
  try {
    const snap = await getDoc(docRef);
    console.log(`  ✓ ${label}: SUCCESS (exists: ${snap.exists()})`);
    return true;
  } catch (error) {
    console.log(`  ✗ ${label}: FAILED`);
    console.log(`    Error Details:`, {
      code: error.code,
      message: error.message
    });
    return false;
  }
}

async function runDiagnostics() {
  console.log('================================================================');
  console.log('🔥 STARTING FIRESTORE SECURITY RULES & INDEX DIAGNOSTICS 🔥');
  console.log('================================================================');
  console.log(`Target UID:    ${TARGET_UID}`);
  console.log(`Target Tenant: ${TARGET_TENANT}`);
  console.log('----------------------------------------------------------------');

  // 1. Initialize Admin SDK
  const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!saKey) {
    console.error('✗ ERROR: FIREBASE_SERVICE_ACCOUNT_KEY not found in .env');
    process.exit(1);
  }
  const sa = JSON.parse(saKey);
  const adminApp = getAdminApps().length ? getAdminApps()[0] : initializeAdminApp({ credential: adminCert(sa) });
  const adminDb = getAdminFirestore(adminApp);
  const adminAuth = getAdminAuth(adminApp);

  console.log('✓ Admin SDK Initialized.');

  // 2. Generate Custom Token & Decode claims
  let customToken;
  try {
    customToken = await adminAuth.createCustomToken(TARGET_UID);
    console.log('✓ Custom Auth Token generated.');
  } catch (error) {
    console.error('✗ ERROR: Failed to generate custom token:', error.message);
    process.exit(1);
  }

  // 3. Initialize Client SDK
  const clientApp = initializeClientApp(firebaseConfig);
  const clientAuth = getClientAuth(clientApp);
  const clientDb = getClientFirestore(clientApp);

  // 4. Sign in with Custom Token on the client
  try {
    const userCredential = await signInWithCustomToken(clientAuth, customToken);
    console.log(`✓ Client SDK Logged In successfully as UID: ${userCredential.user.uid}`);

    // Get token claims
    const tokenResult = await userCredential.user.getIdTokenResult(true);
    console.log('----------------------------------------------------------------');
    console.log('🔑 DECODED ID TOKEN CLAIMS:');
    console.log(JSON.stringify(tokenResult.claims, null, 2));
    console.log('----------------------------------------------------------------');
  } catch (error) {
    console.error('✗ ERROR: Client SDK Login failed:', error.message);
    process.exit(1);
  }

  // Determine collections to test
  const collectionsToTest = SELECTED_COLLECTION ? [SELECTED_COLLECTION] : [
    'worship_plans',
    'worship_templates',
    'automation_rules',
    'cells',
    'areas',
    'redes'
  ];

  for (const colName of collectionsToTest) {
    console.log(`\n📋 Testing Collection: "${colName}"`);
    console.log('----------------------------------------------------------------');

    // 1. Find a real document ID in this collection using Admin SDK to test GET specifically
    let testDocId = 'diagnostics_dummy_id';
    try {
      const sampleSnap = await adminDb.collection(colName).limit(1).get();
      if (!sampleSnap.empty) {
        testDocId = sampleSnap.docs[0].id;
        console.log(`  (Found sample document ID for GET test: "${testDocId}")`);
      } else {
        console.log(`  (No documents found in "${colName}". GET test will use a dummy ID)`);
      }
    } catch (err) {
      console.log(`  (Admin SDK failed to query sample doc: ${err.message})`);
    }

    // Run direct GET test
    const docRef = doc(clientDb, colName, testDocId);
    await testDocRead(clientDb, 'Test 1: Direct document getDoc()', docRef);

    // Run general list without filters (checks simple collection level rules)
    const listQuery = query(collection(clientDb, colName), limit(1));
    await testQuery(clientDb, 'Test 2: Query collection list without filters (limit 1)', listQuery);

    // Run list with tenantId filter (checks queries + index needs)
    const filteredQuery = query(collection(clientDb, colName), where('tenantId', '==', TARGET_TENANT));
    await testQuery(clientDb, `Test 3: Query with tenantId filter (== "${TARGET_TENANT}")`, filteredQuery);
  }

  console.log('\n================================================================');
  console.log('🏁 DIAGNOSTICS COMPLETED 🏁');
  console.log('================================================================');
}

runDiagnostics().catch(console.error);
