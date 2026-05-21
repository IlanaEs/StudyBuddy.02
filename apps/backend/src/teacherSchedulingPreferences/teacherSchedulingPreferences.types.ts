// Sacred Naming: TypeScript types use camelCase; DB field names remain snake_case.

export type SlotAlignment = 'window_start' | 'round_hour';

export type SchedulingPreferencesRow = {
  teacherId: string;
  defaultLessonDurationMinutes: number;
  defaultBreakDurationMinutes: number;
  slotAlignment: SlotAlignment;
};

export type UpdateSchedulingPreferencesInput = {
  defaultLessonDurationMinutes?: number;
  defaultBreakDurationMinutes?: number;
  slotAlignment?: SlotAlignment;
};
