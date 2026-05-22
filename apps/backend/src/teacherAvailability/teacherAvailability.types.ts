// Sacred Naming: TypeScript types use camelCase; DB field names remain snake_case.

export type SlotAlignment = 'window_start' | 'round_hour';

export type TeacherSchedulingPrefs = {
  teacherId: string;
  defaultLessonDurationMinutes: number;
  defaultBreakDurationMinutes: number;
  slotAlignment: SlotAlignment;
};

// A single generated lesson-ready time slot (ISO timestamps, UTC).
export type GeneratedSlot = {
  startAt: string;
  endAt: string;
};

export type AvailableSlotsResult = {
  teacherId: string;
  date: string;
  lessonDurationMinutes: number;
  breakDurationMinutes: number;
  slotAlignment: SlotAlignment;
  availableSlots: GeneratedSlot[];
};

export type AvailabilitySlotRow = {
  id: string;
  teacherId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateAvailabilitySlotInput = {
  teacherId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type UpdateAvailabilitySlotInput = {
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  isActive?: boolean;
};
