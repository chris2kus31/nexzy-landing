"use client";

import { useState } from "react";
import { Button } from "@chakra-ui/react";
import { FiLink, FiCheck } from "react-icons/fi";

/**
 * Copies a public URL to the clipboard with brief "Copied" feedback. Safe to
 * drop inside a clickable row/card — it stops the click from bubbling or
 * navigating so the copy doesn't also open the row.
 */
export default function CopyLinkButton({
  url,
  label,
  size = "xs",
  title = "Copy public link",
}: {
  url: string;
  label?: string;
  size?: "2xs" | "xs" | "sm" | "md";
  title?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback when the async Clipboard API is unavailable/blocked.
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* give up silently — nothing else we can do */
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Button
      size={size}
      variant="outline"
      color="nexzy.white"
      borderColor="whiteAlpha.300"
      _hover={{ bg: "whiteAlpha.100" }}
      onClick={copy}
      title={title}
    >
      {copied ? <FiCheck /> : <FiLink />}
      {label ? (
        <span style={{ marginLeft: 6 }}>{copied ? "Copied" : label}</span>
      ) : null}
    </Button>
  );
}
