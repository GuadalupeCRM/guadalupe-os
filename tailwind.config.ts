import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['DM Serif Display', 'serif'],
        sans: ['Barlow Condensed', 'sans-serif'],
      },
      colors: {
        verde: {
          vivid: '#6BB42E',
          mid: '#A2C96C',
          pale: '#E6F0D7',
        },
        rosa: {
          vivid: '#E21655',
          mid: '#F18EA0',
          pale: '#FBE4EA',
        },
        amarelo: {
          vivid: '#FAAE1A',
          mid: '#FED873',
          pale: '#FEEDC1',
        },
        areia: {
          DEFAULT: '#FFFBF0',
          warm: '#F1EFE9',
        },
      },
    },
  },
  plugins: [],
}

export default config
