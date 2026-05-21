// Sacred Naming: TypeScript types use camelCase; DB field names remain snake_case.

export type AvailabilityExceptionRow = {
  id: string;
  teacherId: string;
  startsAt: string;
  endsAt: string;
  isAllDay: boolean;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateAvailabilityExceptionInput = {
  teacherId: string;
  startsAt: string;
  endsAt: string;
  isAllDay: boolean;
  reason: string | null;
};

export type UpdateAvailabilityExceptionInput = {
  startsAt?: string;
  endsAt?: string;
  isAllDay?: boolean;
  // undefined = leave unchanged; null = clear the reason field
  reason?: string | null;
};
