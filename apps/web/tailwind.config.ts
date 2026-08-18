import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        gra: {
          green: "#006B3F",
          navy: "#1A365D",
          red: "#BB1E10",
          black: "#000000",
        },
        border: "#E2E8F0",
        background: "#F8FAFC",
        foreground: "#0F172A",
        muted: "#64748B",
        card: "#FFFFFF",
        primary: {
          DEFAULT: "#006B3F",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#F1F5F9",
          foreground: "#0F172A",
        },
        success: "#16A34A",
        warning: "#D97706",
        danger: "#DC2626",
      },
    },
  },
  plugins: [],
};

export default config;
