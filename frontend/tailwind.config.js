/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Syne'", "sans-serif"],
        body:    ["'DM Sans'", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        ink:   "#0A0A0F",
        paper: "#F4F3EE",
        lead:  "#1C1C27",
        mist:  "#E8E6DF",
        accent: {
          DEFAULT: "#6C63FF",
          soft:    "#9B94FF",
          dim:     "#3D3680",
        },
        risk: {
          low:    "#2DD4BF",
          medium: "#F59E0B",
          high:   "#F43F5E",
        },
        align: {
          aligned:    "#10B981",
          partial:    "#F59E0B",
          misaligned: "#F43F5E",
        }
      },
      animation: {
        "fade-up"   : "fadeUp 0.5s ease forwards",
        "fade-in"   : "fadeIn 0.4s ease forwards",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        fadeUp:    { "0%": { opacity:0, transform:"translateY(16px)" }, "100%": { opacity:1, transform:"translateY(0)" } },
        fadeIn:    { "0%": { opacity:0 }, "100%": { opacity:1 } },
        pulseSoft: { "0%,100%": { opacity:1 }, "50%": { opacity:0.6 } },
      }
    }
  },
  plugins: []
}
