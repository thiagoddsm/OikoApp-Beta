const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

const TARGET_NAMES = [
  "Isaac Mendonça Nascimento",
  "Alana Carvalho Bastos Barreto",
  "Ana Cristina Viana de Mendonça Nascimento",
  "Ana Paula Soares de Souza"
];

async function run() {
  const snap = await getDocs(collection(db, 'users'));
  const targetUsers = snap.docs.filter(doc => TARGET_NAMES.includes(doc.data().name));
  
  for (const docSnap of targetUsers) {
    const data = docSnap.data();
    console.log(`\nUser: ${data.name} (ID: ${docSnap.id})`);
    const membrosProgress = data.journey?.theoflixProgress?.membros || {};
    console.log("membros progress keys (youtubeIds or indices):", JSON.stringify(membrosProgress, null, 2));
  }
}

run().catch(console.error);
