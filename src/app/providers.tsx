// ============================================
// FILE: app/providers.tsx
// REPLACE the ChakraProvider line with:
// ============================================
"use client";

import { ChakraProvider } from "@chakra-ui/react";
import { nexzyTheme } from "@/lib/theme";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ChakraProvider value={nexzyTheme}>{children}</ChakraProvider>;
}
