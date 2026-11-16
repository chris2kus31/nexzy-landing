"use client";
// App Store + Google Play buttons for the Drops pages, counted as download
// clicks with where on the page they were tapped.
import { Button, Flex } from "@chakra-ui/react";
import { FaApple, FaGooglePlay } from "react-icons/fa6";
import { trackDownload } from "@/lib/analytics";
import { APP_STORE_URL, googlePlayUrl } from "@/lib/storeUrls";
import { D } from "@/components/drops/tokens";

export default function StoreButtons({
  location,
  playYellow = false,
}: {
  location: string;
  playYellow?: boolean;
}) {
  return (
    <Flex gap={2.5} wrap="wrap">
      <Button
        asChild
        h="50px"
        px={5}
        borderRadius="12px"
        bg="white"
        color={D.base}
        fontWeight="800"
        _hover={{ opacity: 0.92 }}
      >
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackDownload("ios", location)}
        >
          <FaApple /> App Store
        </a>
      </Button>
      <Button
        asChild
        h="50px"
        px={5}
        borderRadius="12px"
        bg={playYellow ? D.yellow : "white"}
        color={D.base}
        fontWeight="800"
        _hover={{ opacity: 0.92 }}
      >
        <a
          href={googlePlayUrl(location)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackDownload("android", location)}
        >
          <FaGooglePlay /> Google Play
        </a>
      </Button>
    </Flex>
  );
}
