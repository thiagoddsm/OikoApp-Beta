"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_admin_1 = require("../src/lib/firebase-admin");
async function checkUserPresenceDetails() {
    const db = (0, firebase_admin_1.getAdminDb)();
    // ID do usuário da Fernanda no Firestore da segunda imagem: pqnPOpEqXRdfuKlhawi3
    const userId = 'pqnPOpEqXRdfuKlhawi3';
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
        console.log("Fernanda (ID: pqnPOpEqXRdfuKlhawi3) não encontrada.");
        return;
    }
    const userData = userSnap.data();
    console.log(`=== Fernanda Horsth (ID: ${userId}) ===`);
    console.log("theoflixProgress:", JSON.stringify(userData.journey?.theoflixProgress || {}, null, 2));
    // Encontrar turmas onde ela está matriculada
    const classesSnap = await db.collection('classes').get();
    const enrolledClasses = classesSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(cls => cls.students?.includes(userId));
    console.log(`\nMatriculado em ${enrolledClasses.length} turmas:`);
    for (const cls of enrolledClasses) {
        const courseSnap = await db.collection('courses').doc(cls.courseId).get();
        const courseData = courseSnap.data();
        console.log(`\n- Turma ID: ${cls.id} | Curso: ${courseData?.name} (ID: ${cls.courseId})`);
        console.log("Ementa do curso (Syllabus):", JSON.stringify(courseData?.syllabus || [], null, 2));
        console.log("Presenças registradas na turma:", JSON.stringify(cls.attendance || [], null, 2));
    }
}
checkUserPresenceDetails().catch(console.error);
