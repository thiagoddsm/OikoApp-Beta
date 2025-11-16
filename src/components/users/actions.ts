
'use server';

import { z } from 'zod';
import { initializeFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const UserProfileSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  phone: z.string().optional(),
  integrationStatus: z.string(),
  celulaId: z.string().optional().nullable(),
  supervisorId: z.string().optional().nullable(),
});

export async function updateUserProfile(userId: string, data: unknown): Promise<{ success: boolean; error?: string; }> {
  const validatedFields = UserProfileSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Dados inválidos: " + JSON.stringify(validatedFields.error.flatten().fieldErrors),
    };
  }

  const { firestore } = initializeFirebase();
  const userDocRef = doc(firestore, 'users', userId);

  const { name, phone, integrationStatus, celulaId, supervisorId } = validatedFields.data;
  
  const updateData = {
    name,
    phone,
    integrationStatus,
    'hierarchy.celulaId': celulaId || null,
    'hierarchy.supervisorId': supervisorId || null,
  };

  try {
    await updateDoc(userDocRef, updateData);
    revalidatePath(`/dashboard/users/${userId}`);
    revalidatePath(`/dashboard/users`);
    return { success: true };
  } catch (error: any) {
    // Instead of a generic error, we now create and emit a detailed one.
    const permissionError = new FirestorePermissionError({
      path: userDocRef.path,
      operation: 'update',
      requestResourceData: updateData,
    });
    
    // We emit the error globally so it can be caught by our listener.
    errorEmitter.emit('permission-error', permissionError);

    // We still return a failure state to the client component.
    return { 
      success: false, 
      error: "Permissões insuficientes. Verifique as regras de segurança." 
    };
  }
}
