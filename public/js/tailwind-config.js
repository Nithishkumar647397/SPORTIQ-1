// js/tailwind-config.js
const cfg = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#3365fa",
        "background-light": "#f5f6f8",
        "background-dark": "#0f1423",
      },
      fontFamily: {
        display: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        lg: "1rem",
        xl: "1.5rem",
        full: "9999px",
      },
    },
  },
};

// Set both globals for maximum CDN compatibility
window.tailwind = window.tailwind || {};
window.tailwind.config = cfg;
try {
  tailwind.config = cfg;
} catch {}
