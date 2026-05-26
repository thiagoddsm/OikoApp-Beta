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
  console.log("Fetching courses from production...");
  const coursesSnap = await getDocs(collection(db, 'courses'));
  console.log("Total courses:", coursesSnap.size);
  coursesSnap.docs.forEach(doc => {
      const data = doc.data();
      console.log(`Course ID: ${doc.id}, Name: ${data.name}, LinkedTheoFlix: ${data.linkedTheoflixId}`);
      if (data.syllabus) {
          console.log("  Syllabus modules:");
          data.syllabus.forEach((s, idx) => {
              console.log(`    [${idx}] Title: ${s.title}, theoflixCourseId: ${s.theoflixCourseId}, requiredVideoIds: ${JSON.stringify(s.theoflixRequiredVideoIds)}`);
          });
      } else {
          console.log("  No syllabus field!");
      }
  });

  console.log("\nFetching theoflix_courses from production...");
  const tfSnap = await getDocs(collection(db, 'theoflix_courses'));
  console.log("Total TheoFlix courses:", tfSnap.size);
  tfSnap.docs.forEach(doc => {
      console.log(`  TheoFlix Course ID: ${doc.id}, Name: ${doc.data().title}`);
  });
}

run().catch(console.error);
