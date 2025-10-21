/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{ts,tsx,js,jsx}",
    "./components/**/*.{ts,tsx,js,jsx}",
    "./lib/**/*.{ts,tsx,js,jsx}",
    "./pages/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        tgBg: 'var(--tg-theme-bg-color, #0f1115)',
        tgText: 'var(--tg-theme-text-color, #ffffff)',
        tgBtn: 'var(--tg-theme-button-color, #39c0fa)',
        tgBtnText: 'var(--tg-theme-button-text-color, #000)',
      },
      boxShadow: {
        glass: '0 10px 30px -10px rgba(0,0,0,0.45)',
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
};
