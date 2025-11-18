import animate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ["selector"],
  theme: {
    extend: {
      colors: {
        "dark-yellow": "#403700",
        background: "oklch(var(--background) / <alpha-value>)",
        foreground: "oklch(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "oklch(var(--card) / <alpha-value>)",
          foreground: "oklch(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "oklch(var(--popover) / <alpha-value>)",
          foreground: "oklch(var(--popover-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "oklch(var(--primary) / <alpha-value>)",
          foreground: "oklch(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary) / <alpha-value>)",
          foreground: "oklch(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "oklch(var(--muted) / <alpha-value>)",
          foreground: "oklch(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "oklch(var(--accent) / <alpha-value>)",
          foreground: "oklch(var(--accent-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "oklch(var(--destructive) / <alpha-value>)",
          foreground: "oklch(var(--destructive-foreground) / <alpha-value>)",
          border: "oklch(var(--destructive-border) / <alpha-value>)",
        },
        border: "oklch(var(--border) / <alpha-value>)",
        input: "oklch(var(--input) / <alpha-value>)",
        ring: "oklch(var(--ring) / <alpha-value>)",
        chart: {
          "1": "oklch(var(--chart-1) / <alpha-value>)",
          "2": "oklch(var(--chart-2) / <alpha-value>)",
          "3": "oklch(var(--chart-3) / <alpha-value>)",
          "4": "oklch(var(--chart-4) / <alpha-value>)",
          "5": "oklch(var(--chart-5) / <alpha-value>)",
        },
        sidebar: {
          DEFAULT: "oklch(var(--sidebar) / <alpha-value>)",
          foreground: "oklch(var(--sidebar-foreground) / <alpha-value>)",
          primary: "oklch(var(--sidebar-primary) / <alpha-value>)",
          "primary-foreground":
            "oklch(var(--sidebar-primary-foreground) / <alpha-value>)",
          accent: "oklch(var(--sidebar-accent) / <alpha-value>)",
          "accent-foreground":
            "oklch(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "oklch(var(--sidebar-border) / <alpha-value>)",
          ring: "oklch(var(--sidebar-ring) / <alpha-value>)",
        },
      },
      borderRadius: {
        sm: "calc(var(--radius) - 2px)",
        DEFAULT: "var(--radius)",
        md: "calc(var(--radius) + 2px)",
        lg: "calc(var(--radius) + 4px)",
        xl: "0.5rem",
        "2xl": "0.75rem",
        "3xl": "1rem",
      },
      fontFamily: {
        sans: [
          "var(--font-geist-sans)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "var(--font-geist-mono)",
          "ui-monospace",
          "system-ui",
          "monospace",
        ],
        heading: [
          "var(--font-geist-sans)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      keyframes: {
        neonBlink: {
          "0%, 45%": { opacity: "1" },
          "50%, 55%": { opacity: "0.08" },
          "60%, 100%": { opacity: "1" },
        },
        arrowCycle: {
          "0%": { transform: "translateY(0)", opacity: "1" },
          "40%": { transform: "translateY(-120%)", opacity: "0" },
          "41%": { transform: "translateY(120%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "logo-spin": "logoSpin 4s ease-in-out infinite",
        "neon-blink": "neonBlink 2.2s ease-in-out infinite",
        "arrow-cycle": "arrowCycle 0.6s ease-in-out",
      },
      boxShadow: {
        "neon-primary":
          "0 0 6px oklch(var(--primary) / 1), 0 0 24px oklch(var(--primary) / 1)",
      },
    },
  },
  plugins: [animate, typography],
};
