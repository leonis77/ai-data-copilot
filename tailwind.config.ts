import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      /* ═══════════════════════════════════════════
         DESIGN TOKENS — 极简素雅色板
         ═══════════════════════════════════════════ */

      colors: {
        /* Background layers — 温暖白 */
        "bg-root": "#FAFAF8",
        "bg-subtle": "#F5F5F0",
        "bg-surface": "#FFFFFF",
        "bg-elevated": "#FFFFFF",

        /* Brand — 克制冷蓝 */
        primary: {
          DEFAULT: "#2563EB",
          light: "#3B82F6",
          dark: "#1D4ED8",
        },
        accent: {
          cyan: "#0EA5E9",
          purple: "#6366F1",
        },

        /* Semantic */
        semantic: {
          info: "#1E40AF",
          success: "#16A34A",
          warning: "#B45309",
          danger: "#DC2626",
        },

        /* Chart palette */
        chart: {
          1: "#2563EB",
          2: "#0EA5E9",
          3: "#16A34A",
          4: "#D97706",
          5: "#DC2626",
          6: "#EA580C",
          7: "#6366F1",
          8: "#DB2777",
        },
      },

      /* Spacing scale: 4px base */
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
      },

      /* Typography scale — 精致 8px 节奏 */
      fontSize: {
        "micro":   ["0.625rem", { lineHeight: "0.75rem" }],
        "xs":      ["0.75rem",   { lineHeight: "1rem" }],
        "sm":      ["0.8125rem",{ lineHeight: "1.125rem" }],
        "base":    ["0.9375rem",{ lineHeight: "1.5rem" }],
        "lg":      ["1.0625rem",{ lineHeight: "1.6rem" }],
        "xl":      ["1.25rem",  { lineHeight: "1.75rem" }],
        "2xl":     ["1.5rem",   { lineHeight: "1.75rem" }],
        "3xl":     ["1.875rem", { lineHeight: "2rem" }],
        "4xl":     ["2.25rem",  { lineHeight: "2.25rem" }],
        "5xl":     ["2.75rem",  { lineHeight: "1.2" }],
        "display": ["3.5rem",   { lineHeight: "1.1" }],
      },

      /* Border radius scale */
      borderRadius: {
        "xl": "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },

      /* Shadows — 极淡阴影 */
      boxShadow: {
        "elevated": "0 4px 12px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.03)",
        "elevated-lg": "0 8px 24px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.03)",
        "glow-brand": "0 0 20px -4px rgba(37, 99, 235, 0.15)",
        "inner-glow": "inset 0 1px 0 rgba(255,255,255,0.6)",
      },

      /* Backdrop blur */
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
