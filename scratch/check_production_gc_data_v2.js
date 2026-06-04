const admin = require('firebase-admin');

const PRODUCTION_PROJECT_ID = "studio-1424813022-71754";

console.log("Initializing Firebase Admin with project ID:", PRODUCTION_PROJECT_ID);

try {
  // Initialize with Application Default Credentials (ADC) fallback
  admin.initializeApp({
    projectId: PRODUCTION_PROJECT_ID
  });
  console.log("Firebase Admin initialized successfully.");
} catch (e) {
  console.error("Initialization failed:", e);
  process.exit(1);
}

const db = admin.firestore();

async function check() {
    console.log("Fetching redes from production...");
    const redesSnap = await db.collection('redes').get();
    console.log("Total redes found:", redesSnap.size);
    redesSnap.docs.forEach(doc => {
        console.log(`Rede ID: ${doc.id}, Name: ${doc.data().nome}, Color: ${doc.data().cor}`);
    });

    console.log("\nFetching cells from production...");
    const cellsSnap = await db.collection('cells').get();
    console.log("Total cells found:", cellsSnap.size);
    let cellsWithRede = 0;
    cellsSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.redeId) {
            cellsWithRede++;
            console.log(`Cell ID: ${doc.id}, Name: ${data.nome}, redeId: ${data.redeId}`);
        } else {
            console.log(`Cell ID: ${doc.id}, Name: ${data.nome}, NO redeId!`);
        }
    });
    console.log(`\nCells with redeId: ${cellsWithRede} out of ${cellsSnap.size}`);
}

check().catch(e => {
    console.error("Execution failed:", e);
});
