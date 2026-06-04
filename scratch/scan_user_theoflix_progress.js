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
  console.log("Fetching users from production...");
  const snap = await getDocs(collection(db, 'users'));
  console.log("Total users:", snap.size);
  
  const usersWithProgress = [];
  snap.docs.forEach(doc => {
      const data = doc.data();
      const progress = data.journey?.theoflixProgress;
      const memberProgress = data.journey?.memberCourseProgress;
      if (progress || memberProgress) {
          usersWithProgress.push({
              id: doc.id,
              name: data.name,
              theoflixProgress: progress,
              memberProgress: memberProgress
          });
      }
  });

  console.log(`Found ${usersWithProgress.length} users with progress/attendance metadata.`);
  
  usersWithProgress.forEach(user => {
      console.log(`\nUser: ${user.name} (${user.id})`);
      if (user.theoflixProgress) {
          console.log("  TheoFlix Progress:");
          Object.entries(user.theoflixProgress).forEach(([courseId, episodes]) => {
              console.log(`    Course: ${courseId}`);
              console.log(`      Watched: ${JSON.stringify(episodes)}`);
          });
      }
      if (user.memberProgress) {
          console.log("  Member Course Progress:");
          console.log(`    ${JSON.stringify(user.memberProgress)}`);
      }
  });
}

run().catch(console.error);
