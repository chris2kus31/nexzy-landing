"use client";

// Share a build from the website. The image is what gets shared, not a
// link: link posts get little reach on X, and a picture of the 9 games is
// the post people want anyway (the card already prints the drop's address).
// Phones (and browsers that can hand files to the OS) open the share menu
// with the image attached, so the person picks Instagram, X, Threads,
// TikTok or Messages there. Computers save the image, then open the site
// they picked so they can attach it. Copy link stays for DMs and chats.
import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  Flex,
  Image,
  Portal,
  Text,
  chakra,
} from "@chakra-ui/react";
import { FiDownload, FiLink, FiShare, FiX } from "react-icons/fi";
import {
  FaFacebook,
  FaInstagram,
  FaThreads,
  FaTiktok,
  FaXTwitter,
} from "react-icons/fa6";
import { D } from "@/components/drops/tokens";

/** Where a computer sends people after saving the image. */
export type ShareSite = "instagram" | "tiktok" | "x" | "threads" | "facebook";
export type ShareAction = "sheet" | "save" | "copy" | ShareSite;

const SITES: Array<{
  key: ShareSite;
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
];

/** Can this browser hand an image file to the OS share menu? */
export function canShareFiles(): boolean {
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
  saved = false,
}: {
  open: boolean;
  onClose: () => void;
  hashtag: string;
  imageUrl: string | null;
  onShare: (action: ShareAction) => void;
  /** The link was just copied: the Copy link button says so. */
  copied?: boolean;
  /** This image was already saved: the Save button says so. */
  saved?: boolean;
}) {
  // Checked in the browser only (no navigator during server render).
  const [sheet, setSheet] = useState(false);
  useEffect(() => setSheet(canShareFiles()), []);

  const secondary = {
    flex: 1,
    h: "46px",
    borderRadius: "12px",
    bg: D.panel,
    color: D.white,
    border: "1px solid",
    borderColor: D.line,
    fontWeight: "700",
    _hover: { borderColor: D.yellow },
  } as const;

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
                mb={4}
                w="100%"
                maxW="220px"
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

            {sheet ? (
              <>
                <Button
                  w="100%"
                  h="52px"
                  borderRadius="14px"
                  bg={D.yellow}
                  color={D.base}
                  fontWeight="800"
                  fontSize="md"
                  onClick={() => onShare("sheet")}
                >
                  <FiShare /> Share image
                </Button>
                <Text fontSize="xs" color={D.muted} mt={2} textAlign="center">
                  Pick Instagram, TikTok, X, Threads or a chat. The image goes
                  with it.
                </Text>
              </>
            ) : (
              <>
                <Text fontSize="sm" color={D.white} fontWeight="700" mb={1}>
                  Post it on
                </Text>
                <Text fontSize="xs" color={D.muted} mb={3}>
                  We save the image and open the site. Attach the saved image to
                  your post.
                </Text>
                <Flex>
                  {SITES.map((t) => (
                    <chakra.button
                      key={t.key}
                      flex={1}
                      minW={0}
                      display="flex"
                      flexDirection="column"
                      alignItems="center"
                      gap="6px"
                      onClick={() => onShare(t.key)}
                      aria-label={`Save the image and open ${t.label}`}
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
                        {t.label}
                      </Text>
                    </chakra.button>
                  ))}
                </Flex>
              </>
            )}

            <Flex gap={2} mt={4}>
              <Button {...secondary} onClick={() => onShare("save")}>
                <FiDownload /> {saved ? "Saved" : "Save image"}
              </Button>
              <Button {...secondary} onClick={() => onShare("copy")}>
                <FiLink /> {copied ? "Copied" : "Copy link"}
              </Button>
            </Flex>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
