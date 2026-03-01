import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/85 active:scale-[0.97]',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.97]',
        outline:
          'border border-border/60 bg-transparent hover:bg-accent/60 hover:text-accent-foreground active:scale-[0.97]',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/70 active:scale-[0.97]',
        ghost: 'hover:bg-accent/50 hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        player: 'text-foreground/60 hover:text-foreground transition-colors',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-10 rounded-lg px-8',
        icon: 'h-9 w-9',
        'icon-sm': 'h-7 w-7',
        'icon-lg': 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
