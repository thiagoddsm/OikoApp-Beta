async function run() {
  const url = 'https://firestore.googleapis.com/v1/projects/studio-1424813022-71754/databases/(default)/documents/theoflix_courses';
  console.log('Fetching theoflix_courses...');
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const docs = data.documents || [];
  
  for (const doc of docs) {
    const parts = doc.name.split('/');
    const id = parts[parts.length - 1];
    const fields = doc.fields || {};
    const title = fields.title?.stringValue || 'Unnamed';
    console.log(`\n========================================`);
    console.log(`TheoFlix Course ID: ${id} (${title})`);
    
    const episodes = fields.episodes?.arrayValue?.values || [];
    console.log(`Episodes count: ${episodes.length}`);
    episodes.forEach((epVal, idx) => {
      const ep = epVal.mapValue?.fields || {};
      const epTitle = ep.title?.stringValue || 'Untitled';
      const epYoutubeId = ep.youtubeId?.stringValue || 'No YouTube ID';
      console.log(`  [${idx}] Title: "${epTitle}", youtubeId: "${epYoutubeId}"`);
    });
  }
}

run().catch(console.error);
