const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

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
  const courseId = "QehPgdTXhe0veTW4Xf3J"; // Pertencer
  console.log(`Fetching classes for course: ${courseId}...`);
  const q = query(collection(db, 'classes'), where('courseId', '==', courseId));
  const snap = await getDocs(q);
  console.log("Total classes found:", snap.size);
  
  snap.docs.forEach(doc => {
      const data = doc.data();
      console.log(`\nClass ID: ${doc.id}, Name: ${data.name}, StartDate: ${data.startDate}`);
      console.log(`Students count: ${data.students ? data.students.length : 0}`);
      if (data.attendance) {
          console.log("Attendance records:");
          data.attendance.forEach((att, idx) => {
              console.log(`  [${idx}] Date: ${att.date}`);
              console.log(`      Present: ${JSON.stringify(att.presentStudentIds)}`);
              console.log(`      Online (TheoFlix): ${JSON.stringify(att.onlineStudentIds)}`);
              if (att.lessonNotes) {
                  console.log(`      Lesson Notes: ${JSON.stringify(att.lessonNotes)}`);
              }
          });
      } else {
          console.log("No attendance records.");
      }
  });
}

run().catch(console.error);
