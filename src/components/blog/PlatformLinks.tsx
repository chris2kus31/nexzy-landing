"use client";

import { Button, HStack, Icon, Text } from "@chakra-ui/react";
import {
  FaTiktok,
  FaInstagram,
  FaXTwitter,
  FaYoutube,
  FaFacebook,
} from "react-icons/fa6";
import { track } from "@/lib/analytics";

const META: Record<string, { label: string; icon: React.ReactNode }> = {
  tiktok: { label: "TikTok", icon: <FaTiktok /> },
  reels: { label: "Reels", icon: <FaInstagram /> },
  facebook: { label: "Facebook", icon: <FaFacebook /> },
  instagram: { label: "Instagram", icon: <FaInstagram /> },
  x: { label: "X", icon: <FaXTwitter /> },
  youtube: { label: "YouTube", icon: <FaYoutube /> },
};

/**
 * "Also on" open-out buttons for a video's other platforms (TikTok / Reels /
 * X). These never play inline — by design they open the native app/site. Fires
 * the shared `content_click` GA event with a `platform` param.
 */
export default function PlatformLinks({
  links,
  slug,
}: {
  links: Record<string, string>;
  slug: string;
}) {
  const entries = Object.entries(links).filter(([, url]) => !!url);
  if (!entries.length) return null;
  return (
    <HStack gap={3} flexWrap="wrap">
      {entries.map(([platform, url]) => {
        const meta = META[platform] ?? { label: platform, icon: null };
        return (
          <Button
            key={platform}
            asChild
            size="sm"
            variant="outline"
            borderRadius="full"
            color="gray.200"
            borderColor="whiteAlpha.300"
            _hover={{ bg: "whiteAlpha.100", color: "white" }}
          >
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                track("video_platform_click", {
                  platform,
                  slug,
                  from: "video_detail",
                })
              }
            >
              <HStack gap={2}>
                {meta.icon && <Icon>{meta.icon}</Icon>}
                <Text>{meta.label}</Text>
              </HStack>
            </a>
          </Button>
        );
      })}
    </HStack>
  );
}
