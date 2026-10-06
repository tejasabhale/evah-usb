import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'secondary' | 'subtle' | 'danger';
  active?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  size = 'md',
  variant = 'ghost',
  active = false,
  className = '',
  disabled,
  ...props
}) => {
  const sizeStyles = {
    sm: 'w-6 h-6 p-1 rounded-md text-[13px]',
    md: 'w-8 h-8 p-1.5 rounded-lg text-sm',
    lg: 'w-9 h-9 p-2 rounded-xl text-base',
  };

  const variantStyles = {
    ghost: active
      ? 'bg-white/10 text-white'
      : 'text-evah-text-secondary hover:text-white hover:bg-white/[0.06]',
    secondary: active
      ? 'bg-white/15 text-white border border-white/20'
      : 'bg-white/[0.04] text-slate-300 border border-evah-border hover:bg-white/[0.08] hover:text-white',
    subtle: active
      ? 'bg-evah-accent text-black font-semibold'
      : 'bg-evah-accent-subtle text-evah-accent border border-evah-accent/20 hover:bg-evah-accent/25',
    danger: active
      ? 'bg-rose-600 text-white'
      : 'text-rose-400 hover:bg-rose-950/40 hover:text-rose-300',
  };

  return (
    <button
      aria-label={label}
      title={label}
      disabled={disabled}
      className={`inline-flex items-center justify-center transition-all select-none disabled:opacity-40 disabled:pointer-events-none cursor-pointer active:scale-95 ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
};
