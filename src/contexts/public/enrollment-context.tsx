'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, addDoc, Timestamp } from 'firebase/firestore';

export type Course = {
  id: string;
  name: string;
  description: string;
  ministryName: string;
  type?: 'trilho' | 'eletivo';
  ebdTrack?: 'teologico' | 'biblico' | 'discipulado';
};

export type Class = {
  id: string;
  courseId: string;
  name: string;
  students: string[];
  maxStudents?: number;
  frequency: 'pontual' | 'semanal' | 'quinzenal' | 'mensal';
  startTime: string;
  dayOfWeek?: string;
};

interface PublicEnrollmentContextType {
  courses: Course[];
  classes: Class[];
  isLoading: boolean;
  submitEnrollmentRequest: (data: {
    courseId: string;
    classId?: string;
    name: string;
    email: string;
    phone: string;
  }) => Promise<void>;
}

const PublicEnrollmentContext = createContext<PublicEnrollmentContextType | undefined>(undefined);

export function PublicEnrollmentProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();

  const coursesQ = useMemoFirebase(() => firestore ? query(collection(firestore, 'courses')) : null, [firestore]);
  const classesQ = useMemoFirebase(() => firestore ? query(collection(firestore, 'classes')) : null, [firestore]);

  const { data: courses, isLoading: lco } = useCollection<Course>(coursesQ);
  const { data: classes, isLoading: lcl } = useCollection<Class>(classesQ);

  const isLoading = lco || lcl;

  const value = useMemo(() => ({
    courses: courses || [],
    classes: classes || [],
    isLoading,
    submitEnrollmentRequest: async (data: any) => {
        if (!firestore) throw new Error("Database not connected");
        await addDoc(collection(firestore, 'enrollment_requests'), {
            ...data,
            status: 'pending',
            createdAt: Timestamp.now()
        });
    }
  }), [courses, classes, isLoading, firestore]);

  return (
    <PublicEnrollmentContext.Provider value={value}>
      {children}
    </PublicEnrollmentContext.Provider>
  );
}

export function usePublicEnrollment() {
  const context = useContext(PublicEnrollmentContext);
  if (context === undefined) {
    throw new Error('usePublicEnrollment must be used within a PublicEnrollmentProvider');
  }
  return context;
}
