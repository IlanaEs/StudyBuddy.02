import type { TeacherDashboardData } from '../types/teacherDashboard.types';

export const mockTeacherDashboard: TeacherDashboardData = {
  teacher: {
    firstName: 'רונית',
  },
  nextLesson: {
    state: 'upcoming',
    studentName: 'נועה כהן',
    subject: 'מתמטיקה 5 יחידות',
    startsAtLabel: 'היום, 17:00',
    durationLabel: '60 דקות',
    meetingUrl: '#',
    smartBrief: {
      uploadedMaterial: 'דף עבודה — טריגונומטריה.pdf',
      previousLessonSummary: 'הסברנו גבולות ונגזרות בסיסיות. נועה הבינה את הרעיון אך צריכה תרגול.',
      homeworkStatus: 'נשלחה ✅',
    },
  },
  bookingRequests: [
    {
      id: 'req-001',
      studentName: 'יובל לוי',
      subject: 'פיזיקה',
      requestedSlotLabel: 'ראשון, 16:00',
    },
    {
      id: 'req-002',
      studentName: 'תמר אבי',
      subject: 'כימיה',
      requestedSlotLabel: 'שלישי, 18:30',
    },
  ],
  scheduledLessons: [
    { date: '2026-05-24', label: 'נועה כהן — מתמטיקה' },
    { date: '2026-05-26', label: 'יובל לוי — פיזיקה' },
    { date: '2026-05-28', label: 'תמר אבי — כימיה' },
    { date: '2026-05-31', label: 'נועה כהן — מתמטיקה' },
  ],
  recentStudents: [
    {
      id: 'student-noaa',
      name: 'נועה כהן',
      subject: 'מתמטיקה',
      lastLessonLabel: 'שבוע שעבר',
      nextLessonLabel: 'היום, 17:00',
      avatarInitials: 'נכ',
    },
    {
      id: 'student-yuval',
      name: 'יובל לוי',
      subject: 'פיזיקה',
      lastLessonLabel: 'לפני שבועיים',
      nextLessonLabel: 'ראשון, 16:00',
      avatarInitials: 'יל',
    },
    {
      id: 'student-tamar',
      name: 'תמר אבי',
      subject: 'כימיה',
      lastLessonLabel: '3 ימים',
      avatarInitials: 'תא',
    },
  ],
  wallet: {
    expectedMonthlyIncome: 2400,
    pendingPaymentCount: 3,
  },
};
