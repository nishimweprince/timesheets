import { ReactNode } from 'react'
import { VariantProps, cva } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

const spinnerVariants = cva('flex-col items-center justify-center', {
  variants: {
    show: {
      true: 'flex',
      false: 'hidden',
    },
  },
  defaultVariants: {
    show: true,
  },
})

const loaderVariants = cva('animate-spin text-current', {
  variants: {
    size: {
      small: 'size-4',
      medium: 'size-6',
      large: 'size-8',
    },
  },
  defaultVariants: {
    size: 'small',
  },
})

interface SpinnerContentProps
  extends VariantProps<typeof spinnerVariants>,
    VariantProps<typeof loaderVariants> {
  className?: string
  children?: ReactNode
}

const Loader = ({
  size,
  show,
  children,
  className = 'text-primary-foreground',
}: SpinnerContentProps) => {
  return (
    <span className={spinnerVariants({ show })}>
      <Loader2 className={cn(loaderVariants({ size }), className)} />
      {children}
    </span>
  )
}

interface SkeletonLoaderProps {
  type?: 'text' | 'avatar' | 'button' | 'card' | 'table' | 'input'
  width?: string
  height?: string
  className?: string
}

export const SkeletonLoader = ({ type, width, height, className }: SkeletonLoaderProps) => {
  const dimensions = {
    width: width ?? (type === 'text' ? '45%' : '100%'),
    height: height ?? (type === 'input' || type === 'button' ? '2.5rem' : '1.75rem'),
  }

  return (
    <figure
      className={cn('animate-pulse rounded-none bg-field-hover', className)}
      style={dimensions}
    />
  )
}

export const FormSkeletonLoader = () => {
  return (
    <fieldset className="grid w-full grid-cols-2 gap-6 p-6">
      {Array.from({ length: 10 }).map((_, index) => (
        <label className="flex w-full flex-col gap-2" key={index}>
          <SkeletonLoader type="text" />
          <SkeletonLoader type="input" height="2rem" />
        </label>
      ))}
    </fieldset>
  )
}

export default Loader
