'use client';

import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-10 w-full appearance-none rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground',
        'placeholder:text-muted-foreground',
        'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        error && 'border-destructive focus:ring-destructive',
        className
      )}
      {...props}
    />
  )
);
Select.displayName = 'Select';

export const SelectOption = forwardRef<HTMLOptionElement, React.OptionHTMLAttributes<HTMLOptionElement>>(
  ({ className, ...props }, ref) => (
    <option ref={ref} className={cn('py-2', className)} {...props} />
  )
);
SelectOption.displayName = 'SelectOption';
