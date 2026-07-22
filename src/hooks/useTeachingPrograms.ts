import { useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { TeachingProgram } from '@/lib/programs/types';
import { INITIAL_IBM_PROGRAMS } from '@/lib/seeds/seed-programs';

export function useTeachingPrograms() {
  const { firestore } = useFirebase();

  const programsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'teaching_programs');
  }, [firestore]);

  const { data: dbPrograms, isLoading, error } = useCollection<TeachingProgram>(programsQuery);

  // Fallback to initial seed programs if DB is empty, has permission delay or loading
  const programs = useMemo(() => {
    if (error || !dbPrograms || dbPrograms.length === 0) {
      return INITIAL_IBM_PROGRAMS;
    }
    return dbPrograms
      .filter(p => !p.archived && (p.module === 'teaching' || !p.module))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [dbPrograms, error]);

  const createProgram = async (programData: Omit<TeachingProgram, 'id' | 'module'>) => {
    if (!firestore) throw new Error('Firestore não inicializado');
    const newId = programData.slug.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const docRef = doc(firestore, 'teaching_programs', newId);
    
    const payload: TeachingProgram = {
      ...programData,
      id: newId,
      module: 'teaching',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    await setDoc(docRef, payload);
    return newId;
  };

  const updateProgram = async (id: string, updates: Partial<TeachingProgram>) => {
    if (!firestore) throw new Error('Firestore não inicializado');
    const docRef = doc(firestore, 'teaching_programs', id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  };

  const archiveProgram = async (id: string) => {
    if (!firestore) throw new Error('Firestore não inicializado');
    const docRef = doc(firestore, 'teaching_programs', id);
    await updateDoc(docRef, {
      archived: true,
      updatedAt: Timestamp.now()
    });
  };

  const duplicateProgram = async (program: TeachingProgram) => {
    const duplicatedSlug = `${program.slug}_copy_${Date.now().toString().slice(-4)}`;
    return createProgram({
      ...program,
      slug: duplicatedSlug,
      name: `${program.name} (Cópia)`,
      order: (program.order || 0) + 1
    });
  };

  return {
    programs,
    isLoading,
    error,
    createProgram,
    updateProgram,
    archiveProgram,
    duplicateProgram
  };
}
