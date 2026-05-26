async function run() {
  const url = 'https://firestore.googleapis.com/v1/projects/studio-1424813022-71754/databases/(default)/documents/users/EqG3efXyGVZDjWf31Tbk72NUOuf2';
  const res = await fetch(url);
  const doc = await res.json();
  const fields = doc.fields || {};
  const name = fields.name?.stringValue;
  console.log(`Student Name: ${name}`);
  const journey = fields.journey?.mapValue?.fields || {};
  const progress = journey.theoflixProgress?.mapValue?.fields || {};
  console.log('TheoFlix Progress:');
  for (const [courseId, epsVal] of Object.entries(progress)) {
    const eps = epsVal.mapValue?.fields || {};
    const watched = Object.entries(eps).map(([vid, val]) => `${vid}: ${val.booleanValue}`);
    console.log(`  Course ${courseId}: ${JSON.stringify(watched)}`);
  }
}

run().catch(console.error);
