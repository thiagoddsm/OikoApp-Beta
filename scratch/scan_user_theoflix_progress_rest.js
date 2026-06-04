async function run() {
  let url = 'https://firestore.googleapis.com/v1/projects/studio-1424813022-71754/databases/(default)/documents/users?pageSize=300';
  let allUsers = [];
  
  while (url) {
    console.log('Fetching users page...');
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    if (data.documents) {
      allUsers = allUsers.concat(data.documents);
    }
    if (data.nextPageToken) {
      url = `https://firestore.googleapis.com/v1/projects/studio-1424813022-71754/databases/(default)/documents/users?pageSize=300&pageToken=${data.nextPageToken}`;
    } else {
      url = null;
    }
  }

  console.log(`Total users fetched: ${allUsers.length}`);

  const usersWithProgress = [];
  for (const doc of allUsers) {
    const parts = doc.name.split('/');
    const id = parts[parts.length - 1];
    const fields = doc.fields || {};
    const name = fields.name?.stringValue || 'Unnamed';
    
    // Parse journey maps
    const journey = fields.journey?.mapValue?.fields || {};
    const theoflixProgressVal = journey.theoflixProgress?.mapValue?.fields;
    const memberCourseProgressVal = journey.memberCourseProgress?.mapValue?.fields;

    let theoflixProgress = null;
    if (theoflixProgressVal) {
      theoflixProgress = {};
      for (const [courseId, courseData] of Object.entries(theoflixProgressVal)) {
        const episodeMap = courseData.mapValue?.fields || {};
        theoflixProgress[courseId] = {};
        for (const [epId, epVal] of Object.entries(episodeMap)) {
          theoflixProgress[courseId][epId] = epVal.booleanValue || false;
        }
      }
    }

    let memberCourseProgress = null;
    if (memberCourseProgressVal) {
      memberCourseProgress = {};
      for (const [modKey, modVal] of Object.entries(memberCourseProgressVal)) {
        memberCourseProgress[modKey] = modVal.booleanValue || false;
      }
    }

    if (theoflixProgress || memberCourseProgress) {
      usersWithProgress.push({
        id,
        name,
        theoflixProgress,
        memberCourseProgress
      });
    }
  }

  console.log(`Found ${usersWithProgress.length} users with progress data:`);
  for (const user of usersWithProgress) {
    console.log(`\nUser: ${user.name} (${user.id})`);
    if (user.theoflixProgress) {
      console.log(`  TheoFlix Progress:`);
      for (const [courseId, eps] of Object.entries(user.theoflixProgress)) {
        console.log(`    Course: ${courseId} -> ${JSON.stringify(eps)}`);
      }
    }
    if (user.memberCourseProgress) {
      console.log(`  Member Course Progress:`);
      console.log(`    ${JSON.stringify(user.memberCourseProgress)}`);
    }
  }
}

run().catch(console.error);
