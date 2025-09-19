import { createSystem, defaultConfig } from '@chakra-ui/react'

// Create your custom theme system
export const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: '#E6F2FF' },
          100: { value: '#BAD9FF' },
          200: { value: '#8DC0FF' },
          300: { value: '#5FA3E7' },
          400: { value: '#3B8AD3' },
          500: { value: '#2B6CB0' }, // Nexzy primary blue
          600: { value: '#235699' },
          700: { value: '#1A4177' },
          800: { value: '#132C55' },
          900: { value: '#0C1A33' },
        },
      },
    },
  },
})