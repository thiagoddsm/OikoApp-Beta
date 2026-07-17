const { getAdminDb } = require('./src/lib/firebase-admin');

async function inspect() {
  try {
    const db = getAdminDb();
    const snap = await db.collection('saved_schedules').limit(10).get();
    console.log("Documents found in saved_schedules:", snap.size);
    snap.docs.forEach(doc => {
      console.log("Document ID:", doc.id);
      const data = doc.data();
      console.log("Month:", data.month);
      console.log("AreaId:", data.areaId);
      if (data.schedule && data.schedule.length > 0) {
        console.log("First schedule item date format:", data.schedule[0].date);
        console.log("First schedule item sample:", JSON.stringify(data.schedule[0]));
      }
      console.log("---");
    });
  } catch (error) {
    console.error("Inspection error:", error);
  }
}

inspect();
