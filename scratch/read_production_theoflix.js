const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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
  console.log("Fetching theoflix_courses from production...");
  const snap = await getDocs(collection(db, 'theoflix_courses'));
  console.log("Total theoflix_courses in DB:", snap.size);
  
  snap.docs.forEach(doc => {
      const data = doc.data();
      console.log(`\nCourse ID: ${doc.id}, Title: ${data.title}`);
      if (data.episodes) {
          console.log(`Episodes count: ${data.episodes.length}`);
          data.episodes.forEach((ep, idx) => {
              console.log(`  [${idx}] Title: ${ep.title}`);
          });
      } else {
          console.log("No episodes field!");
      }
  });
}

run().catch(console.error);
