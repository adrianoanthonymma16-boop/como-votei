'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  onClick?: () => void;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', onClick, children, ...props }, ref) => {
    const variants = {
      default: 'badge-default',
      secondary: 'badge-secondary',
      success: 'badge-success',
      warning: 'badge-warning',
      danger: 'badge-danger',
      info: 'badge-info',
      outline: 'badge-outline',
    };

    const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    
    if (onClick) {
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          type="button"
          className={cn(baseStyles, variants[variant], className, 'cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2')}
          onClick={onClick}
          {...props}
        >
          {children}
        </button>
      );
    }

    return (
      <span
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
