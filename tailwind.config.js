/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./utils/**/*.{js,ts,jsx,tsx,mdx}",
    "./constants/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cor primária do sistema: #057321 (Verde)
        primary: {
          50: '#e6f7ec',
          100: '#c2ebd0',
          200: '#9adeb1',
          300: '#71d192',
          400: '#52c77a',
          500: '#057321',  // Cor principal
          600: '#046a1e',
          700: '#035e1a',
          800: '#025216',
          900: '#01380f',
        },
        // Cores secundárias e de suporte
        success: {
          50: '#e6f7ec',
          500: '#057321',
          600: '#046a1e',
          700: '#035e1a',
        },
        // Manter cores padrão do Tailwind para outros usos
      },
    },
  },
  plugins: [],
};