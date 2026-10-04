import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET(request: Request) {
    try {
        const db = getAdminDb();
        const results: any = { enrolledClasses: [], attendanceRecords: [], repositions: [] };

        // 1. Encontrar a usuária Mônica
        const usersSnap = await db.collection('users')
            .where('name', '>=', 'Mônica Cristina')
            .where('name', '<=', 'Mônica Cristina\uf8ff')
            .get();

        if (usersSnap.empty) {
            return NextResponse.json({ error: 'Usuária não encontrada' });
        }

        const user = usersSnap.docs[0];
        const userId = user.id;
        results.user = { id: userId, name: user.data().name, email: user.data().email };

        // 2. Buscar todas as turmas
        const classesSnap = await db.collection('classes').get();
        
        for (const clsDoc of classesSnap.docs) {
            const cls = clsDoc.data();
            
            // Verifica se está matriculada
            const isEnrolled = cls.students?.includes(userId);
            if (isEnrolled) {
                results.enrolledClasses.push({
                    classId: clsDoc.id,
                    className: cls.name,
                    courseId: cls.courseId
                });
            }

            // Verifica presenças no array 'attendance'
            if (cls.attendance && Array.isArray(cls.attendance)) {
                for (const att of cls.attendance) {
                    const isPresent = att.presentStudentIds?.includes(userId);
                    const isOnline = att.onlineStudentIds?.includes(userId);
                    const repoMatch = att.repositions?.find((r: any) => r.studentId === userId);

                    if (isPresent || isOnline || repoMatch) {
                        results.attendanceRecords.push({
                            classId: clsDoc.id,
                            className: cls.name,
                            courseId: cls.courseId,
                            date: att.date,
                            dateStr: att.dateStr,
                            moduleIndex: att.moduleIndex,
                            syllabusId: att.syllabusId,
                            status: isPresent ? 'present' : (isOnline ? 'online' : 'repo_only'),
                            repoInfo: repoMatch || null
                        });
                    }
                }
            }
        }

        return NextResponse.json(results);
    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
}
