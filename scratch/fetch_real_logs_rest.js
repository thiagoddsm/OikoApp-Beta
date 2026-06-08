async function run() {
  const url = 'https://firestore.googleapis.com/v1/projects/studio-1424813022-71754/databases/(default)/documents/pedagogical_logs';
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const docs = data.documents || [];
  console.log(`Found ${docs.length} pedagogical logs in real database:`);
  docs.forEach(doc => {
    const fields = doc.fields || {};
    const classId = fields.classId?.stringValue;
    if (classId === 'BrITKwGAGLUT7xJ4usG5') {
      console.log(`- ID: ${doc.name.split('/').pop()}`);
      console.log(`  dateStr: ${fields.dateStr?.stringValue}`);
      console.log(`  content_taught: ${fields.content_taught?.stringValue}`);
    }
  });
}

run().catch(console.error);
