/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#102A43",
          dark: "#071A2B",
          50: "#F0F4F8",
          100: "#D9E2EC",
          200: "#BCCCDC",
          300: "#9FB3C8",
          400: "#829AB1",
          500: "#627D98",
          600: "#486581",
          700: "#334E68",
          800: "#243B53",
          900: "#102A43",
        },
        problue: "#1F4E78",
        academy: "#315C45",
        saffron: {
          DEFAULT: "#D97706",
          50: "#FEF6E7",
          100: "#FDF0D5",
          200: "#F9DEA0",
          600: "#B45309",
          700: "#92400E",
        },
        offwhite: "#F8FAFC",
        lightgray: "#E5E7EB",
        ink: "#172033",
        muted: "#64748B",
        success: "#15803D",
        error: "#B91C1C",
      },
      fontFamily: {
        heading: ["Manrope", "Montserrat", "Poppins", "system-ui", "sans-serif"],
        body: ["Inter", "Source Sans 3", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(16,42,67,0.08), 0 1px 2px rgba(16,42,67,0.06)",
        lift: "0 10px 24px rgba(16,42,67,0.10)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};
