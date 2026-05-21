// Sacred Naming: TypeScript types use camelCase; DB field names remain snake_case.

export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';

export type BookingRequestRow = {
  id: string;
  studentId: string;
  teacherId: string;
  matchResultId: string;
  requestedStartAt: string;
  requestedEndAt: string;
  status: BookingStatus;
  studentMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateBookingRequestInput = {
  studentId: string;
  teacherId: string;
  matchResultId: string;
  requestedStartAt: string;
  requestedEndAt: string;
  studentMessage: string | null;
};
