import { useMemo } from 'react';
import { useFirebase } from '@/firebase';
import { JourneyApplicationService } from '../services/JourneyApplicationService';
import { ActivityService } from '../services/ActivityService';
import { AutomationService } from '../services/AutomationService';
import { AutomationRepository } from '../repositories/AutomationRepository';

export function useJourneyService() {
  const { firestore } = useFirebase();

  const service = useMemo(() => {
    if (!firestore) return null;
    const automationRepo = new AutomationRepository(firestore);
    const automationService = new AutomationService(automationRepo);
    const activityService = new ActivityService(firestore, automationService);
    return new JourneyApplicationService(firestore, activityService);
  }, [firestore]);

  return service;
}
