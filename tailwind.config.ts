import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      animation: {
        'photo-drop': 'photoDrop 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-in': 'fadeIn 0.5s ease-in-out',
      },
      keyframes: {
        photoDrop: {
          '0%': {
            transform: 'translateY(-100vh) rotate(-5deg) scale(0.8)',
            opacity: '0',
          },
          '50%': {
            transform: 'translateY(-20px) rotate(2deg) scale(1.05)',
            opacity: '1',
          },
          '100%': {
            transform: 'translateY(0) rotate(0deg) scale(1)',
            opacity: '1',
          },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config