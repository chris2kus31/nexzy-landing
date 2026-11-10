"use client";

// Guide photos: a swipeable gallery (one photo at a time, arrows, counter,
// thumbnails) and a full-screen viewer (tap a photo) with next / previous,
// swipe, arrow keys and Esc. Every photo is in the server HTML so pages stay
// crawlable; nothing here needs JavaScript to show the first photo.
import { useCallback, useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import { Box, Dialog, Flex, Portal, Text, chakra } from "@chakra-ui/react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiMaximize2,
  FiX,
} from "react-icons/fi";
import type { HubCaptionedImage } from "@/lib/hub-engine/types";
import { G } from "@/components/games/guide/GuideBits";

const label = (img: HubCaptionedImage) => img.alt ?? img.caption ?? "";

function RoundBtn({
  onClick,
  disabled,
  label: aria,
  children,
  size = 40,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
  size?: number;
}) {
  return (
    <chakra.button
      type="button"
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={aria}
      disabled={disabled}
      w={`${size}px`}
      h={`${size}px`}
      borderRadius="999px"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="rgba(11,14,29,0.72)"
      color={G.text}
      border="1px solid"
      borderColor={G.line}
      fontSize="20px"
      cursor="pointer"
      opacity={disabled ? 0.35 : 1}
      _hover={{ borderColor: disabled ? G.line : G.gold }}
      _disabled={{ cursor: "default" }}
    >
      {children}
    </chakra.button>
  );
}

/** Full-screen photo viewer. Open when `index` is a number. */
export function GuideLightbox({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: HubCaptionedImage[];
  index: number | null;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const open = index !== null;
  const i = index ?? 0;
  const many = images.length > 1;
  const go = useCallback(
    (d: number) => {
      if (index === null) return;
      const n = index + d;
      if (n >= 0 && n < images.length) onIndex(n);
    },
    [index, images.length, onIndex],
  );
  useEffect(() => {
    if (!open || !many) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, many, go]);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const img = images[i];
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(d) => {
        if (!d.open) onClose();
      }}
      size="full"
    >
      <Portal>
        <Dialog.Backdrop bg="rgba(5,7,18,0.94)" />
        <Dialog.Positioner position="fixed" inset={0}>
          <Dialog.Content
            bg="#05070f"
            boxShadow="none"
            m={0}
            w="100vw"
            h="100dvh"
            maxW="100vw"
            borderRadius={0}
            display="flex"
            flexDirection="column"
            onTouchStart={(e: React.TouchEvent) => {
              const t = e.touches[0];
              touch.current = { x: t.clientX, y: t.clientY };
            }}
            onTouchEnd={(e: React.TouchEvent) => {
              const s = touch.current;
              touch.current = null;
              if (!s || !many) return;
              const t = e.changedTouches[0];
              const dx = t.clientX - s.x;
              if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(t.clientY - s.y))
                go(dx < 0 ? 1 : -1);
            }}
          >
            <Dialog.Title srOnly>
              {img ? label(img) || "Photo" : "Photo"}
            </Dialog.Title>
            <Flex
              justify="space-between"
              align="center"
              px={{ base: 3, md: 5 }}
              pt="max(12px, env(safe-area-inset-top))"
              pb={2}
            >
              <Text color={G.muted} fontSize="sm" fontWeight="700">
                {many ? `${i + 1} of ${images.length}` : ""}
              </Text>
              <RoundBtn onClick={onClose} label="Close">
                <FiX />
              </RoundBtn>
            </Flex>
            <Box
              position="relative"
              flex="1"
              minH={0}
              mx={{ base: 0, md: 16 }}
              onClick={onClose}
            >
              {img && (
                <NextImage
                  key={img.url}
                  src={img.url}
                  alt={label(img)}
                  fill
                  sizes="100vw"
                  style={{ objectFit: "contain" }}
                  priority
                />
              )}
              {many && (
                <>
                  <Box
                    position="absolute"
                    left={{ base: 2, md: -14 }}
                    top="50%"
                    transform="translateY(-50%)"
                  >
                    <RoundBtn
                      onClick={() => go(-1)}
                      disabled={i === 0}
                      label="Previous photo"
                      size={44}
                    >
                      <FiChevronLeft />
                    </RoundBtn>
                  </Box>
                  <Box
                    position="absolute"
                    right={{ base: 2, md: -14 }}
                    top="50%"
                    transform="translateY(-50%)"
                  >
                    <RoundBtn
                      onClick={() => go(1)}
                      disabled={i === images.length - 1}
                      label="Next photo"
                      size={44}
                    >
                      <FiChevronRight />
                    </RoundBtn>
                  </Box>
                </>
              )}
            </Box>
            <Box
              px={{ base: 4, md: 6 }}
              pt={3}
              pb="max(16px, env(safe-area-inset-bottom))"
              textAlign="center"
              minH="56px"
            >
              {img?.caption && (
                <Text color={G.text} fontSize={{ base: "sm", md: "md" }}>
                  {img.caption}
                </Text>
              )}
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

/** One photo per view: swipe or arrows, counter, thumbnails, tap to enlarge. */
export default function GuideGallery({
  images,
}: {
  images: HubCaptionedImage[];
}) {
  const track = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);
  const many = images.length > 1;

  const scrollTo = (i: number) => {
    const el = track.current;
    if (!el) return;
    const n = Math.max(0, Math.min(images.length - 1, i));
    el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
  };
  const onScroll = () => {
    const el = track.current;
    if (!el || !el.clientWidth) return;
    const n = Math.round(el.scrollLeft / el.clientWidth);
    if (n !== at) setAt(n);
  };

  return (
    <Box as="figure" m={0} maxW="860px">
      <Box position="relative">
        <Box
          ref={track}
          onScroll={onScroll}
          display="flex"
          overflowX="auto"
          scrollSnapType="x mandatory"
          borderRadius="12px"
          bg={G.card}
          css={{
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
          aria-roledescription={many ? "carousel" : undefined}
        >
          {images.map((img, i) => (
            <Box
              key={img.url}
              as="button"
              onClick={() => setViewer(i)}
              position="relative"
              flex="0 0 100%"
              aspectRatio="16 / 9"
              scrollSnapAlign="center"
              cursor="zoom-in"
              aria-label={`Open photo${many ? ` ${i + 1} of ${images.length}` : ""}: ${label(img)}`}
            >
              <NextImage
                src={img.url}
                alt={label(img)}
                fill
                sizes="(max-width: 900px) 100vw, 860px"
                style={{ objectFit: "cover" }}
              />
            </Box>
          ))}
        </Box>
        {/* Overlay controls: counter + enlarge top right, arrows on the sides. */}
        <Flex
          position="absolute"
          top={2}
          right={2}
          gap={2}
          align="center"
          pointerEvents="none"
        >
          {many && (
            <Text
              bg="rgba(11,14,29,0.72)"
              color={G.text}
              fontSize="xs"
              fontWeight="700"
              px={2.5}
              py={1}
              borderRadius="999px"
            >
              {at + 1} / {images.length}
            </Text>
          )}
          <Box pointerEvents="auto">
            <RoundBtn
              onClick={() => setViewer(at)}
              label="View full screen"
              size={32}
            >
              <FiMaximize2 size={15} />
            </RoundBtn>
          </Box>
        </Flex>
        {many && (
          <>
            <Box
              position="absolute"
              left={2}
              top="50%"
              transform="translateY(-50%)"
            >
              <RoundBtn
                onClick={() => scrollTo(at - 1)}
                disabled={at === 0}
                label="Previous photo"
              >
                <FiChevronLeft />
              </RoundBtn>
            </Box>
            <Box
              position="absolute"
              right={2}
              top="50%"
              transform="translateY(-50%)"
            >
              <RoundBtn
                onClick={() => scrollTo(at + 1)}
                disabled={at === images.length - 1}
                label="Next photo"
              >
                <FiChevronRight />
              </RoundBtn>
            </Box>
          </>
        )}
      </Box>
      <Text
        as="figcaption"
        fontSize="sm"
        color={G.muted}
        mt={1.5}
        minH={images.some((x) => x.caption) ? "1.4em" : 0}
      >
        {images[at]?.caption ?? ""}
      </Text>
      {many && (
        <Flex gap={2} mt={2} overflowX="auto" pb={1}>
          {images.map((img, i) => (
            <Box
              key={img.url}
              as="button"
              onClick={() => scrollTo(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === at ? "true" : undefined}
              position="relative"
              flex="0 0 auto"
              w={{ base: "64px", md: "88px" }}
              aspectRatio="16 / 9"
              borderRadius="6px"
              overflow="hidden"
              border="2px solid"
              borderColor={i === at ? G.gold : "transparent"}
              opacity={i === at ? 1 : 0.6}
              _hover={{ opacity: 1 }}
            >
              <NextImage
                src={img.url}
                alt=""
                fill
                sizes="88px"
                style={{ objectFit: "cover" }}
              />
            </Box>
          ))}
        </Flex>
      )}
      <GuideLightbox
        images={images}
        index={viewer}
        onIndex={(i) => {
          setViewer(i);
          scrollTo(i);
        }}
        onClose={() => setViewer(null)}
      />
    </Box>
  );
}
