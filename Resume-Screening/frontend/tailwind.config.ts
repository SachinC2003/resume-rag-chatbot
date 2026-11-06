import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "hsl(var(--foreground) / <alpha-value>)",
        muted: "hsl(var(--muted-foreground) / <alpha-value>)",
        canvas: "hsl(var(--background-muted) / <alpha-value>)",
        surface: "hsl(var(--card) / <alpha-value>)",
        line: "hsl(var(--border) / <alpha-value>)",
        accent: "hsl(var(--primary) / <alpha-value>)",
        "accent-soft": "hsl(var(--primary-soft) / <alpha-value>)",
        danger: "hsl(var(--danger) / <alpha-value>)",
        "danger-soft": "hsl(var(--danger-soft) / <alpha-value>)",
        "danger-border": "hsl(var(--danger-border) / <alpha-value>)",
        "danger-foreground": "hsl(var(--danger-foreground) / <alpha-value>)",
      },
      boxShadow: {
        card: "0 10px 35px rgba(28, 46, 36, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
