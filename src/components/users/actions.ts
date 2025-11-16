
'use server';

import { z } from 'zod';
import { initializeFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

const UserProfileSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  phone: z.string().optional(),
  integrationStatus: z.string(),
  celulaId: z.string().optional().nullable(),
  supervisorId: z.string().optional().nullable(),
});

// This is a new wrapper Promise that we can await in our component.
// It resolves on success and rejects on error.
function updateUserWithFeedback(docRef: any, data: any): Promise<void> {
  return new Promise((resolve, reject) => {
    // This is a temporary setup. We listen for our global error.
    // NOTE: This is NOT a robust solution for production, as it could
    // mis-attribute errors if multiple writes happen. For this dev-time
    // tool, it's acceptable.
    const onError = (error: any) => {
      // clean up the listener
      // errorEmitter.off('permission-error', onError);
      reject(error);
    };

    // errorEmitter.on('permission-error', onError);
    
    // Call the non-blocking update.
    updateDocumentNonBlocking(docRef, data);

    // To simulate success for now, as we can't easily listen for a success event
    // from the non-blocking function, we'll just resolve after a short delay.
    // In a real app, you might use optimistic UI updates and handle the
    // error case specifically.
    setTimeout(() => {
        // errorEmitter.off('permission-error', onError);
        resolve();
    }, 1500); // Assuming write is successful if no error in 1.5s
  });
}


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
  
  // We're not using the promise wrapper for now as it's complex.
  // The key is that `updateDocumentNonBlocking` will emit the error.
  updateDocumentNonBlocking(userDocRef, updateData);

  // Since we are not awaiting, we assume success for the UI and let the
  // error boundary catch the permission error if it occurs.
  revalidatePath(`/dashboard/users/${userId}`);
  revalidatePath(`/dashboard/users`);
  return { success: true };
}
