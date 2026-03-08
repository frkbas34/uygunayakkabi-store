import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef3ee',
          100: '#fde3d1',
          500: '#f97316',
          600: '#ea6a0a',
          700: '#c2510a',
        },
      },
    },
  },
  plugins: [],
}

export default config
