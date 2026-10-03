/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E3A5F',
          dark: '#152C4A',
          light: '#2A4F7F',
        },
        accent: '#2563EB',
        success: '#16A34A',
        danger: '#DC2626',
        warning: '#D97706',
        bg: '#1E293B',
        card: '#FFFFFF',
        'text-primary': '#1E293B',
        'text-secondary': '#64748B',
      },
    },
  },
  plugins: [],
}
