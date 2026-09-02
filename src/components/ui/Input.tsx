'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground',
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
Input.displayName = 'Input';
