const fs = require('fs');
const admin = require('firebase-admin');

// Read .env file directly
const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY=['"]([\s\S]+?)['"]\r?\n/);
if (!match) {
    console.error("FIREBASE_SERVICE_ACCOUNT_KEY not found in .env!");
    process.exit(1);
}

let raw = match[1];
const serviceAccount = JSON.parse(raw);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function check() {
    console.log("Fetching all classes via admin SDK...");
    const snap = await db.collection('classes').get();
    console.log("Total classes found:", snap.size);
    snap.docs.forEach(doc => {
        console.log(`- ID: ${doc.id}, Name: ${doc.data().name}, courseId: ${doc.data().courseId}`);
    });
}

check().catch(console.error);
