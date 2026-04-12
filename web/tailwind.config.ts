import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 旧版 :root 変数より
        // --c1:#0d7c66 --c2:#12a47c --c3:#34d399 --c4:#6ee7b7 --c5:#a7f3d0
        brand: {
          50: '#eef6f2',   // --cbg
          100: '#dcfce7',  // --cbg2
          200: '#a7f3d0',  // --c5
          300: '#6ee7b7',  // --c4
          400: '#34d399',  // --c3
          500: '#12a47c',  // --c2
          600: '#0d7c66',  // --c1 (primary)
          700: '#0a5f4f',
          800: '#074438',
          900: '#052d24',
          DEFAULT: '#0d7c66',
        },
        // --accent:#d97706 --accent2:#f59e0b --accent3:#fbbf24
        accent: {
          300: '#fcd34d',
          400: '#fbbf24',  // --accent3
          500: '#f59e0b',  // --accent2
          600: '#d97706',  // --accent
          700: '#b45309',
          DEFAULT: '#d97706',
        },
        ink: {
          DEFAULT: '#1a202c',  // --td
          light: '#5a6577',    // --tl
          mid: '#2d3748',      // --tm
        },
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06)',
        lifted: '0 2px 6px rgba(0,0,0,.06), 0 10px 32px rgba(0,0,0,.08)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #0d7c66 0%, #12a47c 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, #eef6f2 0%, #dcfce7 100%)',
        'accent-gradient': 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
