import React from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}) => {
  return (
    <label className="flex items-center justify-between cursor-pointer group select-none gap-3">
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-xs font-semibold text-white">{label}</span>}
          {description && (
            <span className="text-[11px] text-evah-text-muted mt-0.5">{description}</span>
          )}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ${
          checked ? 'bg-evah-accent' : 'bg-white/15'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        <span
          className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );
};

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-1 w-full">
      {label && (
        <label className="block text-[11px] font-medium text-evah-text-secondary select-none">
          {label}
        </label>
      )}
      <select
        className={`w-full px-3 py-1.5 rounded-xl bg-black/40 border border-evah-border text-xs text-white focus:outline-none focus:border-evah-accent appearance-none cursor-pointer ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export interface SliderProps {
  label?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (val: number) => void;
  formatValue?: (val: number) => string;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  formatValue = (v) => `${v}`,
}) => {
  return (
    <div className="space-y-1.5 w-full select-none">
      <div className="flex items-center justify-between text-xs">
        {label && <span className="font-semibold text-white">{label}</span>}
        <span className="font-mono text-evah-accent text-[11px] px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/10">
          {formatValue(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-teal-500 cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none"
      />
    </div>
  );
};
