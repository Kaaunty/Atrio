/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        atrio: {
          navy: '#082E5C',
          'navy-dark': '#061F3E',
          teal: '#0EAAA3',
          'teal-dark': '#087F7B',
          'teal-light': '#DDF5F2',
          bg: '#F6F8FA',
          surface: '#FFFFFF',
          border: '#E2E8F0',
          'text-primary': '#172033',
          'text-secondary': '#64748B',
        },
        semantic: {
          success: '#16A34A',
          warning: '#D97706',
          danger: '#DC2626',
          info: '#2563EB',
          neutral: '#64748B',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
