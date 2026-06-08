async function run() {
  const url = 'https://firestore.googleapis.com/v1/projects/studio-1424813022-71754/databases/(default)/documents/classes/BrITKwGAGLUT7xJ4usG5';
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed: ${res.status} ${res.statusText}`);
  }
  const doc = await res.json();
  const fields = doc.fields || {};
  const name = fields.name?.stringValue || 'Unnamed';
  console.log(`\n--- Class ID: BrITKwGAGLUT7xJ4usG5 (${name}) ---`);
  console.log(`StartDate: ${fields.startDate?.stringValue}`);
  
  const attendanceVal = fields.attendance?.arrayValue?.values || [];
  console.log(`Attendance Records: ${attendanceVal.length}`);
  attendanceVal.forEach(attVal => {
    const att = attVal.mapValue?.fields || {};
    const date = att.date?.stringValue;
    const present = (att.presentStudentIds?.arrayValue?.values || []).map(v => v.stringValue);
    const online = (att.onlineStudentIds?.arrayValue?.values || []).map(v => v.stringValue);
    console.log(`  - Date: ${date} | Present: ${present.length} | Online: ${online.length}`);
  });
}

run().catch(console.error);
