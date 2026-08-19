import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Brand
        gra: {
          green: "hsl(var(--color-gra-green))",
          navy: "hsl(var(--color-gra-navy))",
          red: "hsl(var(--color-gra-red))",
        },
        // Semantic surface tokens
        background: "hsl(var(--color-background))",
        foreground: "hsl(var(--color-foreground))",
        card: {
          DEFAULT: "hsl(var(--color-card))",
          foreground: "hsl(var(--color-card-foreground))",
        },
        border: "hsl(var(--color-border))",
        input: "hsl(var(--color-input))",
        ring: "hsl(var(--color-ring))",
        muted: {
          DEFAULT: "hsl(var(--color-muted))",
          foreground: "hsl(var(--color-muted-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--color-primary))",
          foreground: "hsl(var(--color-primary-foreground))",
          subtle: "hsl(var(--color-primary-subtle))",
        },
        secondary: {
          DEFAULT: "hsl(var(--color-secondary))",
          foreground: "hsl(var(--color-secondary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--color-accent))",
          foreground: "hsl(var(--color-accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--color-destructive))",
          foreground: "hsl(var(--color-destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--color-success))",
          foreground: "hsl(var(--color-success-foreground))",
          subtle: "hsl(var(--color-success-subtle))",
        },
        warning: {
          DEFAULT: "hsl(var(--color-warning))",
          foreground: "hsl(var(--color-warning-foreground))",
          subtle: "hsl(var(--color-warning-subtle))",
        },
        danger: {
          DEFAULT: "hsl(var(--color-danger))",
          foreground: "hsl(var(--color-danger-foreground))",
          subtle: "hsl(var(--color-danger-subtle))",
        },
        // Sidebar
        sidebar: {
          DEFAULT: "hsl(var(--color-sidebar))",
          foreground: "hsl(var(--color-sidebar-foreground))",
          border: "hsl(var(--color-sidebar-border))",
          accent: "hsl(var(--color-sidebar-accent))",
          "accent-foreground": "hsl(var(--color-sidebar-accent-foreground))",
          muted: "hsl(var(--color-sidebar-muted))",
        },
      },
      borderRadius: {
        "2xl": "1rem",
        xl: "0.75rem",
        lg: "0.625rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      fontFamily: {
        sans: [
          "Inter",
          "Inter Variable",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        "card-hover":
          "0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)",
        popover:
          "0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.06)",
        dialog:
          "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.07)",
      },
      animation: {
        "skeleton-shimmer": "skeleton-shimmer 1.8s ease-in-out infinite",
        "fade-in": "fade-in 0.2s ease-out",
        "slide-up": "slide-up 0.25s ease-out",
        "slide-in-left": "slide-in-left 0.2s ease-out",
      },
      keyframes: {
        "skeleton-shimmer": {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-100%)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
