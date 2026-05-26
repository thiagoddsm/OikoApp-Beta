async function run() {
  const url = 'https://firestore.googleapis.com/v1/projects/studio-1424813022-71754/databases/(default)/documents/courses';
  console.log('Fetching courses from REST API...');
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  console.log(`Successfully fetched ${data.documents?.length || 0} courses!`);
  if (data.documents) {
    for (const doc of data.documents) {
      const parts = doc.name.split('/');
      const id = parts[parts.length - 1];
      console.log(`Course ID: ${id}, Fields:`, Object.keys(doc.fields || {}));
    }
  }
}

run().catch(console.error);
