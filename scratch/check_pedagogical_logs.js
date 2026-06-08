const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = {
  "projectId": "studio-1424813022-71754",
  "appId": "1:989586605112:web:66250f4d31e88166a212cd",
  "storageBucket": "studio-1424813022-71754.firebasestorage.app",
  "apiKey": "AIzaSyAOSAJ0WPPXAxbSMtiq7UZxkjzE6vizVq8",
  "authDomain": "studio-1424813022-71754.firebaseapp.com",
  "messagingSenderId": "989586605112"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const classId = 'w3q7qjHhLNs9D8m2a9K0';
  const q = query(collection(db, 'pedagogical_logs'), where('classId', '==', classId));
  const snap = await getDocs(q);
  console.log(`Found ${snap.size} pedagogical logs:`);
  snap.forEach(doc => {
    const data = doc.data();
    console.log(`- ID: ${doc.id}`);
    console.log(`  dateStr: ${data.dateStr}`);
    console.log(`  date (Timestamp):`, data.date?.toDate?.() || data.date);
    console.log(`  content_taught: ${data.content_taught}`);
  });
}

run().catch(console.error);
