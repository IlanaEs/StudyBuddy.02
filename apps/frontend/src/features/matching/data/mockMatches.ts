import type { MatchResult } from '../types/matching.types';
import { mockTeachers } from './mockTeachers';

const [teacher1, teacher2, teacher3] = mockTeachers as [
  (typeof mockTeachers)[number],
  (typeof mockTeachers)[number],
  (typeof mockTeachers)[number],
];

export const mockMatches: MatchResult[] = [
  {
    id: 'match-1', rank: 1, matchScore: 97,
    reason: 'התאמה גבוהה: מקצוע, לו״ז, ותקציב',
    teacher: teacher1,
    matchBadges: [
      { icon: '🎯', label: 'התאמת תוכן', detail: 'מלמדת בדיוק את המקצוע שבחרת.' },
      { icon: '🕒', label: 'התאמת לו״ז', detail: 'פנויה בשעות הערב בדיוק כפי שביקשת.' },
      { icon: '💰', label: 'התאמת כיס', detail: 'תואמת את טווח המחיר המבוקש.' },
    ],
  },
  {
    id: 'match-2', rank: 2, matchScore: 91,
    reason: 'התאמה טובה מאוד: מקצוע וגישה',
    teacher: teacher2,
    matchBadges: [
      { icon: '🎯', label: 'התאמת תוכן', detail: 'מתמחה בדיוק בתחום שנבחר.' },
      { icon: '🧠', label: 'התאמת גישה', detail: 'פדגוגיה פרקטית ומוכחת.' },
    ],
  },
  {
    id: 'match-3', rank: 3, matchScore: 85,
    reason: 'התאמה טובה: זמינות גבוהה',
    teacher: teacher3,
    matchBadges: [
      { icon: '🕒', label: 'זמינות גבוהה', detail: 'פנויה כמעט בכל שעה.' },
      { icon: '🧠', label: 'גישה תומכת', detail: 'ניסיון מוכח עם תלמידים מגוונים.' },
    ],
  },
];
