const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
let app;

if (serviceAccountKey) {
  try {
    let cleanKey = serviceAccountKey.trim();
    if (cleanKey.startsWith("'") && cleanKey.endsWith("'")) {
      cleanKey = cleanKey.slice(1, -1);
    }
    const sa = JSON.parse(cleanKey);
    app = admin.initializeApp({
      credential: admin.credential.cert(sa)
    });
  } catch (e) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY", e);
    process.exit(1);
  }
} else {
  console.error("No service account key found in .env");
  process.exit(1);
}

const db = admin.firestore();

db.collection('event_registrations').get()
  .then(snap => {
    console.log(`Total registrations in database: ${snap.size}`);
    snap.forEach(doc => {
      console.log('Document ID:', doc.id);
      console.log(JSON.stringify(doc.data(), null, 2));
    });
    process.exit(0);
  })
  .catch(err => {
    console.error('Error fetching registrations:', err);
    process.exit(1);
  });
