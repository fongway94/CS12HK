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
        // Active font stack is selected per-language via CSS variables
        // (see src/styles/index.css, body[data-lang="..."]). The lists
        // here are static fallbacks used by any Tailwind tooling that
        // reads theme.fontFamily directly. The .font-serif class in
        // index.css overrides these at runtime.
        serif: ["Cormorant Garamond", "Noto Serif TC", "PingFang TC", "Microsoft JhengHei", "Georgia", "serif"],
        sans:  ["Instrument Sans", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", "Helvetica Neue", "Arial", "sans-serif"]
      }
    }
  },
  plugins: []
}
