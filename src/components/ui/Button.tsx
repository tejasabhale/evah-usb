import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'subtle';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  iconPosition = 'left',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-2.5 py-1 text-[11px] rounded-lg gap-1.5 h-7',
    md: 'px-3.5 py-1.5 text-xs rounded-xl gap-2 h-8',
    lg: 'px-4 py-2 text-sm rounded-xl gap-2.5 h-10',
  };

  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      'bg-evah-accent text-black font-semibold hover:bg-evah-accent-hover active:scale-[0.98] shadow-sm',
    secondary:
      'bg-white/[0.05] hover:bg-white/[0.09] text-white border border-evah-border active:scale-[0.98]',
    subtle:
      'bg-evah-accent-subtle text-evah-accent border border-evah-accent/25 hover:bg-evah-accent/20 active:scale-[0.98]',
    danger:
      'bg-rose-950/40 text-rose-300 border border-rose-500/30 hover:bg-rose-900/50 active:scale-[0.98]',
    ghost:
      'text-evah-text-secondary hover:text-white hover:bg-white/[0.05] active:scale-[0.98]',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-medium transition-all select-none disabled:opacity-40 disabled:pointer-events-none cursor-pointer ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
          {children}
          {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
};
