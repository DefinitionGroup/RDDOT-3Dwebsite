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
        hairline: "rgb(var(--color-hairline) / <alpha-value>)",
        signature: "rgb(var(--color-signature) / <alpha-value>)",
        ember: "rgb(var(--color-signature) / <alpha-value>)"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Helvetica Neue", "Arial", "sans-serif"],
        brand: ["var(--font-sans)", "Helvetica Neue", "Arial", "sans-serif"],
        editorial: ["var(--font-sans)", "Helvetica Neue", "Arial", "sans-serif"]
      },
      // The entire site uses exactly three sizes.
      fontSize: {
        display: [
          "clamp(2.75rem, 7vw, 7rem)",
          { lineHeight: "1", letterSpacing: "-0.03em" }
        ],
        lead: [
          "clamp(1.25rem, 2vw, 1.75rem)",
          { lineHeight: "1.3", letterSpacing: "-0.01em" }
        ],
        body: ["0.9375rem", { lineHeight: "1.7", letterSpacing: "0" }]
      },
      // The single site-wide weight — change --font-weight-base in globals.css.
      fontWeight: {
        base: "var(--font-weight-base)"
      },
      borderRadius: {
        hero: "var(--radius-hero)",
        soft: "var(--radius-soft)"
      },
      transitionTimingFunction: {
        signature: "cubic-bezier(.22, 1, .36, 1)"
      },
      keyframes: {
        "soft-reveal": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "soft-reveal": "soft-reveal .8s cubic-bezier(.22, 1, .36, 1) both"
      }
    }
  },
  plugins: []
};

export default config;
