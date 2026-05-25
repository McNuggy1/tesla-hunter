import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tesla-inspired palette
        tesla: {
          red: "#E31937",
          "red-dark": "#B8142B",
          silver: "#A8A9AD",
          "dark-bg": "#0A0A0A",
          "dark-surface": "#111111",
          "dark-card": "#181818",
          "dark-border": "#2A2A2A",
          "dark-muted": "#6B6B6B",
        },
        deal: {
          great: "#22C55E",
          good: "#84CC16",
          fair: "#F59E0B",
          over: "#EF4444",
        },
      },
      fontFamily: {
        sans: ["var(--font-gotham)", "system-ui", "sans-serif"],
        display: ["var(--font-gotham)", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "hero-glow":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(227,25,55,0.15), transparent)",
        "card-shine":
          "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)",
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease-out forwards",
        "fade-in": "fadeIn 0.3s ease-out forwards",
        shimmer: "shimmer 2s infinite",
        "pulse-dot": "pulseDot 2s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(0.85)" },
        },
      },
      boxShadow: {
        "card-hover": "0 0 0 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.4)",
        "deal-glow": "0 0 12px rgba(34,197,94,0.3)",
        "tesla-red": "0 0 24px rgba(227,25,55,0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
