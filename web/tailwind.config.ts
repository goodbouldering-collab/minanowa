import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#e11d48',
          light: '#fb7185',
          dark: '#9f1239',
        },
      },
    },
  },
  plugins: [],
};

export default config;
