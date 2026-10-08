import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pharmacy: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1',
          800: '#075985',
          900: '#0C4A6E',
          950: '#082F49',
        },
        medical: {
          green: {
            50: '#ECFDF5',
            100: '#D1FAE5',
            500: '#10B981',
            600: '#059669',
            700: '#047857',
          },
          amber: {
            50: '#FFFBEB',
            100: '#FEF3C7',
            500: '#F59E0B',
            600: '#D97706',
          },
          orange: {
            50: '#FFF7ED',
            100: '#FFEDD5',
            500: '#F97316',
            600: '#EA580C',
          },
          red: {
            50: '#FEF2F2',
            100: '#FEE2E2',
            500: '#EF4444',
            600: '#DC2626',
          }
        }
      },
      fontFamily: {
        sans: [
          'Plus Jakarta Sans',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'sans-serif',
        ],
      },
      boxShadow: {
        'stitch': '0 2px 12px -2px rgba(0, 0, 0, 0.05), 0 1px 4px -1px rgba(0, 0, 0, 0.03)',
        'stitch-card': '0 4px 20px -4px rgba(15, 23, 42, 0.06)',
        'stitch-float': '0 10px 25px -5px rgba(2, 132, 199, 0.25)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      }
    },
  },
  plugins: [],
};
export default config;
