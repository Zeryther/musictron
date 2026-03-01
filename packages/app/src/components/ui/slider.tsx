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
      'relative flex w-full touch-none select-none items-center group/slider',
      className,
    )}
    {...props}
  >
    <SliderPrimitive.Track
      className={cn(
        'relative h-[3px] w-full grow overflow-hidden rounded-full bg-white/[0.08] transition-[height] duration-150 group-hover/slider:h-1',
        trackClassName,
      )}
    >
      <SliderPrimitive.Range
        className={cn(
          'absolute h-full bg-white/60 transition-colors duration-150 group-hover/slider:bg-foreground',
          rangeClassName,
        )}
      />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className={cn(
        'block h-3 w-3 rounded-full bg-foreground shadow-md transition-all duration-150 focus-visible:outline-none scale-0 group-hover/slider:scale-100',
        thumbClassName,
      )}
    />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
