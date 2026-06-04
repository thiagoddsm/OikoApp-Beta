const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

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
    const classId = 'BrITKwGAGLUT7xJ4usG5';
    const classDoc = await getDoc(doc(db, 'classes', classId));
    if (!classDoc.exists()) {
        console.log("Class document does not exist!");
        return;
    }
    const data = classDoc.data();
    console.log("Class data:", JSON.stringify(data, null, 2));

    // Verify fields
    console.log("students is array:", Array.isArray(data.students));
    console.log("attendance is array:", Array.isArray(data.attendance));
    console.log("extraSessions is array:", Array.isArray(data.extraSessions));
    console.log("scheduleOverrides is object:", typeof data.scheduleOverrides === 'object');
}

check().catch(console.error);
