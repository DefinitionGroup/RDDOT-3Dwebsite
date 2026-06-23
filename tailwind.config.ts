import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px"
    },
    extend: {
      colors: {
        canvas: "rgb(var(--color-canvas) / <alpha-value>)",
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        mist: "rgb(var(--color-mist) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        graphite: "rgb(var(--color-graphite) / <alpha-value>)",
        ash: "rgb(var(--color-ash) / <alpha-value>)",
        porcelain: "rgb(var(--color-porcelain) / <alpha-value>)",
        signature: "rgb(var(--color-signature) / <alpha-value>)",
        ember: "rgb(var(--color-ember) / <alpha-value>)"
      },
      fontFamily: {
        sans: ["General Sans", "Funnel Sans", "Avenir Next", "sans-serif"],
        brand: ["Funnel Sans", "General Sans", "Avenir Next", "sans-serif"],
        editorial: ["Crimson Text", "Georgia", "serif"]
      },
      borderRadius: {
        hero: "var(--radius-hero)",
        soft: "var(--radius-soft)"
      },
      boxShadow: {
        glass: "0 24px 80px rgb(17 16 15 / 0.18)",
        lift: "0 28px 70px rgb(57 53 49 / 0.16)"
      },
      transitionTimingFunction: {
        signature: "cubic-bezier(.22, 1, .36, 1)"
      },
      keyframes: {
        "ambient-pan": {
          "0%": { transform: "translate3d(0, 0, 0) scale(1.035)" },
          "100%": { transform: "translate3d(-1.5%, 1%, 0) scale(1.07)" }
        },
        "soft-reveal": {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "ambient-pan": "ambient-pan 18s ease-in-out alternate infinite",
        "soft-reveal": "soft-reveal .9s cubic-bezier(.22, 1, .36, 1) both"
      }
    }
  },
  plugins: []
};

export default config;
