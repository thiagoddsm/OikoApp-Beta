const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
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

  const usersSnap = await getDocs(collection(db, 'users'));
  const userMap = {};
  usersSnap.forEach(d => {
    userMap[d.id] = d.data();
  });

  const classesSnap = await getDocs(collection(db, 'classes'));
  classesSnap.forEach(clsSnap => {
    const cls = clsSnap.data();
    if (cls.courseId === 'QehPgdTXhe0veTW4Xf3J') {
      const att = cls.attendance || [];
      att.forEach(a => {
        if (a.date === '2026-06-07' || a.date === '2026-06-14') {
          console.log(`Class: ${cls.name} (${clsSnap.id}) on Date: ${a.date}`);
          const presents = (a.presentStudentIds || []).map(id => userMap[id]?.name || id);
          console.log(`  Presents:`, presents);
        }
      });
    }
  });
}

run().catch(console.error);
