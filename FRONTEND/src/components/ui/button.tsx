import React from 'react';
import { cn } from '../../lib/utils';

type ButtonVariant = 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive';
type ButtonSize = 'sm' | 'default' | 'icon';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  default:
    'bg-primary-teal text-white hover:bg-primary-teal-hover shadow-sm',
  outline:
    'border border-neutral-border bg-white text-neutral-text-dark hover:bg-neutral-bg',
  ghost:
    'bg-transparent text-neutral-text-dark hover:bg-neutral-bg',
  secondary:
    'bg-neutral-bg text-neutral-text-dark hover:bg-slate-100',
  destructive:
    'bg-red-600 text-white hover:bg-red-700 shadow-sm',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  default: 'h-10 px-4 text-sm',
  icon: 'h-10 w-10',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-teal/20 disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = 'Button';
