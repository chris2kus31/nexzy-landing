"use client";

import NextLink from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { track } from "@/lib/analytics";

/**
 * A NextLink that fires a GA/Clarity event on click. Lets server-rendered
 * cards report which item was clicked without turning the whole page into a
 * client component. Navigation is unaffected if analytics is blocked.
 */
export default function TrackedLink({
  href,
  event,
  params,
  children,
  style,
  className,
}: {
  href: string;
  event: string;
  params?: Record<string, string | number | boolean | undefined>;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <NextLink
      href={href}
      style={style}
      className={className}
      onClick={() => track(event, params)}
    >
      {children}
    </NextLink>
  );
}
