async function run() {
  const url = 'https://firestore.googleapis.com/v1/projects/studio-1424813022-71754/databases/(default)/documents/classes/3ldwgQCatfHShpF1YKsn';
  const res = await fetch(url);
  const doc = await res.json();
  console.log(JSON.stringify(doc.fields, null, 2));
}

run().catch(console.error);
