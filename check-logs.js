const admin = require('firebase-admin');
const fs = require('fs');

// Read the .env file to get the service account string
const env = fs.readFileSync('.env', 'utf-8');
const match = env.match(/FIREBASE_SERVICE_ACCOUNT_KEY='(.*)'/);
if (match) {
    const creds = JSON.parse(match[1]);
    admin.initializeApp({
        credential: admin.credential.cert(creds)
    });
    
    const db = admin.firestore();
    
    console.log("--- DEBUG LOGS ---");
    db.collection('gc_bot_debug').orderBy('receivedAt', 'desc').limit(10).get().then(snap => {
        snap.forEach(doc => {
            const data = doc.data();
            console.log(`Text: "${data.text}", Type: ${data.responseType}, FromMe: ${data.fromMe}`);
        });
        
        console.log("\n--- NOTIFICATIONS MESSAGES ---");
        return db.collection('notifications_messages').orderBy('receivedAt', 'desc').limit(10).get();
    }).then(snap => {
        snap.forEach(doc => {
            const data = doc.data();
            console.log(`Content: "${data.content}", Type: ${data.type}, FromMe: ${data.fromMe}`);
        });
        
        console.log("\n--- SESSIONS ---");
        return db.collection('gc_report_sessions').get();
    }).then(snap => {
        snap.forEach(doc => {
            console.log(`Session: ${doc.id}, Step: ${doc.data().step}`);
        });
        process.exit(0);
    }).catch(console.error);
} else {
    console.error("Could not find FIREBASE_SERVICE_ACCOUNT_KEY in .env");
    process.exit(1);
}
