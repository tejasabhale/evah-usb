import React from 'react';

interface EvahLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  animate?: boolean;
  accentColor?: string;
}

export const EvahLogo: React.FC<EvahLogoProps> = ({
  size = 48,
  className = '',
  showText = false,
  animate = false,
  accentColor,
}) => {
  const accent = accentColor || 'var(--evah-accent, #14B8A6)';

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 128 128"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`w-full h-full drop-shadow-md ${animate ? 'animate-pulse' : ''}`}
        >
          <defs>
            <linearGradient id="evah-logo-grad" x1="16" y1="20" x2="112" y2="108" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={accent} />
              <stop offset="50%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
            <radialGradient id="evah-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={accent} stopOpacity="0.4" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Ambient subtle glow ring */}
          <circle cx="64" cy="64" r="54" fill="url(#evah-glow)" />

          {/* Precision rounded outer hexagonal shell */}
          <rect
            x="12"
            y="12"
            width="104"
            height="104"
            rx="26"
            fill="#090D16"
            stroke="url(#evah-logo-grad)"
            strokeWidth="3.5"
            strokeOpacity="0.65"
          />

          {/* Geometric Prism / Portal Node - Interlocking Isometric Tri-Facet */}
          {/* Top Facet */}
          <path
            d="M64 26 L96 45 L64 64 L32 45 Z"
            fill="url(#evah-logo-grad)"
            fillOpacity="0.95"
          />
          {/* Left Facet */}
          <path
            d="M32 49 L62 67 L62 101 L32 83 Z"
            fill={accent}
            fillOpacity="0.85"
          />
          {/* Right Facet */}
          <path
            d="M66 67 L96 49 L96 83 L66 101 Z"
            fill="#2563EB"
            fillOpacity="0.80"
          />

          {/* Core Beacon Node */}
          <circle cx="64" cy="64" r="7" fill="#FFFFFF" />
          <circle
            cx="64"
            cy="64"
            r="15"
            stroke={accent}
            strokeWidth="2"
            strokeDasharray="4 4"
            opacity="0.85"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className="font-semibold tracking-wider text-white text-lg leading-tight font-sans">
            EVAH
          </span>
          <span className="text-[10px] tracking-widest text-evah-text-muted uppercase">
            Personal OS
          </span>
        </div>
      )}
    </div>
  );
};
