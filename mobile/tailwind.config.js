/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#101418',
        mist: '#eef2f1',
        sand: '#f7f4ed',
        coral: '#fb7185',
        teal: '#3b82f6',
        mint: '#dbeafe',
        surface: '#08111f',
        panel: '#101a2f',
        line: '#26324b',
        primary: '#4f8cff',
        positive: '#22c55e',
        negative: '#fb7185',
      },
      boxShadow: {
        card: '0 24px 60px rgba(2, 6, 23, 0.45)',
        glow: '0 0 0 1px rgba(255,255,255,0.05), 0 28px 64px rgba(37, 99, 235, 0.22)',
      },
      fontFamily: {
        sans: ['"Pretendard Variable"', '"Pretendard"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
