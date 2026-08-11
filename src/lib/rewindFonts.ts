// Shared next/font instances for the Rewind era skins. Declaring each font once
// here (instead of re-calling Anton()/VT323() in multiple components) avoids
// duplicate font className hashes + preload entries. next/font supports this
// import-and-reuse pattern.
import { Anton, VT323 } from "next/font/google";

export const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
