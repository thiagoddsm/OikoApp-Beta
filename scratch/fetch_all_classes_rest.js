async function run() {
  const url = 'https://firestore.googleapis.com/v1/projects/studio-1424813022-71754/databases/(default)/documents/classes';
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const docs = data.documents || [];
  console.log(`Found ${docs.length} documents via REST:`);
  docs.forEach(doc => {
    const parts = doc.name.split('/');
    const id = parts[parts.length - 1];
    const fields = doc.fields || {};
    const name = fields.name?.stringValue || 'Unnamed';
    console.log(`- ID: ${id} | Class: ${name}`);
    if (id === 'w3q7qjHhLNs9D8m2a9K0') {
      console.log(JSON.stringify(fields, null, 2));
    }
  });
}

run().catch(console.error);
