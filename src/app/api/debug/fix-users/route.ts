import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export async function GET(request: Request) {
    try {
        const auth = getAdminAuth();
        const db = getAdminDb();
        const results: any = {};

        // Fix Francyane (Acesso TheoFlix - "pedindo autorização")
        const franRes = await auth.getUsers([{email: 'francyanedemoraestavares@gmail.com'}]);
        if (franRes.users.length > 0) {
            const franAuth = franRes.users[0];
            results.franAuth = { uid: franAuth.uid, customClaims: franAuth.customClaims };
            
            const franDbSnap = await db.collection('users').doc(franAuth.uid).get();
            if (franDbSnap.exists) {
                const franDbData = franDbSnap.data()!;
                results.franDb = { roles: franDbData.roles, isMember: franDbData.isMember, theoflixAccess: franDbData.theoflixAccess, integrationStatus: franDbData.integrationStatus };
                
                // Dar acesso!
                if (!franDbData.theoflixAccess) {
                    await franDbSnap.ref.update({ theoflixAccess: true, isMember: true, integrationStatus: franDbData.integrationStatus || 'novo_convertido' });
                }
                
                const newClaims = { ...franAuth.customClaims, theoflixAccess: true, isMember: true };
                await auth.setCustomUserClaims(franAuth.uid, newClaims);
                results.franFixed = true;
            }
        }

        // Fix Letícia Blanche (Não recebe email de troca de senha - cadastro duplicado)
        const snapAllLeticia = await db.collection('users')
            .where('name', '>=', 'Letícia Blanche')
            .where('name', '<=', 'Letícia Blanche\uf8ff')
            .get();
            
        results.leticias = [];
        for (const doc of snapAllLeticia.docs) {
            const data = doc.data();
            const uInfo: any = { id: doc.id, email: data.email, roles: data.roles, theoflixAccess: data.theoflixAccess };
            try {
                const authUser = await auth.getUserByEmail(data.email);
                uInfo.authUid = authUser.uid;
            } catch (e: any) {
                uInfo.authError = e.message;
            }
            results.leticias.push(uInfo);
        }

        return NextResponse.json(results);
    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
}
