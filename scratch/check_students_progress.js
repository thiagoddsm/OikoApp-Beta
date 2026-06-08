const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, getDocs } = require('firebase/firestore');
const { getAuth, signInAnonymously } = require('firebase/auth');

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
const auth = getAuth(app);

async function run() {
  await signInAnonymously(auth);

  const classRef = doc(db, 'classes', 'ET3AxGzPKYVWootYAYbe');
  const classSnap = await getDoc(classRef);
  const classData = classSnap.data();

  console.log(`Class: ${classData.name}`);
  const students = classData.students || [];

  for (const sId of students) {
    const uSnap = await getDoc(doc(db, 'users', sId));
    const u = uSnap.data();
    console.log(`Student: ${u.name} (${sId})`);
    console.log(`  Progress:`, u.journey?.memberCourseProgress || 'None');
  }
}

run().catch(console.error);
