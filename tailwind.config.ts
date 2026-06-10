import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'cafe-navy': '#0D1B2A',
        'cafe-bronze': '#B87333',
        'cafe-silver': '#E8ECF0',
        'cafe-steel': '#7A8898',
      },
    },
  },
  plugins: [],
}
export default config
