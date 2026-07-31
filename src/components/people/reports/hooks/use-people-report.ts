'use client';

import { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { query, collection } from 'firebase/firestore';
import { PeopleQueryFilter, searchPeople, REPORT_PRESETS, ReportPreset } from '@/domain/people/people-query';

const initialFilters: PeopleQueryFilter = {
  searchTerm: '',
  personal: {
    integrationStatus: 'all',
    gender: 'all',
    maritalStatus: 'all',
    isBaptized: 'all',
    birthMonth: 'all',
    ageMin: '',
    ageMax: '',
    tag: 'all',
  },
  journey: {
    proximoPasso: 'all',
    proximoPassoStatus: 'all',
    caminhadaInicio: 'all',
    igrejaAntiga: '',
    comoConheceu: '',
    nomeConvidou: '',
  },
  gc: {
    hasGc: 'all',
    cellId: 'all',
    redeId: 'all',
    areaId: 'all',
    role: 'all',
  },
  ministry: {
    isVolunteer: 'all',
    serviceAreaId: 'all',
    teamId: 'all',
  },
  teaching: {
    membresiaCompleted: 'all',
    hasCourse: 'all',
    courseId: 'all',
  },
  completeness: {
    missingPhone: false,
    missingPhoto: false,
    missingAddress: false,
    missingCpf: false,
    missingBirthDate: false,
    missingMaritalStatus: false,
  },
  location: {
    bairro: 'all',
    cidade: 'all',
  },
};

export function usePeopleReport() {
  const { firestore, user } = useFirebase();
  const [filters, setFilters] = useState<PeopleQueryFilter>(initialFilters);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Firestore Queries
  const usersQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'users')) : null, [firestore, user]);
  const cellsQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'cells')) : null, [firestore, user]);
  const serviceAreasQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'areas_of_service')) : null, [firestore, user]);
  const teamsQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'teams')) : null, [firestore, user]);
  const coursesQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'courses')) : null, [firestore, user]);
  const redesQ = useMemoFirebase(() => firestore && user ? query(collection(firestore, 'redes')) : null, [firestore, user]);

  const { data: users, isLoading: loadingUsers } = useCollection<any>(usersQ);
  const { data: cells, isLoading: loadingCells } = useCollection<any>(cellsQ);
  const { data: serviceAreas, isLoading: loadingAreas } = useCollection<any>(serviceAreasQ);
  const { data: teams, isLoading: loadingTeams } = useCollection<any>(teamsQ);
  const { data: courses, isLoading: loadingCourses } = useCollection<any>(coursesQ);
  const { data: redes, isLoading: loadingRedes } = useCollection<any>(redesQ);

  const filteredUsers = useMemo(() => {
    return searchPeople(users || [], filters, cells || [], serviceAreas || [], teams || []);
  }, [users, filters, cells, serviceAreas, teams]);

  const applyPreset = (preset: ReportPreset) => {
    setActivePresetId(preset.id);
    setFilters({
      ...initialFilters,
      ...preset.filters,
      personal: { ...initialFilters.personal, ...preset.filters.personal },
      journey: { ...initialFilters.journey, ...preset.filters.journey },
      gc: { ...initialFilters.gc, ...preset.filters.gc },
      ministry: { ...initialFilters.ministry, ...preset.filters.ministry },
      teaching: { ...initialFilters.teaching, ...preset.filters.teaching },
      completeness: { ...initialFilters.completeness, ...preset.filters.completeness },
      location: { ...initialFilters.location, ...preset.filters.location },
    });
  };

  const clearFilters = () => {
    setActivePresetId(null);
    setFilters(initialFilters);
  };

  const updateSearchTerm = (term: string) => {
    setFilters(prev => ({ ...prev, searchTerm: term }));
  };

  const updatePersonalFilters = (personal: Partial<PeopleQueryFilter['personal']>) => {
    setActivePresetId(null);
    setFilters(prev => ({ ...prev, personal: { ...prev.personal, ...personal } }));
  };

  const updateJourneyFilters = (journey: Partial<PeopleQueryFilter['journey']>) => {
    setActivePresetId(null);
    setFilters(prev => ({ ...prev, journey: { ...prev.journey, ...journey } }));
  };

  const updateGcFilters = (gc: Partial<PeopleQueryFilter['gc']>) => {
    setActivePresetId(null);
    setFilters(prev => ({ ...prev, gc: { ...prev.gc, ...gc } }));
  };

  const updateMinistryFilters = (ministry: Partial<PeopleQueryFilter['ministry']>) => {
    setActivePresetId(null);
    setFilters(prev => ({ ...prev, ministry: { ...prev.ministry, ...ministry } }));
  };

  const updateTeachingFilters = (teaching: Partial<PeopleQueryFilter['teaching']>) => {
    setActivePresetId(null);
    setFilters(prev => ({ ...prev, teaching: { ...prev.teaching, ...teaching } }));
  };

  const updateCompletenessFilters = (completeness: Partial<PeopleQueryFilter['completeness']>) => {
    setActivePresetId(null);
    setFilters(prev => ({ ...prev, completeness: { ...prev.completeness, ...completeness } }));
  };

  const updateLocationFilters = (location: Partial<PeopleQueryFilter['location']>) => {
    setActivePresetId(null);
    setFilters(prev => ({ ...prev, location: { ...prev.location, ...location } }));
  };

  const isLoading = loadingUsers || loadingCells || loadingAreas || loadingTeams || loadingCourses || loadingRedes;

  return {
    users: users || [],
    filteredUsers,
    filters,
    activePresetId,
    cells: cells || [],
    serviceAreas: serviceAreas || [],
    teams: teams || [],
    courses: courses || [],
    redes: redes || [],
    isLoading,
    applyPreset,
    clearFilters,
    updateSearchTerm,
    updatePersonalFilters,
    updateJourneyFilters,
    updateGcFilters,
    updateMinistryFilters,
    updateTeachingFilters,
    updateCompletenessFilters,
    updateLocationFilters,
  };
}
