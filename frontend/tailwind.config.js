/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ["'Syne'", "sans-serif"],
        body:    ["'DM Sans'", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        // CSS variable-driven tokens — values set by theme class
        surface:  "var(--color-surface)",
        canvas:   "var(--color-canvas)",
        card:     "var(--color-card)",
        border:   "var(--color-border)",
        ink:      "var(--color-ink)",
        paper:    "var(--color-paper)",
        muted:    "var(--color-muted)",
        lead:     "var(--color-lead)",
        // Static tokens
        accent: {
          DEFAULT: "#5B4FE8",
          soft:    "#7B72F0",
          dim:     "#2E2880",
          glow:    "#5B4FE820",
        },
        risk: {
          low:    "#0D9488",
          medium: "#D97706",
          high:   "#DC2626",
        },
        align: {
          aligned:    "#059669",
          partial:    "#D97706",
          misaligned: "#DC2626",
        }
      },
      boxShadow: {
        'card-dark':  '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'card-light': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'glow':       '0 0 40px rgba(91,79,232,0.15)',
      },
      animation: {
        "fade-up":    "fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) forwards",
        "fade-in":    "fadeIn 0.3s ease forwards",
        "slide-in":   "slideIn 0.35s cubic-bezier(0.16,1,0.3,1) forwards",
        "pulse-soft": "pulseSoft 2.5s ease-in-out infinite",
        "shimmer":    "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeUp:    { "0%": { opacity:0, transform:"translateY(12px)" }, "100%": { opacity:1, transform:"translateY(0)" } },
        fadeIn:    { "0%": { opacity:0 }, "100%": { opacity:1 } },
        slideIn:   { "0%": { opacity:0, transform:"translateX(-8px)" }, "100%": { opacity:1, transform:"translateX(0)" } },
        pulseSoft: { "0%,100%": { opacity:1 }, "50%": { opacity:0.5 } },
        shimmer:   { "0%": { backgroundPosition:"200% 0" }, "100%": { backgroundPosition:"-200% 0" } },
      }
    }
  },
  plugins: []
}
