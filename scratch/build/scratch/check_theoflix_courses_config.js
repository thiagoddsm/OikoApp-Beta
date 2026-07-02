"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_admin_1 = require("../src/lib/firebase-admin");
async function checkTheoflixCoursesConfig() {
    const db = (0, firebase_admin_1.getAdminDb)();
    // Buscar os dados do theoflix da collection theoflix_courses
    const coursesSnap = await db.collection('theoflix_courses').get();
    console.log("=== Coleção theoflix_courses ===");
    for (const doc of coursesSnap.docs) {
        const course = doc.data();
        console.log(`\nCurso ID: ${doc.id} | Nome: ${course.title || course.name}`);
        console.log("Episodes:", (course.episodes || []).map((e, idx) => `[${idx}] ${e.title} -> Key: ${e.youtubeId || e.title.replace(/\s+/g, '_')}`));
    }
}
checkTheoflixCoursesConfig().catch(console.error);
