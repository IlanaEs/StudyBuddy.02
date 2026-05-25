import type { ComponentPropsWithoutRef } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type BentoCardProps = ComponentPropsWithoutRef<typeof Card> & {
  title?: string;
  description?: string;
};

export function BentoCard({ className, children, title, description, ...props }: BentoCardProps) {
  return (
    <Card className={cn('border-border/70 bg-card/95 shadow-sm', className)} {...props}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  );
}
