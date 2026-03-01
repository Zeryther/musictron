import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { cn } from '@/lib/utils'

const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
    trackClassName?: string
    thumbClassName?: string
    rangeClassName?: string
  }
>(({ className, trackClassName, thumbClassName, rangeClassName, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex w-full touch-none select-none items-center group',
      className,
    )}
    {...props}
  >
    <SliderPrimitive.Track
      className={cn(
        'relative h-1 w-full grow overflow-hidden rounded-full bg-white/10',
        trackClassName,
      )}
    >
      <SliderPrimitive.Range
        className={cn('absolute h-full bg-white/70 group-hover:bg-primary', rangeClassName)}
      />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className={cn(
        'block h-3 w-3 rounded-full bg-white shadow transition-all focus-visible:outline-none opacity-0 group-hover:opacity-100',
        thumbClassName,
      )}
    />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
