import React from 'react';
import { Search, X } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, className = '', ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        {label && (
          <label className="block text-[11px] font-medium text-evah-text-secondary select-none">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-evah-text-muted pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full py-1.5 px-3 rounded-xl bg-black/35 border border-evah-border text-xs text-white placeholder-evah-text-muted transition-colors focus:outline-none focus:border-evah-accent focus:ring-1 focus:ring-evah-accent/30 disabled:opacity-40 allow-select ${
              leftIcon ? 'pl-9' : ''
            } ${rightIcon ? 'pr-9' : ''} ${error ? 'border-rose-500/60 ring-1 ring-rose-500/20' : ''} ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-evah-text-muted">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-[10px] text-rose-400 font-medium">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onClear?: () => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  onClear,
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="w-3.5 h-3.5 absolute left-2.5 text-evah-text-muted pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-8 pr-7 py-1 rounded-xl bg-black/30 border border-evah-border text-xs text-white placeholder-evah-text-muted focus:outline-none focus:border-evah-accent transition-colors allow-select"
      />
      {value && (
        <button
          onClick={() => {
            onChange('');
            if (onClear) onClear();
          }}
          className="absolute right-2 text-evah-text-muted hover:text-white p-0.5"
          title="Clear search"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
