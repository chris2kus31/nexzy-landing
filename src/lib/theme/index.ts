// ============================================
// FILE: lib/theme/index.ts
// REPLACE your entire theme file with this
// ============================================
import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const nexzyConfig = defineConfig({
  // Force the base document font to the body token (Inter) so nothing falls back
  // to a browser default; Chakra <Heading> picks up the heading token on its own.
  globalCss: {
    "html, body": { fontFamily: "body" },
  },
  theme: {
    tokens: {
      // Nexzy type roles — reference these, never a raw font family:
      //   body    = long-form + UI (Inter)
      //   heading = default + section headings (Space Grotesk). Chakra's
      //             <Heading> uses this token automatically -> applies site-wide.
      //   title   = page titles + wordmark (Chakra Petch, the gaming edge)
      fonts: {
        body: { value: "var(--font-inter), system-ui, sans-serif" },
        heading: {
          value: "var(--font-space-grotesk), var(--font-inter), sans-serif",
        },
        title: {
          value: "var(--font-chakra-petch), var(--font-inter), sans-serif",
        },
      },
      colors: {
        nexzy: {
          navy: { value: "#1a1f3a" }, // Dark navy background from logo
          blue: { value: "#4A9FFF" }, // Bright blue from N
          lightBlue: { value: "#6AB7FF" }, // Light blue accent
          yellow: { value: "#FFB74D" }, // Yellow/orange from circle
          gold: { value: "#FFC947" }, // Brighter gold variant
          white: { value: "#FFFFFF" },
          gray: {
            50: { value: "#F7FAFC" },
            100: { value: "#EDF2F7" },
            600: { value: "#718096" },
          },
        },
        brand: {
          50: { value: "#E6F4FF" },
          100: { value: "#BAE3FF" },
          200: { value: "#8DD1FF" },
          300: { value: "#6AB7FF" },
          400: { value: "#4A9FFF" },
          500: { value: "#2B88F0" }, // Primary brand blue
          600: { value: "#1E6FD9" },
          700: { value: "#1456B8" },
          800: { value: "#0D3E8F" },
          900: { value: "#082966" },
        },
      },
    },
  },
});

export const nexzyTheme = createSystem(defaultConfig, nexzyConfig);
