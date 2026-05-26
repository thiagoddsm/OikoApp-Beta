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
  const snap = await getDocs(collection(db, 'courses'));
  snap.docs.forEach(doc => {
      const data = doc.data();
      if (data.name?.toLowerCase().includes('crescer')) {
          console.log(`Course ID: ${doc.id}, Name: ${data.name}, LinkedTheoFlix: ${data.linkedTheoflixId}`);
          if (data.syllabus) {
              console.log("Syllabus:");
              console.log(JSON.stringify(data.syllabus, null, 2));
          } else {
              console.log("No syllabus!");
          }
      }
  });
}

run().catch(console.error);
