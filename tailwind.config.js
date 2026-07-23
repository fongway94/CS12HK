/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FDFBF8",
        ink: "#111111",
        muted: "#8F8881",
        line: "#ECE6DF",
        champagne: "#F7F3EB",
        rosewood: "#825F59",
        espresso: "#211C19"
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "Noto Serif TC", "serif"],
        sans: ["Instrument Sans", "Noto Sans TC", "sans-serif"]
      }
    }
  },
  plugins: []
}
