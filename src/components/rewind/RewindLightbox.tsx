"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Image } from "@chakra-ui/react";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import { track } from "@/lib/analytics";

interface Shot {
  src: string;
  alt: string;
}

/**
 * Click-to-zoom image viewer for a Rewind episode. Wraps the magazine content
 * and uses click delegation: clicking any <img> inside opens a full-screen
 * lightbox with prev/next across every image on the page. Era skins need no
 * changes — they just render normally as children.
 */
export default function RewindLightbox({
  children,
}: {
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [index, setIndex] = useState(-1);
  const open = index >= 0 && index < shots.length;

  const close = useCallback(() => setIndex(-1), []);
  const prev = useCallback(
    () => setIndex((i) => (i <= 0 ? shots.length - 1 : i - 1)),
    [shots.length],
  );
  const next = useCallback(
    () => setIndex((i) => (i >= shots.length - 1 ? 0 : i + 1)),
    [shots.length],
  );

  // Open on click of any reasonably-sized image inside the wrapper.
  function onClick(e: React.MouseEvent) {
    const el = (e.target as HTMLElement)?.closest(
      "img",
    ) as HTMLImageElement | null;
    if (!el || !ref.current?.contains(el)) return;
    const imgs = Array.from(ref.current.querySelectorAll("img")).filter(
      (im) => im.clientWidth >= 48 && im.clientHeight >= 48,
    ) as HTMLImageElement[];
    const list = imgs.map((im) => ({
      src: im.currentSrc || im.src,
      alt: im.alt,
    }));
    const start = imgs.indexOf(el);
    if (start < 0 || !list.length) return;
    setShots(list);
    setIndex(start);
    track("rewind_lightbox_open", { index: start, count: list.length });
  }

  // Keyboard controls + body scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close, prev, next]);

  const current = open ? shots[index] : null;

  return (
    <>
      <Box ref={ref} onClick={onClick} css={{ "& img": { cursor: "zoom-in" } }}>
        {children}
      </Box>

      {open && current ? (
        <Box
          position="fixed"
          inset="0"
          zIndex={3000}
          bg="rgba(5,9,18,.94)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          onClick={close}
        >
          {/* Close */}
          <Box
            as="button"
            position="absolute"
            top={{ base: 3, md: 5 }}
            right={{ base: 3, md: 5 }}
            color="whiteAlpha.800"
            fontSize="22px"
            _hover={{ color: "white" }}
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            aria-label="Close image viewer"
          >
            <FaTimes />
          </Box>

          {/* Counter */}
          {shots.length > 1 ? (
            <Box
              position="absolute"
              top={{ base: 4, md: 6 }}
              left="50%"
              transform="translateX(-50%)"
              color="whiteAlpha.700"
              fontSize="13px"
              letterSpacing="0.08em"
            >
              {index + 1} / {shots.length}
            </Box>
          ) : null}

          {/* Prev */}
          {shots.length > 1 ? (
            <Box
              as="button"
              position="absolute"
              left={{ base: 2, md: 6 }}
              color="whiteAlpha.800"
              fontSize="26px"
              p={3}
              _hover={{ color: "white" }}
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="Previous image"
            >
              <FaChevronLeft />
            </Box>
          ) : null}

          {/* Image + caption */}
          <Box
            maxW="92vw"
            maxH="88vh"
            display="flex"
            flexDirection="column"
            alignItems="center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={current.src}
              alt={current.alt}
              css={{
                maxWidth: "92vw",
                maxHeight: current.alt ? "82vh" : "88vh",
                objectFit: "contain",
                borderRadius: "6px",
                boxShadow: "0 20px 60px rgba(0,0,0,.6)",
              }}
            />
            {current.alt ? (
              <Box
                mt={3}
                color="whiteAlpha.800"
                fontSize="14px"
                textAlign="center"
                maxW="80ch"
              >
                {current.alt}
              </Box>
            ) : null}
          </Box>

          {/* Next */}
          {shots.length > 1 ? (
            <Box
              as="button"
              position="absolute"
              right={{ base: 2, md: 6 }}
              color="whiteAlpha.800"
              fontSize="26px"
              p={3}
              _hover={{ color: "white" }}
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="Next image"
            >
              <FaChevronRight />
            </Box>
          ) : null}
        </Box>
      ) : null}
    </>
  );
}
