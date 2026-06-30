"use client";

import { useEffect, useState } from "react";
import { HStack, IconButton, Button, Icon } from "@chakra-ui/react";
import {
  FaXTwitter,
  FaFacebookF,
  FaRedditAlien,
  FaWhatsapp,
  FaTelegram,
} from "react-icons/fa6";
import { HiLink, HiCheck, HiMail } from "react-icons/hi";
import { IoShareSocial } from "react-icons/io5";
import { MdSms } from "react-icons/md";

export default function ShareRow({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  // Feature-detect the native share sheet (mobile + some desktop).
  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
  }, []);

  const enc = encodeURIComponent;
  const open = (href: string) =>
    window.open(href, "_blank", "noopener,noreferrer");
  // Email/SMS open a native app — navigate rather than open a blank tab.
  const openApp = (href: string) => {
    window.location.href = href;
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title, text: title, url });
    } catch {
      /* user cancelled — ignore */
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  const iconBtn = (
    label: string,
    onClick: () => void,
    icon: React.ReactNode,
  ) => (
    <IconButton
      aria-label={label}
      size="sm"
      variant="outline"
      borderRadius="full"
      color="gray.300"
      borderColor="whiteAlpha.300"
      onClick={onClick}
      _hover={{ bg: "whiteAlpha.100", color: "white" }}
    >
      {icon}
    </IconButton>
  );

  return (
    <HStack gap={2} flexWrap="wrap">
      {canNativeShare && (
        <Button
          size="sm"
          onClick={nativeShare}
          bg="nexzy.blue"
          color="white"
          borderRadius="full"
          fontWeight="600"
          _hover={{ bg: "nexzy.lightBlue" }}
        >
          <Icon mr={1}>
            <IoShareSocial />
          </Icon>
          Share
        </Button>
      )}
      {iconBtn(
        "Share on Reddit",
        () =>
          open(
            `https://www.reddit.com/submit?url=${enc(url)}&title=${enc(title)}`,
          ),
        <Icon>
          <FaRedditAlien />
        </Icon>,
      )}
      {iconBtn(
        "Share on X",
        () =>
          open(
            `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`,
          ),
        <Icon>
          <FaXTwitter />
        </Icon>,
      )}
      {iconBtn(
        "Share on WhatsApp",
        () => open(`https://wa.me/?text=${enc(`${title} ${url}`)}`),
        <Icon>
          <FaWhatsapp />
        </Icon>,
      )}
      {iconBtn(
        "Share on Telegram",
        () => open(`https://t.me/share/url?url=${enc(url)}&text=${enc(title)}`),
        <Icon>
          <FaTelegram />
        </Icon>,
      )}
      {iconBtn(
        "Share on Facebook",
        () => open(`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`),
        <Icon>
          <FaFacebookF />
        </Icon>,
      )}
      {iconBtn(
        "Share by email",
        () =>
          openApp(
            `mailto:?subject=${enc(title)}&body=${enc(`${title}\n\n${url}`)}`,
          ),
        <Icon>
          <HiMail />
        </Icon>,
      )}
      {iconBtn(
        "Share by text message",
        () => openApp(`sms:?&body=${enc(`${title} ${url}`)}`),
        <Icon>
          <MdSms />
        </Icon>,
      )}
      {iconBtn(
        copied ? "Copied" : "Copy link",
        copy,
        copied ? (
          <Icon color="green.300">
            <HiCheck />
          </Icon>
        ) : (
          <Icon>
            <HiLink />
          </Icon>
        ),
      )}
    </HStack>
  );
}
