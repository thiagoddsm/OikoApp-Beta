const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  "projectId": "studio-8044285263-a0cc3",
  "appId": "1:430562702363:web:862e7ab0e02fc9301434be",
  "storageBucket": "studio-8044285263-a0cc3.firebasestorage.app",
  "apiKey": "AIzaSyD4Tom0uDpf6tM_FAhRduGzEQGhSrjwitY",
  "authDomain": "studio-8044285263-a0cc3.firebaseapp.com",
  "messagingSenderId": "430562702363"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
    console.log("Fetching all classes...");
    const snap = await getDocs(collection(db, 'classes'));
    console.log("Total classes found:", snap.size);
    snap.docs.forEach(doc => {
        console.log(`- ID: ${doc.id}, Name: ${doc.data().name}, courseId: ${doc.data().courseId}`);
    });
}

check().catch(console.error);
