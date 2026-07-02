"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_admin_1 = require("../src/lib/firebase-admin");
async function checkTheoflixCourses() {
    const db = (0, firebase_admin_1.getAdminDb)();
    // Buscar o curso Pneumatologia (ID: pEVUHyQcMFS1pOiG3CeY) e Crescer (ID: 0p9aolpCoHzGrnnue4nP)
    const coursesSnap = await db.collection('courses').get();
    for (const doc of coursesSnap.docs) {
        const course = doc.data();
        if (doc.id === 'pEVUHyQcMFS1pOiG3CeY' || doc.id === '0p9aolpCoHzGrnnue4nP' || doc.id === 'cuidar' || course.name?.toLowerCase().includes('cuidar')) {
            console.log(`\n=== Curso: ${course.name} (ID: ${doc.id}) ===`);
            console.log(`linkedTheoflixId: ${course.linkedTheoflixId}`);
            console.log("Ementa (Syllabus):", JSON.stringify(course.syllabus || [], null, 2));
        }
    }
}
checkTheoflixCourses().catch(console.error);
