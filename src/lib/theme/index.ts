// ============================================
// FILE: lib/theme/index.ts
// REPLACE your entire theme file with this
// ============================================
import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const nexzyConfig = defineConfig({
  theme: {
    tokens: {
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
