'use server';

import { z } from 'zod';
import { initializeFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

const UserProfileSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  phone: z.string().optional(),
  integrationStatus: z.string(),
  celulaId: z.string().optional().nullable(),
  supervisorId: z.string().optional().nullable(),
});

export async function updateUserProfile(userId: string, data: unknown) {
  const validatedFields = UserProfileSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      success: false,
      error: "Dados inválidos: " + JSON.stringify(validatedFields.error.flatten().fieldErrors),
    };
  }

  const { firestore } = initializeFirebase();
  const userDocRef = doc(firestore, 'users', userId);

  try {
    const { name, phone, integrationStatus, celulaId, supervisorId } = validatedFields.data;
    
    await updateDoc(userDocRef, {
      name,
      phone,
      integrationStatus,
      'hierarchy.celulaId': celulaId || null,
      'hierarchy.supervisorId': supervisorId || null,
    });

    revalidatePath(`/dashboard/users/${userId}`);
    revalidatePath(`/dashboard/users`);
    return { success: true };
  } catch (error) {
    console.error("Error updating user profile:", error);
    return { success: false, error: "Falha ao atualizar o perfil no banco de dados." };
  }
}
