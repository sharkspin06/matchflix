import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        // Side-by-side layouts only when there's room across: wide AND landscape.
        // Portrait tablets (e.g. iPad Pro at 1024px) keep the stacked layout.
        wide: { raw: '(min-width: 1024px) and (orientation: landscape)' },
        // Tablet-sized screens (either orientation), excluding phones turned sideways.
        tablet: { raw: '(min-width: 768px) and (min-height: 700px)' },
      },
      colors: {
        primary: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
    },
  },
  plugins: [],
}
export default config
