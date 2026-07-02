import { getAdminDb } from './src/lib/firebase-admin';

async function checkUserPresence() {
  const db = getAdminDb();
  
  // 1. Procurar usuária Fernanda
  const usersSnap = await db.collection('users')
    .where('name', '>=', 'Fernanda')
    .get();
  
  const userDocs = usersSnap.docs.filter(doc => 
    doc.data().name?.toLowerCase().includes('horsth')
  );

  if (userDocs.length === 0) {
    console.log("Usuário não encontrado.");
    return;
  }

  for (const userDoc of userDocs) {
    const userData = userDoc.data();
    console.log(`\n=== Usuário Encontrado: ${userData.name} (ID: ${userDoc.id}) ===`);
    console.log("Progresso TheoFlix (journey.theoflixProgress):", JSON.stringify(userData.journey?.theoflixProgress || {}, null, 2));

    // 2. Encontrar as matrículas (classes onde o estudante está cadastrado)
    const classesSnap = await db.collection('classes').get();
    const enrolledClasses = classesSnap.docs
      .map(d => ({ id: d.id, ...d.data() } as any))
      .filter(cls => cls.students?.includes(userDoc.id));

    console.log(`\nMatriculado em ${enrolledClasses.length} turmas:`);
    for (const cls of enrolledClasses) {
      const courseSnap = await db.collection('courses').doc(cls.courseId).get();
      const courseData = courseSnap.data();
      console.log(`- Turma ID: ${cls.id} | Curso: ${courseData?.name} (ID: ${cls.courseId})`);
      console.log(`  Grade de presenças da turma:`, JSON.stringify(cls.attendance || [], null, 2));
    }
  }
}

checkUserPresence().catch(console.error);
