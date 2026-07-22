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

  // Merge initial seed programs with DB programs so editing one doesn't hide others
  const programs = useMemo(() => {
    const dbMap = new Map<string, TeachingProgram>();
    if (dbPrograms) {
      dbPrograms.forEach(p => {
        if (p.id) dbMap.set(p.id, p);
        if (p.slug) dbMap.set(p.slug, p);
      });
    }

    // Start with initial seed programs, overriding with DB version if present
    const mergedList: TeachingProgram[] = INITIAL_IBM_PROGRAMS.map(seed => {
      return dbMap.get(seed.id) || dbMap.get(seed.slug) || seed;
    });

    // Append any newly created DB programs that were not part of initial seeds
    if (dbPrograms) {
      dbPrograms.forEach(p => {
        const idKey = p.id || p.slug;
        const isSeed = INITIAL_IBM_PROGRAMS.some(s => s.id === idKey || s.slug === idKey);
        if (!isSeed && !mergedList.some(m => m.id === p.id || m.slug === p.slug)) {
          mergedList.push(p);
        }
      });
    }

    return mergedList
      .filter(p => !p.archived && (p.module === 'teaching' || !p.module))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [dbPrograms]);

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
    const existingSeed = INITIAL_IBM_PROGRAMS.find(p => p.id === id || p.slug === id);
    
    await setDoc(docRef, {
      ...(existingSeed || {}),
      ...updates,
      id,
      updatedAt: Timestamp.now()
    }, { merge: true });
  };

  const archiveProgram = async (id: string) => {
    if (!firestore) throw new Error('Firestore não inicializado');
    const docRef = doc(firestore, 'teaching_programs', id);
    await setDoc(docRef, {
      archived: true,
      updatedAt: Timestamp.now()
    }, { merge: true });
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
