import type { ComponentPropsWithoutRef } from 'react';
import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';

import { fadeInUp } from './motionVariants';

type AnimatedContainerProps = ComponentPropsWithoutRef<typeof motion.div>;

export function AnimatedContainer({ className, variants = fadeInUp, initial = 'hidden', whileInView = 'visible', viewport, ...props }: AnimatedContainerProps) {
  return (
    <motion.div
      className={cn(className)}
      initial={initial}
      variants={variants}
      viewport={{ once: true, amount: 0.2, ...viewport }}
      whileInView={whileInView}
      {...props}
    />
  );
}
