"use client";

// The dismissible announcement banner for the public website. Fetches the
// active banner client-side (keeps pages static/ISR), renders it thin + on
// brand, and remembers dismissal locally by id. CTA 'link' navigates; 'remind'
// is app-only, so on web it simply renders no button. Additive chrome — safe to
// mount globally.
import { useEffect, useState } from "react";
import { Box, Flex, Text, Button, Link } from "@chakra-ui/react";
import {
  FaBolt,
  FaBullhorn,
  FaCheckCircle,
  FaWrench,
  FaExclamationTriangle,
  FaGift,
  FaTrophy,
  FaInfoCircle,
  FaTimes,
} from "react-icons/fa";
import type { IconType } from "react-icons";
import AnnouncementDetail from "@/components/AnnouncementDetail";

type Cta = { label: string; action: string; target: string | null };
type Announcement = {
  id: string;
  type: string;
  accentColor: string;
  iconName: string;
  iconSet: string;
  kicker: string;
  title: string;
  subtitle: string | null;
  cta: Cta | null;
  detail: { blocks?: unknown[]; form?: { fields?: unknown[] } } | null;
};

const ICONS: Record<string, IconType> = {
  bolt: FaBolt,
  bullhorn: FaBullhorn,
  "check-circle": FaCheckCircle,
  wrench: FaWrench,
  "exclamation-triangle": FaExclamationTriangle,
  gift: FaGift,
  trophy: FaTrophy,
  "info-circle": FaInfoCircle,
};

const DISMISS_KEY = "nexzy_dismissed_announcements";

function loadDismissed(): string[] {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
function rememberDismissed(id: string) {
  try {
    const next = [id, ...loadDismissed().filter((x) => x !== id)].slice(0, 50);
    localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
  } catch {
    // best-effort
  }
}

const tint = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  if (h.length !== 6) return `rgba(255,215,0,${a})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

export default function SiteAnnouncementBanner() {
  const [item, setItem] = useState<Announcement | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/announcements/active");
        const data = (await res.json()) as Announcement | null;
        if (!alive || !data) return;
        if (!loadDismissed().includes(data.id)) setItem(data);
      } catch {
        // no banner
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!item) return null;
  const accent = item.accentColor || "#FFD700";
  const Icon = ICONS[item.iconName] ?? FaInfoCircle;
  const blocks = Array.isArray(item.detail?.blocks) ? item.detail!.blocks : [];
  const hasDetail = blocks.length > 0;
  const linkCta = item.cta && item.cta.action === "link" && item.cta.target;
  const sheetCta = item.cta && item.cta.action === "sheet";

  return (
    <>
      <Box
        bg={tint(accent, 0.1)}
        borderBottom="1px solid"
        borderColor={tint(accent, 0.35)}
        px={{ base: 4, md: 6 }}
        py={2.5}
      >
        <Flex align="center" gap={3} maxW="1200px" mx="auto">
          <Flex
            align="center"
            justify="center"
            w="30px"
            h="30px"
            borderRadius="8px"
            flex="0 0 auto"
            bg={tint(accent, 0.16)}
            color={accent}
          >
            <Icon size={15} />
          </Flex>
          <Box
            flex="1"
            minW={0}
            cursor={hasDetail ? "pointer" : "default"}
            onClick={() => hasDetail && setSheetOpen(true)}
          >
            <Flex align="baseline" gap={2} wrap="wrap">
              {item.kicker ? (
                <Text
                  fontSize="10px"
                  fontWeight="700"
                  letterSpacing="1px"
                  textTransform="uppercase"
                  color={accent}
                >
                  {item.kicker}
                </Text>
              ) : null}
              <Text fontSize="sm" fontWeight="600" color="white" lineClamp={1}>
                {item.title}
              </Text>
              {item.subtitle ? (
                <Text fontSize="xs" color="whiteAlpha.700" lineClamp={1}>
                  {item.subtitle}
                </Text>
              ) : null}
            </Flex>
          </Box>
          {linkCta && item.cta ? (
            <Link
              href={item.cta.target as string}
              _hover={{ textDecoration: "none" }}
              flex="0 0 auto"
            >
              <Button
                size="xs"
                bg={accent}
                color="#12152a"
                _hover={{ opacity: 0.9 }}
                fontWeight="600"
              >
                {item.cta.label}
              </Button>
            </Link>
          ) : sheetCta && item.cta ? (
            <Button
              size="xs"
              bg={accent}
              color="#12152a"
              _hover={{ opacity: 0.9 }}
              fontWeight="600"
              flex="0 0 auto"
              onClick={() => setSheetOpen(true)}
            >
              {item.cta.label}
            </Button>
          ) : null}
          <Button
            aria-label="Dismiss"
            size="xs"
            variant="ghost"
            color="whiteAlpha.700"
            _hover={{ bg: "whiteAlpha.100", color: "white" }}
            flex="0 0 auto"
            onClick={() => {
              rememberDismissed(item.id);
              setItem(null);
            }}
          >
            <FaTimes />
          </Button>
        </Flex>
      </Box>

      {sheetOpen ? (
        <Box
          position="fixed"
          inset="0"
          zIndex={3000}
          bg="blackAlpha.800"
          overflowY="auto"
          p={{ base: 3, md: 6 }}
          onClick={() => setSheetOpen(false)}
        >
          <Box
            maxW="640px"
            mx="auto"
            bg="#1A1F3A"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            p={{ base: 5, md: 6 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Flex justify="space-between" align="flex-start" gap={3} mb={3}>
              <Text fontSize="lg" fontWeight="700" color="white">
                {item.title}
              </Text>
              <Button
                aria-label="Close"
                size="xs"
                variant="ghost"
                color="whiteAlpha.700"
                _hover={{ bg: "whiteAlpha.100", color: "white" }}
                onClick={() => setSheetOpen(false)}
              >
                <FaTimes />
              </Button>
            </Flex>
            <AnnouncementDetail blocks={blocks} accent={accent} />
            {Array.isArray(item.detail?.form?.fields) &&
            item.detail!.form!.fields!.length ? (
              <Box
                mt={5}
                p={4}
                borderRadius="lg"
                border="1px solid"
                borderColor={tint(accent, 0.35)}
                bg={tint(accent, 0.08)}
              >
                <Text color="white" fontWeight="600" fontSize="sm">
                  Enter in the Nexzy app
                </Text>
                <Text color="whiteAlpha.700" fontSize="xs" mt={1}>
                  Open Nexzy on your phone to submit your entry.
                </Text>
              </Box>
            ) : null}
          </Box>
        </Box>
      ) : null}
    </>
  );
}
