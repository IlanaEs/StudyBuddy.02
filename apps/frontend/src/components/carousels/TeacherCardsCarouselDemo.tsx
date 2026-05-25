import { Star } from 'lucide-react';

import { BentoCard } from '@/components/layout/BentoCard';
import { Badge } from '@/components/ui/badge';

import { DashboardCarousel } from './DashboardCarousel';

const teacherCards = [
  {
    name: 'נועה לוי',
    subject: 'מתמטיקה',
    detail: 'חטיבה ותיכון',
    rating: '4.9',
  },
  {
    name: 'דניאל כהן',
    subject: 'אנגלית',
    detail: 'דיבור וכתיבה',
    rating: '4.8',
  },
  {
    name: 'מאיה רוזן',
    subject: 'פיזיקה',
    detail: 'בגרות 5 יחידות',
    rating: '5.0',
  },
  {
    name: 'יונתן פריד',
    subject: 'לשון',
    detail: 'אסטרטגיות למידה',
    rating: '4.7',
  },
] as const;

export function TeacherCardsCarouselDemo() {
  return (
    <DashboardCarousel ariaLabel="Teacher cards carousel demo" direction="rtl">
      {teacherCards.map((teacher) => (
        <BentoCard className="h-full" key={teacher.name}>
          <div className="flex h-full flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="truncate text-base font-semibold text-foreground">{teacher.name}</h3>
                <p className="text-sm text-muted-foreground">{teacher.detail}</p>
              </div>
              <Badge>{teacher.subject}</Badge>
            </div>
            <div className="mt-auto flex items-center gap-1 text-sm font-medium text-foreground">
              <Star data-icon="inline-start" />
              <span>{teacher.rating}</span>
            </div>
          </div>
        </BentoCard>
      ))}
    </DashboardCarousel>
  );
}
