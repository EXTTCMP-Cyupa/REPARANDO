/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff9ec",
          100: "#ffeec5",
          300: "#ffcc66",
          500: "#f59e0b",
          700: "#b45309",
          900: "#4a2200"
        }
      }
    }
  },
  plugins: []
};
