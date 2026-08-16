'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, addDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { useTenant } from '@/contexts/tenant-context';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorshipItemType = 'header' | 'item' | 'song';

export type SongAttachment = {
  name: string;
  url: string;
  type: 'pdf' | 'mp3' | 'link';
};

export type DepartmentNotes = {
  general?: string;
  audio?: string;
  video?: string;
  banda?: string;
  [key: string]: string | undefined;
};

export type WorshipItem = {
  id: string;
  type: WorshipItemType;
  order: number;
  title: string;
  /** Duration in seconds (allows MM:SS display). Can be negative for countdowns/pre-service. */
  durationSeconds?: number;
  /** If true, this item occurs before the official start time (subtracts from startTime calculations) */
  isPreService?: boolean;
  notes?: string;
  departmentNotes?: DepartmentNotes;
  // Song-specific fields
  key?: string;
  bpm?: number;
  arrangement?: string;
  artist?: string;
  attachments?: SongAttachment[];
  youtubeUrl?: string;
  vsId?: string;
  /** Cena de iluminação para Lumikit SHOW / DMX (ex: S1, G1, A1, F12, M2) */
  scene?: string;
  // PCS-inspired row color tag
  color?: 'none' | 'purple' | 'blue' | 'green' | 'yellow' | 'red' | 'gray';
};

export type WorshipTimeSlot = {
  id: string;
  type: 'service' | 'rehearsal' | 'other';
  name: string;      // e.g. "Passagem de Som", "Culto Principal", "Call Time"
  date?: string;     // YYYY-MM-DD (defaults to plan date if missing)
  time: string;      // HH:mm
};

export type NeededPosition = {
  id: string;
  role: string;       // e.g., "Baterista", "Vocais", "Câmera 1"
  userId?: string;    // Assigned user ID if any
  userName?: string;  // Cache user name
  status?: 'draft' | 'sent' | 'accepted' | 'declined'; // Status do convite (Planning Center)
  checkedIn?: boolean;
  isDM?: boolean;
};

export type WorshipPlan = {
  id: string;
  title: string;
  serviceEventId?: string;
  serviceEventName?: string;
  date: string;         // "YYYY-MM-DD"
  startTime: string;    // "HH:mm" - Main service start time
  notes?: string;
  templateId?: string;
  items: WorshipItem[];
  timeSlots?: WorshipTimeSlot[];
  neededPositions?: NeededPosition[];
  attachments?: SongAttachment[]; // Anexos gerais do plano de culto (Ex: Roteiro do sermão, Mapa de palco)
  tenantId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  isVirtual?: boolean;
};

export type LibrarySong = {
  id: string;
  title: string;
  artist?: string;
  key?: string;      // Tom padrão
  bpm?: number;     // BPM padrão
  attachments?: SongAttachment[];
  youtubeUrl?: string;
  vsId?: string;     // ID do Multitrack/VS vinculado no Oiko Live
  notes?: string;
  tenantId: string;
  createdAt?: Timestamp;
  lastPlayedDate?: string;
  lastPlayedPlanTitle?: string;
  playCount?: number;
};

export type WorshipTemplate = {
  id: string;
  name: string;
  description?: string;
  items: WorshipItem[];
  neededPositions?: NeededPosition[];
  tenantId: string;
  createdAt?: Timestamp;
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface WorshipContextValue {
  plans: WorshipPlan[];
  templates: WorshipTemplate[];
  librarySongs: LibrarySong[];
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
  // Library Songs Mutators
  createLibrarySong: (data: Omit<LibrarySong, 'id' | 'tenantId' | 'createdAt'>) => Promise<string>;
  updateLibrarySong: (id: string, data: Partial<LibrarySong>) => Promise<void>;
  deleteLibrarySong: (id: string) => Promise<void>;
}

const WorshipContext = createContext<WorshipContextValue | null>(null);

export function useWorship() {
  const ctx = useContext(WorshipContext);
  if (!ctx) throw new Error('useWorship must be used within WorshipProvider');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WorshipProvider({ children }: { children: ReactNode }) {
  const { firestore, user, isUserLoading } = useFirebase();
  const { tenantId } = useTenant();

  const ready = !isUserLoading && !!user && !!firestore && !!tenantId;

  const plansQ = useMemoFirebase(
    () => ready
      ? query(collection(firestore!, 'worship_plans'), where('tenantId', '==', tenantId))
      : null,
    [ready, firestore, tenantId]
  );
  const templatesQ = useMemoFirebase(
    () => ready
      ? query(collection(firestore!, 'worship_templates'), where('tenantId', '==', tenantId))
      : null,
    [ready, firestore, tenantId]
  );
  const librarySongsQ = useMemoFirebase(
    () => ready
      ? query(collection(firestore!, 'worship_songs'), where('tenantId', '==', tenantId))
      : null,
    [ready, firestore, tenantId]
  );

  const { data: plansRaw, isLoading: plansLoading } = useCollection<WorshipPlan>(plansQ);
  const { data: templatesRaw, isLoading: templatesLoading } = useCollection<WorshipTemplate>(templatesQ);
  const { data: librarySongsRaw, isLoading: librarySongsLoading } = useCollection<LibrarySong>(librarySongsQ);

  const plans: WorshipPlan[] = useMemo(
    () => [...(plansRaw ?? [])].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    [plansRaw]
  );
  const templates: WorshipTemplate[] = useMemo(
    () => [...(templatesRaw ?? [])].sort((a, b) => {
      const aTime = a.createdAt?.seconds ?? 0;
      const bTime = b.createdAt?.seconds ?? 0;
      return bTime - aTime;
    }),
    [templatesRaw]
  );
  const librarySongs: LibrarySong[] = useMemo(
    () => {
      const baseSongs = [...(librarySongsRaw ?? [])];
      const decorated = baseSongs.map(song => {
        // Find all physical plans (not virtual) that include this song in their liturgy (items)
        const matchedPlans = (plans ?? []).filter(p => {
          if (p.isVirtual) return false;
          return (p.items ?? []).some(item => {
            if (item.type !== 'song') return false;
            const itemTitle = (item.title ?? '').trim().toLowerCase();
            const songTitle = (song.title ?? '').trim().toLowerCase();
            return itemTitle === songTitle;
          });
        });

        // Sort by date descending (YYYY-MM-DD)
        const sortedMatchedPlans = [...matchedPlans].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

        if (sortedMatchedPlans.length > 0) {
          const latestPlan = sortedMatchedPlans[0];
          return {
            ...song,
            lastPlayedDate: latestPlan.date,
            lastPlayedPlanTitle: latestPlan.title,
            playCount: sortedMatchedPlans.length,
          };
        }

        return {
          ...song,
          lastPlayedDate: undefined,
          lastPlayedPlanTitle: undefined,
          playCount: 0,
        };
      });

      return decorated.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? '', 'pt-BR'));
    },
    [librarySongsRaw, plans]
  );

  const isLoading = plansLoading || templatesLoading || librarySongsLoading;

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
    await createTemplate({
      name: templateName,
      items: plan.items,
      neededPositions: plan.neededPositions || [],
    });
  };

  const applyTemplate = async (templateId: string, planId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    const items = template.items.map((item, idx) => ({ ...item, order: idx }));
    const neededPositions = (template.neededPositions || []).map(p => ({
      ...p,
      status: 'draft' as const, // Reset dynamic assignments to draft when importing template
      userId: p.userId || undefined, 
      userName: p.userName || undefined,
    }));
    await updatePlanItems(planId, items);
    await updateDoc(doc(firestore!, 'worship_plans', planId), {
      neededPositions,
      updatedAt: Timestamp.now(),
    });
  };

  // ── Library Songs ──────────────────────────────────────────────────────────

  const createLibrarySong = async (data: Omit<LibrarySong, 'id' | 'tenantId' | 'createdAt'>) => {
    if (!firestore) throw new Error('Firestore not available');
    const ref = await addDoc(collection(firestore, 'worship_songs'), {
      ...data,
      tenantId,
      createdAt: Timestamp.now()
    });
    return ref.id;
  };

  const updateLibrarySong = async (id: string, data: Partial<LibrarySong>) => {
    if (!firestore) return;
    await updateDoc(doc(firestore, 'worship_songs', id), data);
  };

  const deleteLibrarySong = async (id: string) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, 'worship_songs', id));
  };

  return (
    <WorshipContext.Provider value={{
      plans, templates, librarySongs, isLoading,
      createPlan, updatePlan, deletePlan, updatePlanItems,
      createTemplate, updateTemplate, deleteTemplate, savePlanAsTemplate, applyTemplate,
      createLibrarySong, updateLibrarySong, deleteLibrarySong
    }}>
      {children}
    </WorshipContext.Provider>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Compute wall-clock time for each item given plan start time, including pre-service items */
export function computeScheduledTimes(
  items: WorshipItem[],
  startTime: string
): (WorshipItem & { scheduledTime?: string })[] {
  const [startH, startM] = startTime.split(':').map(Number);
  const baseSeconds = ((startH || 0) * 60 + (startM || 0)) * 60;

  // First pass: calculate total pre-service duration to find the start time of the first item
  const preServiceSeconds = items
    .filter(item => item.type !== 'header' && item.isPreService && item.durationSeconds)
    .reduce((acc, item) => acc + (item.durationSeconds || 0), 0);

  let currentSeconds = baseSeconds - preServiceSeconds;

  return items.map(item => {
    // If it's a header, we don't display a time slot.
    if (item.type === 'header') {
      return { ...item, scheduledTime: undefined };
    }

    // Convert current seconds to 24h format (handling values below zero if necessary, though currentSeconds starts negative)
    // To keep it positive and wrap nicely:
    const normalizedSeconds = (currentSeconds + 24 * 3600) % (24 * 3600);
    const h = Math.floor(normalizedSeconds / 3600);
    const m = Math.floor((normalizedSeconds % 3600) / 60);
    const scheduledTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    if (item.durationSeconds) {
      currentSeconds += item.durationSeconds;
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
