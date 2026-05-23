export type LessonState = 'upcoming' | 'active' | 'none';

export type ChatState = 'open' | 'locked' | 'none';

export type StudentDashboardLesson =
  | {
      state: 'upcoming' | 'active';
      subject: string;
      teacherName: string;
      startsAtLabel: string;
      durationLabel: string;
      meetingUrl: string;
    }
  | {
      state: 'none';
    };

export type StudentDashboardTeacher = {
  id: string;
  name: string;
  subject: string;
  avatarUrl?: string;
  initials: string;
};

export type StudentDashboardChat =
  | {
      state: 'open' | 'locked';
      teacherName: string;
    }
  | {
      state: 'none';
    };

export type StudentDashboardData = {
  student: {
    firstName: string;
  };
  lesson: StudentDashboardLesson;
  teachers: StudentDashboardTeacher[];
  chat: StudentDashboardChat;
  monthlyStudyHours: number;
};

export const mockStudentDashboard: StudentDashboardData = {
  student: {
    firstName: 'נועה',
  },
  lesson: {
    state: 'active',
    subject: 'מתמטיקה 5 יחידות',
    teacherName: 'דנה לוי',
    startsAtLabel: 'היום, 18:00',
    durationLabel: '60 דקות',
    meetingUrl: '#',
  },
  teachers: [
    {
      id: 'teacher-dana-levi',
      name: 'דנה לוי',
      subject: 'מתמטיקה',
      initials: 'דל',
    },
    {
      id: 'teacher-ori-cohen',
      name: 'אורי כהן',
      subject: 'אנגלית',
      initials: 'אכ',
    },
    {
      id: 'teacher-maya-shahar',
      name: 'מאיה שחר',
      subject: 'פיזיקה',
      initials: 'מש',
    },
  ],
  chat: {
    state: 'open',
    teacherName: 'דנה לוי',
  },
  monthlyStudyHours: 12,
};
