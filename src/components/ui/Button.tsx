'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, loading, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-accent text-accent-foreground hover:bg-accent/90 focus:ring-accent',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-ring',
      outline: 'border border-border bg-transparent hover:bg-muted focus:ring-ring',
      ghost: 'text-foreground hover:bg-muted focus:ring-ring',
      danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2',
      icon: 'p-2',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <span className="animate-spin mr-2 h-4 w-4" />} {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
