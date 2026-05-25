export type TeacherLessonState = 'upcoming' | 'active' | 'none';

export type SmartBrief = {
  uploadedMaterial?: string;
  previousLessonSummary?: string;
  homeworkStatus?: string;
};

export type TeacherNextLesson =
  | {
      state: 'upcoming' | 'active';
      studentName: string;
      subject: string;
      startsAtLabel: string;
      durationLabel: string;
      meetingUrl: string;
      smartBrief?: SmartBrief;
    }
  | { state: 'none' };

export type BookingRequest = {
  id: string;
  studentName: string;
  subject: string;
  requestedSlotLabel: string;
};

export type ScheduledLesson = {
  date: string; // ISO date: YYYY-MM-DD
  label?: string;
};

export type RecentStudent = {
  id: string;
  name: string;
  subject: string;
  lastLessonLabel?: string;
  nextLessonLabel?: string;
  avatarInitials: string;
};

export type WalletSummary = {
  expectedMonthlyIncome: number;
  pendingPaymentCount: number;
};

export type TeacherDashboardData = {
  teacher: {
    firstName: string;
  };
  nextLesson: TeacherNextLesson;
  bookingRequests: BookingRequest[];
  scheduledLessons: ScheduledLesson[];
  recentStudents: RecentStudent[];
  wallet: WalletSummary;
};
