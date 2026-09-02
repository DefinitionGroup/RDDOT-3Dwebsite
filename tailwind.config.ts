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
        charcoal: "rgb(var(--color-charcoal) / <alpha-value>)",
        mist: "rgb(var(--color-mist) / <alpha-value>)",
        hairline: "rgb(var(--color-hairline) / <alpha-value>)",
        graphite: "rgb(var(--color-graphite) / <alpha-value>)",
        ash: "rgb(var(--color-ash) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        porcelain: "rgb(var(--color-porcelain) / <alpha-value>)",
        signature: {
          DEFAULT: "rgb(var(--color-signature) / <alpha-value>)",
          hover: "rgb(var(--color-signature-hover) / <alpha-value>)",
          pressed: "rgb(var(--color-signature-pressed) / <alpha-value>)"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
        serif: ["var(--font-serif)", "Times New Roman", "Georgia", "serif"],
        editorial: ["var(--font-sans)", "Helvetica Neue", "Helvetica", "Arial", "sans-serif"]
      },
      // The type scale. Headlines are weight 300 by default (globals.css).
      fontSize: {
        display: [
          "clamp(3rem, 6.7vw, 6rem)",
          { lineHeight: "1", letterSpacing: "-0.05em", fontWeight: "var(--font-weight-display)" }
        ],
        "heading-lg": [
          "clamp(2.5rem, 5vw, 4.5rem)",
          { lineHeight: "1", letterSpacing: "-0.05em", fontWeight: "var(--font-weight-display)" }
        ],
        heading: [
          "clamp(2.25rem, 3.75vw, 3.375rem)",
          { lineHeight: "1.1", letterSpacing: "-0.025em", fontWeight: "var(--font-weight-display)" }
        ],
        title: [
          "2rem",
          { lineHeight: "1.1", letterSpacing: "-0.025em", fontWeight: "var(--font-weight-display)" }
        ],
        panel: [
          "1.875rem",
          { lineHeight: "1.1", letterSpacing: "-0.025em", fontWeight: "var(--font-weight-display)" }
        ],
        card: ["1.3125rem", { lineHeight: "1.2", fontWeight: "var(--font-weight-label)" }],
        lead: ["1.25rem", { lineHeight: "1.5", letterSpacing: "0" }],
        body: ["1rem", { lineHeight: "1.5", letterSpacing: "0" }],
        nav: ["0.9375rem", { lineHeight: "1.5", fontWeight: "var(--font-weight-label)" }],
        caption: ["0.8125rem", { lineHeight: "1.5" }],
        label: ["0.6875rem", { lineHeight: "1", letterSpacing: "0.08em" }]
      },
      fontWeight: {
        base: "var(--font-weight-base)",
        display: "var(--font-weight-display)",
        label: "var(--font-weight-label)"
      },
      letterSpacing: {
        label: "0.08em",
        badge: "0.05em",
        film: "0.03em"
      },
      borderRadius: {
        card: "var(--radius-card)",
        pill: "var(--radius-pill)",
        hero: "var(--radius-hero)",
        soft: "var(--radius-soft)"
      },
      boxShadow: {
        action: "0 4px 20px rgb(0 0 0 / 0.15)",
        glass: "rgb(0 0 0 / 0.35) 0 10px 30px 0, inset rgb(255 255 255 / 0.08) 0 1px 0 0"
      },
      transitionTimingFunction: {
        signature: "cubic-bezier(0.22, 1, 0.36, 1)"
      },
      transitionDuration: {
        state: "var(--duration-state)",
        accordion: "var(--duration-accordion)",
        overlay: "var(--duration-overlay)",
        reveal: "var(--duration-reveal)"
      },
      keyframes: {
        "soft-reveal": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" }
        }
      },
      animation: {
        "soft-reveal": "soft-reveal var(--duration-reveal) cubic-bezier(0.22, 1, 0.36, 1) both",
        ticker: "ticker 56s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;
