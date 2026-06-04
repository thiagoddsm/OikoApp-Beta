async function run() {
  const url = 'https://firestore.googleapis.com/v1/projects/studio-1424813022-71754/databases/(default)/documents/classes';
  console.log('Fetching classes...');
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const docs = data.documents || [];
  
  const pertencerClasses = docs.filter(doc => {
    return doc.fields?.courseId?.stringValue === 'QehPgdTXhe0veTW4Xf3J';
  });

  console.log(`Found ${pertencerClasses.length} classes for Pertencer course:`);
  for (const doc of pertencerClasses) {
    const parts = doc.name.split('/');
    const id = parts[parts.length - 1];
    const fields = doc.fields || {};
    const name = fields.name?.stringValue || 'Unnamed';
    console.log(`\n--- Class ID: ${id} (${name}) ---`);
    console.log(`StartDate: ${fields.startDate?.stringValue}`);
    
    const attendanceVal = fields.attendance?.arrayValue?.values || [];
    console.log(`Attendance Records: ${attendanceVal.length}`);
    attendanceVal.forEach(attVal => {
      const att = attVal.mapValue?.fields || {};
      const date = att.date?.stringValue;
      const present = (att.presentStudentIds?.arrayValue?.values || []).map(v => v.stringValue);
      const online = (att.onlineStudentIds?.arrayValue?.values || []).map(v => v.stringValue);
      const notes = att.lessonNotes?.mapValue?.fields || {};
      const noteEntries = Object.entries(notes).map(([uid, val]) => `${uid}: ${val.stringValue}`);
      console.log(`  - Date: ${date}`);
      console.log(`    Present: ${JSON.stringify(present)}`);
      console.log(`    Online: ${JSON.stringify(online)}`);
      if (noteEntries.length > 0) {
        console.log(`    Notes: ${JSON.stringify(noteEntries)}`);
      }
    });
  }
}

run().catch(console.error);
