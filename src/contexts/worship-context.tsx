'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc, addDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { useTenant } from '@/contexts/tenant-context';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorshipItemType = 'header' | 'item' | 'song';

export type WorshipItem = {
  id: string;
  type: WorshipItemType;
  order: number;
  title: string;
  /** Duration in seconds (allows MM:SS display) */
  durationSeconds?: number;
  notes?: string;
  // Song-specific fields
  key?: string;
  bpm?: number;
  arrangement?: string;
  // PCS-inspired row color tag
  color?: 'none' | 'purple' | 'blue' | 'green' | 'yellow' | 'red' | 'gray';
};

export type WorshipPlan = {
  id: string;
  title: string;
  serviceEventId?: string;
  serviceEventName?: string;
  date: string;         // "YYYY-MM-DD"
  startTime: string;    // "HH:mm"
  notes?: string;
  templateId?: string;
  items: WorshipItem[];
  tenantId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type WorshipTemplate = {
  id: string;
  name: string;
  description?: string;
  items: WorshipItem[];
  tenantId: string;
  createdAt?: Timestamp;
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface WorshipContextValue {
  plans: WorshipPlan[];
  templates: WorshipTemplate[];
  isLoading: boolean;
  createPlan: (data: Omit<WorshipPlan, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updatePlan: (id: string, data: Partial<WorshipPlan>) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  updatePlanItems: (id: string, items: WorshipItem[]) => Promise<void>;
  createTemplate: (data: Omit<WorshipTemplate, 'id' | 'tenantId' | 'createdAt'>) => Promise<string>;
  updateTemplate: (id: string, data: Partial<WorshipTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  savePlanAsTemplate: (planId: string, templateName: string) => Promise<void>;
  applyTemplate: (templateId: string, planId: string) => Promise<void>;
}

const WorshipContext = createContext<WorshipContextValue | null>(null);

export function useWorship() {
  const ctx = useContext(WorshipContext);
  if (!ctx) throw new Error('useWorship must be used within WorshipProvider');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WorshipProvider({ children }: { children: ReactNode }) {
  const { firestore, user } = useFirebase();
  const { tenantId } = useTenant();

  const plansQ = useMemoFirebase(
    () => (firestore && tenantId && user)
      ? query(collection(firestore, 'worship_plans'), where('tenantId', '==', tenantId), orderBy('date', 'desc'))
      : null,
    [firestore, tenantId, user]
  );
  const templatesQ = useMemoFirebase(
    () => (firestore && tenantId && user)
      ? query(collection(firestore, 'worship_templates'), where('tenantId', '==', tenantId), orderBy('createdAt', 'desc'))
      : null,
    [firestore, tenantId, user]
  );

  const { data: plansRaw, isLoading: plansLoading } = useCollection<WorshipPlan>(plansQ);
  const { data: templatesRaw, isLoading: templatesLoading } = useCollection<WorshipTemplate>(templatesQ);

  const plans: WorshipPlan[] = plansRaw ?? [];
  const templates: WorshipTemplate[] = templatesRaw ?? [];
  const isLoading = plansLoading || templatesLoading;

  // ── Plans ─────────────────────────────────────────────────────────────────

  const createPlan = async (data: Omit<WorshipPlan, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>) => {
    if (!firestore) throw new Error('Firestore not available');
    const ref = await addDoc(collection(firestore, 'worship_plans'), {
      ...data,
      tenantId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return ref.id;
  };

  const updatePlan = async (id: string, data: Partial<WorshipPlan>) => {
    if (!firestore) return;
    await updateDoc(doc(firestore, 'worship_plans', id), { ...data, updatedAt: Timestamp.now() });
  };

  const deletePlan = async (id: string) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, 'worship_plans', id));
  };

  const updatePlanItems = async (id: string, items: WorshipItem[]) => {
    if (!firestore) return;
    await updateDoc(doc(firestore, 'worship_plans', id), { items, updatedAt: Timestamp.now() });
  };

  // ── Templates ─────────────────────────────────────────────────────────────

  const createTemplate = async (data: Omit<WorshipTemplate, 'id' | 'tenantId' | 'createdAt'>) => {
    if (!firestore) throw new Error('Firestore not available');
    const ref = await addDoc(collection(firestore, 'worship_templates'), {
      ...data,
      tenantId,
      createdAt: Timestamp.now(),
    });
    return ref.id;
  };

  const updateTemplate = async (id: string, data: Partial<WorshipTemplate>) => {
    if (!firestore) return;
    await updateDoc(doc(firestore, 'worship_templates', id), data);
  };

  const deleteTemplate = async (id: string) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, 'worship_templates', id));
  };

  const savePlanAsTemplate = async (planId: string, templateName: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
    await createTemplate({ name: templateName, items: plan.items });
  };

  const applyTemplate = async (templateId: string, planId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    const items = template.items.map((item, idx) => ({ ...item, order: idx }));
    await updatePlanItems(planId, items);
  };

  return (
    <WorshipContext.Provider value={{
      plans, templates, isLoading,
      createPlan, updatePlan, deletePlan, updatePlanItems,
      createTemplate, updateTemplate, deleteTemplate, savePlanAsTemplate, applyTemplate,
    }}>
      {children}
    </WorshipContext.Provider>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Compute wall-clock time for each item given plan start time */
export function computeScheduledTimes(
  items: WorshipItem[],
  startTime: string
): (WorshipItem & { scheduledTime?: string })[] {
  const [startH, startM] = startTime.split(':').map(Number);
  let totalSeconds = ((startH || 0) * 60 + (startM || 0)) * 60;

  return items.map(item => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const scheduledTime = item.type !== 'header'
      ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      : undefined;

    if (item.type !== 'header' && item.durationSeconds) {
      totalSeconds += item.durationSeconds;
    }

    return { ...item, scheduledTime };
  });
}

/** Format seconds as "M:SS" */
export function formatDuration(seconds: number): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Parse "M:SS" or plain minutes string to seconds */
export function parseDurationToSeconds(input: string): number {
  if (!input) return 0;
  if (input.includes(':')) {
    const [m, s] = input.split(':').map(Number);
    return (m || 0) * 60 + (s || 0);
  }
  const mins = parseFloat(input);
  return isNaN(mins) ? 0 : Math.round(mins * 60);
}

export function generateItemId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
