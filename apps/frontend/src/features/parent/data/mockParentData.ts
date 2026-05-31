// Mock data for the Parent Dashboard — replace with real API calls when ready

export type LessonStatus = 'closed' | 'pending_approval';

export type Child = {
  id: string;
  name: string;
};

export type UpcomingLesson = {
  subject: string;
  teacherName: string;
  day: string;
  date: string;
  time: string;
} | null;

export type PendingApproval = {
  teacherName: string;
  subject: string;
  date: string;
  amount: number;
} | null;

export type HomeworkState = 'none' | { description: string };

export type TaskStatus = 'in_progress' | 'completed';

export type LatestLessonUpdate = {
  teacherNote: string;
  homework: HomeworkState;
  taskStatus: TaskStatus;
} | null;

export type PreviousLesson = {
  date: string;
  teacherName: string;
  subject: string;
  status: LessonStatus;
};

export type ChildDashboardData = {
  upcomingLesson: UpcomingLesson;
  pendingApproval: PendingApproval;
  latestLessonUpdate: LatestLessonUpdate;
  previousLessons: PreviousLesson[];
};

export type MockParentData = {
  parentName: string;
  children: Child[];
  dashboardByChild: Record<string, ChildDashboardData>;
};

export const mockParentData: MockParentData = {
  parentName: 'מיכל',
  children: [
    { id: 'omer', name: 'עומר' },
    { id: 'daniel', name: 'דניאל' },
    { id: 'maya', name: 'מאיה' },
  ],
  dashboardByChild: {
    omer: {
      upcomingLesson: {
        subject: 'מתמטיקה',
        teacherName: 'שירה כהן',
        day: 'רביעי',
        date: '28.05.2026',
        time: '17:00',
      },
      pendingApproval: {
        teacherName: 'שירה כהן',
        subject: 'מתמטיקה',
        date: '21.05.2026',
        amount: 180,
      },
      latestLessonUpdate: {
        teacherNote:
          'עומר היה מרוכז מאוד היום. תרגלנו בעיות תנועה וראינו שיפור משמעותי.',
        homework: { description: 'לפתור תרגילים 1–5 בעמוד 40.' },
        taskStatus: 'in_progress',
      },
      previousLessons: [
        { date: '21.05.2026', teacherName: 'שירה כהן', subject: 'מתמטיקה', status: 'pending_approval' },
        { date: '14.05.2026', teacherName: 'שירה כהן', subject: 'מתמטיקה', status: 'closed' },
        { date: '07.05.2026', teacherName: 'שירה כהן', subject: 'מתמטיקה', status: 'closed' },
      ],
    },
    daniel: {
      upcomingLesson: null,
      pendingApproval: null,
      latestLessonUpdate: {
        teacherNote:
          'דניאל עשה קפיצה גדולה בהבנת הנקרא השבוע. הסיכומים שלו הולכים ומשתפרים.',
        homework: 'none',
        taskStatus: 'completed',
      },
      previousLessons: [
        { date: '19.05.2026', teacherName: 'יונתן לוי', subject: 'ספרות', status: 'closed' },
        { date: '12.05.2026', teacherName: 'יונתן לוי', subject: 'ספרות', status: 'closed' },
        { date: '05.05.2026', teacherName: 'יונתן לוי', subject: 'ספרות', status: 'closed' },
      ],
    },
    maya: {
      upcomingLesson: {
        subject: 'אנגלית',
        teacherName: 'נועה פרידמן',
        day: 'חמישי',
        date: '29.05.2026',
        time: '16:00',
      },
      pendingApproval: null,
      latestLessonUpdate: null,
      previousLessons: [
        { date: '22.05.2026', teacherName: 'נועה פרידמן', subject: 'אנגלית', status: 'closed' },
        { date: '15.05.2026', teacherName: 'נועה פרידמן', subject: 'אנגלית', status: 'closed' },
        { date: '08.05.2026', teacherName: 'נועה פרידמן', subject: 'אנגלית', status: 'closed' },
      ],
    },
  },
};
