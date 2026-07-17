import { Timestamp } from 'firebase/firestore';

export type ServiceScheduleMode = 'unified' | 'individual' | 'grouped';
export type AreaType = 'regular' | 'worship';

export type ServiceGroup = {
  name: string;
  eventIds: string[];
};

export type AreaOfService = {
  id: string;
  name: string;
  areaType?: AreaType;
  leaderId?: string;
  leaderContact?: string;
  scheduleMode?: ServiceScheduleMode;
  serviceGroups?: ServiceGroup[];
  roles?: string[];
  tenantId?: string;
  unifiedCelebrations?: boolean;
  unifiedGroups?: { name: string; eventNames: string[] }[];
};

export type Team = {
  id: string;
  name: string;
  tenantId?: string;
};

export type VolunteeringEvent = {
  id: string;
  name: string;
  time: string;
  date?: string;
  frequency?: 'semanal' | 'pontual';
  dayOfWeek?: string;
  requiredAreas?: { areaId: string; quantity: number }[];
  room?: string;
  tenantId?: string;
};

export type ReservationCategory = {
  id: string;
  name: string;
  tenantId?: string;
};

export type Room = {
  id: string;
  name: string;
  tenantId?: string;
};

export type RoomReservation = {
  id: string;
  eventName: string;
  requesterId: string;
  rooms: string[];
  startDateTime: Timestamp;
  endDateTime: Timestamp;
  recurrenceEndDate?: Timestamp;
  notes?: string;
  equipmentNotes?: string;
  kitchenUsage?: boolean;
  requiredPatrimonyIds?: string[];
  status: 'pending' | 'approved' | 'rejected';
  frequency?: 'pontual' | 'semanal' | 'quinzenal' | 'mensal' | 'multiplas';
  dayOfWeek?: string;
  weekOfMonth?: '1' | '2' | '3' | '4' | 'last';
  createdAt?: Timestamp;
  categoryId?: string;
  specificDates?: string[];
  tenantId?: string;
};

export type SavedSchedule = {
  id: string;
  areaId: string;
  month: string;
  schedule: {
    date: string;
    eventName: string;
    areaId: string;
    teamId: string | null;
    teamName: string | null;
    memberIds: string[];
  }[];
  tenantId?: string;
};
