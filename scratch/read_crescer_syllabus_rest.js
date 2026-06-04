async function run() {
  const url = 'https://firestore.googleapis.com/v1/projects/studio-1424813022-71754/databases/(default)/documents/courses/0p9aolpCoHzGrnnue4nP';
  console.log('Fetching Crescer course...');
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed: ${res.status} ${res.statusText}`);
  }
  const doc = await res.json();
  const fields = doc.fields || {};
  const name = fields.name?.stringValue;
  console.log(`Course Name: ${name}`);
  const syllabus = fields.syllabus?.arrayValue?.values || [];
  console.log(`Syllabus length: ${syllabus.length}`);
  syllabus.forEach((sVal, idx) => {
    const s = sVal.mapValue?.fields || {};
    const title = s.title?.stringValue;
    const theoflixCourseId = s.theoflixCourseId?.stringValue;
    const required = (s.theoflixRequiredVideoIds?.arrayValue?.values || []).map(v => v.stringValue);
    console.log(`  [${idx}] Title: "${title}", theoflixCourseId: "${theoflixCourseId}", requiredVideoIds: ${JSON.stringify(required)}`);
  });
}

run().catch(console.error);
