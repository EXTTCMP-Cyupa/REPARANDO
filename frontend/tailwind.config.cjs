/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f3f7ff",
          100: "#dbe8ff",
          200: "#bfd4ff",
          300: "#93b7ff",
          500: "#2f66b5",
          700: "#1f467f",
          900: "#1b335d"
        },
        slatebrand: {
          50: "#f8fafc",
          100: "#eef2f7",
          300: "#c4cfdd",
          500: "#607089",
          700: "#334155",
          900: "#0f172a"
        }
      }
    }
  },
  plugins: []
};
