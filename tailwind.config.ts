import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      /* ═══════════════════════════════════════════
         DESIGN TOKENS — 色板/间距/字号/阴影
         ═══════════════════════════════════════════ */

      colors: {
        /* Background layers */
        "bg-root": "var(--color-bg-root)",
        "bg-subtle": "var(--color-bg-subtle)",
        "bg-surface": "var(--color-bg-surface)",
        "bg-elevated": "var(--color-bg-elevated)",

        /* Brand */
        primary: {
          DEFAULT: "#6366F1",
          light: "#818CF8",
          dark: "#4F46E5",
        },
        accent: {
          cyan: "#06B6D4",
          purple: "#A855F7",
        },

        /* Semantic */
        semantic: {
          info: "var(--color-semantic-info-text)",
          success: "var(--color-semantic-success-text)",
          warning: "var(--color-semantic-warning-text)",
          danger: "var(--color-semantic-danger-text)",
        },

        /* Chart palette */
        chart: {
          1: "var(--color-chart-1)",
          2: "var(--color-chart-2)",
          3: "var(--color-chart-3)",
          4: "var(--color-chart-4)",
          5: "var(--color-chart-5)",
          6: "var(--color-chart-6)",
          7: "var(--color-chart-7)",
          8: "var(--color-chart-8)",
        },
      },

      /* Spacing scale: 4px base */
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
      },

      /* Typography scale — 统一 8px 节奏 */
      fontSize: {
        "xs": ["0.6875rem", { lineHeight: "1rem" }],
        "sm": ["0.8125rem", { lineHeight: "1.25rem" }],
        "base": ["0.9375rem", { lineHeight: "1.5rem" }],
        "lg": ["1.0625rem", { lineHeight: "1.6rem" }],
        "xl": ["1.25rem", { lineHeight: "1.7rem" }],
        "2xl": ["1.5rem", { lineHeight: "1.75rem" }],
        "3xl": ["1.875rem", { lineHeight: "2rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.25rem" }],
      },

      /* Border radius scale */
      borderRadius: {
        "xl": "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },

      /* Shadows */
      boxShadow: {
        "elevated": "0 12px 32px -8px rgba(0, 0, 0, 0.4)",
        "elevated-lg": "0 20px 48px -12px rgba(0, 0, 0, 0.5)",
        "glow-indigo": "0 0 24px -6px rgba(99, 102, 241, 0.35)",
        "glow-purple": "0 0 24px -6px rgba(124, 58, 237, 0.3)",
        "inner-glow": "inset 0 1px 0 rgba(255,255,255,0.04)",
      },

      /* Backdrop blur steps */
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        md: "12px",
        lg: "20px",
        xl: "32px",
      },

      /* Animation presets */
      animation: {
        "fade-up": "fade-up 0.5s ease-out forwards",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "slide-in-right": "slide-in-right 0.4s ease-out forwards",
        "pulse-slow": "pulse-slow 3s ease-in-out infinite",
      },

      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
