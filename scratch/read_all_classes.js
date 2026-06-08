const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, getDocs } = require('firebase/firestore');

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
  const coursesSnap = await getDocs(collection(db, 'courses'));
  const courseMap = {};
  coursesSnap.forEach(doc => {
    courseMap[doc.id] = doc.data().name;
  });

  const classesSnap = await getDocs(collection(db, 'classes'));
  console.log(`Found ${classesSnap.size} classes:`);
  classesSnap.forEach(doc => {
    const cls = doc.data();
    const courseName = courseMap[cls.courseId] || cls.courseId;
    console.log(`\nID: ${doc.id} | Class: ${cls.name} | Course: ${courseName}`);
    console.log(`  StartDate: ${cls.startDate}`);
    console.log(`  Attendance dates:`, (cls.attendance || []).map(a => a.date).sort());
  });
}

run().catch(console.error);
