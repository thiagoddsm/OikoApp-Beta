const admin = require('firebase-admin');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY='([\s\S]+?)'/);
if (!match) {
    console.error("FIREBASE_SERVICE_ACCOUNT_KEY not found in .env!");
    process.exit(1);
}

// Replace escaped quotes \\" with " to parse it
const cleanKey = match[1].replace(/\\"/g, '"');
const serviceAccount = JSON.parse(cleanKey);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
}

const db = admin.firestore();

async function check() {
    console.log("Fetching redes from homologation database...");
    const redesSnap = await db.collection('redes').get();
    console.log("Total redes found:", redesSnap.size);
    redesSnap.docs.forEach(doc => {
        console.log(`Rede ID: ${doc.id}, Name: ${doc.data().nome}, Color: ${doc.data().cor}`);
    });

    console.log("\nFetching cells from homologation database...");
    const cellsSnap = await db.collection('cells').get();
    console.log("Total cells found:", cellsSnap.size);
    let cellsWithRede = 0;
    cellsSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.redeId) {
            cellsWithRede++;
            console.log(`Cell ID: ${doc.id}, Name: ${data.nome}, redeId: ${data.redeId}, AreaId: ${data.areaId}`);
        } else {
            console.log(`Cell ID: ${doc.id}, Name: ${data.nome}, NO redeId!, AreaId: ${data.areaId}`);
        }
    });
    console.log(`\nCells with redeId: ${cellsWithRede} out of ${cellsSnap.size}`);
}

check().catch(console.error);
