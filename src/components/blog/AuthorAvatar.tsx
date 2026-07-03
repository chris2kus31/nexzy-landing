"use client";

import { useState } from "react";
import { Box } from "@chakra-ui/react";
import { authorInitials } from "@/lib/blog/authors";

/**
 * Author avatar that degrades gracefully: shows the headshot if it loads, and
 * falls back to a clean initials chip if the image is missing or fails. This
 * keeps bylines looking right even before the photos are deployed.
 */
export default function AuthorAvatar({
  src,
  name,
  size = 40,
}: {
  src?: string | null;
  name: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = src && !failed;

  return (
    <Box
      w={`${size}px`}
      h={`${size}px`}
      borderRadius="full"
      overflow="hidden"
      flexShrink={0}
      bg="nexzy.blue/25"
      color="nexzy.lightBlue"
      display="flex"
      alignItems="center"
      justifyContent="center"
      fontWeight="700"
      fontSize={`${Math.round(size * 0.36)}px`}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt={name}
          width={size}
          height={size}
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        authorInitials(name)
      )}
    </Box>
  );
}
