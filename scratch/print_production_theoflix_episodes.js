const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  "projectId": "studio-1424813022-71754",
  "appId": "1:989586605112:web:66250f4d31e88166a212cd",
  "storageBucket": "studio-1424813022-71754.firebasestorage.app",
  "apiKey": "AIzaSyAOSAJ0WPPXAxbSMtiq7UZxkjzE6vizVq8",
  "authDomain": "studio-1424813022-71754.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "989586605112"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const snap = await getDoc(doc(db, 'theoflix_courses', 'membros'));
  const data = snap.data();
  console.log("Course:", data.title);
  if (data.episodes) {
      data.episodes.forEach((ep, idx) => {
          console.log(`[${idx}] Title: ${ep.title}, youtubeId: ${ep.youtubeId}`);
      });
  }
}

run().catch(console.error);
