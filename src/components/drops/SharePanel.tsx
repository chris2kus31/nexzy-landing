"use client";

// Share a build from the website: one panel with the image people will post,
// a button per platform, Save and Copy link. Same idea as the app's share
// panel. Websites can't open Instagram's or TikTok's composer directly (Meta
// and TikTok only allow that from installed apps), so on a phone those open
// the phone's share menu with the image; on a computer they save the image.
import { useEffect, useState } from "react";
import {
  Box,
  Dialog,
  Flex,
  Image,
  Portal,
  Text,
  chakra,
} from "@chakra-ui/react";
import { FiDownload, FiLink, FiX } from "react-icons/fi";
import {
  FaFacebook,
  FaInstagram,
  FaThreads,
  FaTiktok,
  FaXTwitter,
} from "react-icons/fa6";
import { D } from "@/components/drops/tokens";

export type SharePlatform =
  | "instagram"
  | "tiktok"
  | "x"
  | "threads"
  | "facebook"
  | "save"
  | "copy";

const TARGETS: Array<{
  key: SharePlatform;
  label: string;
  icon: React.ReactNode;
  color: string;
}> = [
  {
    key: "instagram",
    label: "Instagram",
    icon: <FaInstagram />,
    color: "#E1306C",
  },
  { key: "tiktok", label: "TikTok", icon: <FaTiktok />, color: D.white },
  { key: "x", label: "X", icon: <FaXTwitter />, color: D.white },
  { key: "threads", label: "Threads", icon: <FaThreads />, color: D.white },
  {
    key: "facebook",
    label: "Facebook",
    icon: <FaFacebook />,
    color: "#1877F2",
  },
  { key: "save", label: "Save", icon: <FiDownload />, color: D.yellow },
  { key: "copy", label: "Copy link", icon: <FiLink />, color: D.white },
];

/** Can this browser hand an image file to the phone's share menu? */
function canShareFiles(): boolean {
  try {
    const nav = navigator as Navigator & {
      canShare?: (d: ShareData) => boolean;
    };
    return !!nav.canShare?.({
      files: [new File([""], "x.jpg", { type: "image/jpeg" })],
    });
  } catch {
    return false;
  }
}

export default function SharePanel({
  open,
  onClose,
  hashtag,
  imageUrl,
  onShare,
  copied = false,
}: {
  open: boolean;
  onClose: () => void;
  hashtag: string;
  imageUrl: string | null;
  onShare: (platform: SharePlatform) => void;
  /** The link was just copied: the Copy link button says so. */
  copied?: boolean;
}) {
  // Checked in the browser only (no navigator during server render).
  const [phone, setPhone] = useState(false);
  useEffect(() => setPhone(canShareFiles()), []);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(d) => {
        if (!d.open) onClose();
      }}
      scrollBehavior="inside"
    >
      <Portal>
        <Dialog.Backdrop bg="rgba(5,7,18,0.72)" />
        {/* A sheet from the bottom on phones (thumb reach), centred on
            desktop. */}
        <Dialog.Positioner
          position="fixed"
          inset={0}
          display="flex"
          alignItems={{ base: "flex-end", md: "center" }}
          justifyContent="center"
          p={{ base: 0, md: 6 }}
        >
          <Dialog.Content
            bg={D.base}
            border="1px solid"
            borderColor={D.line}
            m={0}
            w={{ base: "100%", md: "480px" }}
            maxW="100%"
            maxH={{ base: "90dvh", md: "88vh" }}
            overflowY="auto"
            borderRadius={{ base: "18px 18px 0 0", md: "18px" }}
            p={{ base: 4, md: 5 }}
            pb={{ base: "calc(16px + env(safe-area-inset-bottom))", md: 5 }}
          >
            <Flex align="center" gap={3} mb={4}>
              <Dialog.Title
                flex={1}
                color={D.white}
                fontSize="lg"
                fontWeight="800"
              >
                Share your #{hashtag} build
              </Dialog.Title>
              <Dialog.CloseTrigger asChild position="static">
                <chakra.button
                  aria-label="Close"
                  color={D.muted}
                  fontSize="xl"
                  _hover={{ color: D.white }}
                >
                  <FiX />
                </chakra.button>
              </Dialog.CloseTrigger>
            </Flex>

            {imageUrl && (
              <Box
                mx="auto"
                mb={5}
                w="100%"
                maxW="260px"
                borderRadius="14px"
                overflow="hidden"
                border="1px solid"
                borderColor={D.line}
              >
                <Image
                  src={imageUrl}
                  alt={`My #${hashtag} build`}
                  w="100%"
                  h="auto"
                />
              </Box>
            )}

            {/* One row, equal columns. */}
            <Flex>
              {TARGETS.map((t) => (
                <chakra.button
                  key={t.key}
                  flex={1}
                  minW={0}
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  gap="6px"
                  onClick={() => onShare(t.key)}
                  aria-label={
                    t.key === "save" || t.key === "copy"
                      ? t.label
                      : `Share to ${t.label}`
                  }
                  _focusVisible={{ outline: `2px solid ${D.yellow}` }}
                  borderRadius="12px"
                  py={1}
                >
                  <Flex
                    w="46px"
                    h="46px"
                    borderRadius="full"
                    bg={D.panel}
                    border="1px solid"
                    borderColor={D.line}
                    align="center"
                    justify="center"
                    fontSize="20px"
                    color={t.color}
                    _hover={{ borderColor: D.yellow }}
                  >
                    {t.icon}
                  </Flex>
                  <Text
                    fontSize="11px"
                    color={D.dim}
                    fontWeight="600"
                    whiteSpace="nowrap"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    maxW="100%"
                  >
                    {t.key === "copy" && copied ? "Copied" : t.label}
                  </Text>
                </chakra.button>
              ))}
            </Flex>

            <Text fontSize="xs" color={D.muted} mt={4} textAlign="center">
              {phone
                ? "Instagram and TikTok open your phone's share menu with the image. Pick Story or post there."
                : "On a computer, Instagram and TikTok save the image so you can post it from your phone."}
            </Text>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
