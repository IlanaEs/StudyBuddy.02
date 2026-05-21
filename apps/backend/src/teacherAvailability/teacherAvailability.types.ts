// Sacred Naming: TypeScript types use camelCase; DB field names remain snake_case.

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
