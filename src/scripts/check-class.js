const fs = require('fs');
const admin = require('firebase-admin');
const serviceAccount = JSON.parse(fs.readFileSync('secrets/firebase-admin.json', 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
db.collection('classes').doc('yu1XM4d6aFMziBFQgNYC').get().then(doc => {
  const data = doc.data();
  console.log('Overrides:', JSON.stringify(data.scheduleOverrides, null, 2));
  console.log('Extra:', JSON.stringify(data.extraSessions, null, 2));
  process.exit(0);
});
