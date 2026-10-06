/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        evah: {
          bg: 'var(--evah-bg)',
          surface: 'var(--evah-surface)',
          'surface-subtle': 'var(--evah-surface-subtle)',
          'surface-hover': 'var(--evah-surface-hover)',
          text: 'var(--evah-text)',
          'text-secondary': 'var(--evah-text-secondary)',
          'text-muted': 'var(--evah-text-muted)',
          border: 'var(--evah-border)',
          'border-strong': 'var(--evah-border-strong)',
          accent: 'var(--evah-accent)',
          'accent-hover': 'var(--evah-accent-hover)',
          'accent-subtle': 'var(--evah-accent-subtle)',
          danger: 'var(--evah-danger)',
          'danger-subtle': 'var(--evah-danger-subtle)',
          warning: 'var(--evah-warning)',
          success: 'var(--evah-success)',
          dock: 'var(--evah-dock-bg)',
          topbar: 'var(--evah-topbar-bg)',
        }
      },
      borderRadius: {
        'evah-win': 'var(--evah-window-radius)',
        'evah-dock': 'var(--evah-dock-radius)',
      },
      fontFamily: {
        sans: ['var(--evah-font-sans)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--evah-font-mono)', 'monospace'],
      },
      boxShadow: {
        'evah-win': '0 25px 50px -12px rgba(0, 0, 0, var(--evah-shadow-opacity, 0.25)), 0 0 0 1px var(--evah-border)',
        'evah-dock': '0 20px 40px -8px rgba(0, 0, 0, var(--evah-shadow-opacity, 0.3)), 0 0 0 1px var(--evah-border)',
        'evah-menu': '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 0 0 1px var(--evah-border)',
      },
      backdropBlur: {
        'evah': 'var(--evah-blur-amount)',
      }
    },
  },
  plugins: [],
}
