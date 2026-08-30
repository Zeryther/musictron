import React from 'react'
import { cn } from '@/lib/utils'

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-2xl border border-foreground/[0.06] bg-foreground/[0.02] p-6',
      className,
    )}
    {...props}
  />
))
Card.displayName = 'Card'

export { Card }
