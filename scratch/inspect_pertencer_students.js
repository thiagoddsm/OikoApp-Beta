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

const NAMES = [
  "Isaac Mendonça Nascimento",
  "Alana Carvalho Bastos Barreto",
  "Ana Cristina Viana de Mendonça Nascimento",
  "Ana Paula Soares de Souza"
];

async function run() {
  const usersSnap = await getDocs(collection(db, 'users'));
  const userMap = {};
  usersSnap.forEach(d => {
    userMap[d.id] = d.data().name;
    const name = d.data().name;
    if (NAMES.some(n => name && name.includes(n))) {
      console.log(`Found User: ${name} -> ID: ${d.id}`);
    }
  });

  const classesSnap = await getDocs(collection(db, 'classes'));
  classesSnap.forEach(clsSnap => {
    const cls = clsSnap.data();
    if (cls.courseId === 'QehPgdTXhe0veTW4Xf3J') { // Pertencer
      console.log(`\nClass: ${cls.name} (${clsSnap.id})`);
      const att = cls.attendance || [];
      att.forEach(a => {
        const onlineNames = (a.onlineStudentIds || []).map(id => userMap[id] || id);
        const presentNames = (a.presentStudentIds || []).map(id => userMap[id] || id);
        if (onlineNames.length > 0 || presentNames.length > 0) {
          console.log(`  Date: ${a.date}`);
          if (onlineNames.length > 0) console.log(`    Online: ${JSON.stringify(onlineNames)}`);
          if (presentNames.length > 0) console.log(`    Present: ${JSON.stringify(presentNames)}`);
        }
      });
    }
  });
}

run().catch(console.error);
