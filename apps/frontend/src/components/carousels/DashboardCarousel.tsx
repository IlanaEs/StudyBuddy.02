import { Children, type ReactNode } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type DashboardCarouselProps = {
  children: ReactNode;
  direction?: 'ltr' | 'rtl';
  className?: string;
  viewportClassName?: string;
  slideClassName?: string;
  ariaLabel?: string;
};

export function DashboardCarousel({
  children,
  direction = 'rtl',
  className,
  viewportClassName,
  slideClassName,
  ariaLabel = 'Dashboard carousel',
}: DashboardCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    direction,
    dragFree: true,
    containScroll: 'trimSnaps',
  });
  const slides = Children.toArray(children);

  return (
    <section aria-label={ariaLabel} className={cn('flex flex-col gap-3', className)} dir={direction}>
      <div className="flex items-center justify-end gap-2">
        <Button aria-label="Previous slide" onClick={() => emblaApi?.scrollPrev()} size="icon" type="button" variant="outline">
          <ChevronLeft data-icon="inline-start" />
        </Button>
        <Button aria-label="Next slide" onClick={() => emblaApi?.scrollNext()} size="icon" type="button" variant="outline">
          <ChevronRight data-icon="inline-start" />
        </Button>
      </div>
      <div className={cn('overflow-hidden', viewportClassName)} ref={emblaRef}>
        <div className="flex touch-pan-y gap-4">
          {slides.map((child, index) => (
            <div className={cn('min-w-0 flex-[0_0_82%] sm:flex-[0_0_48%] lg:flex-[0_0_31%]', slideClassName)} key={index}>
              {child}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
