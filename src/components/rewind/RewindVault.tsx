import { Box, Text } from "@chakra-ui/react";
import { deviceForYear } from "@/lib/rewind/era";

/**
 * Era-adaptive "vault" media frame around the episode video. The device evolves
 * by era: a wood-grain CRT for the cartridge era, a dark CRT/flatscreen for the
 * disc era, a sleek panel for the download era. Server-rendered.
 */
export default function RewindVault({
  vid,
  title,
  year,
}: {
  vid: string;
  title: string;
  year: number | null;
}) {
  const device = deviceForYear(year);
  const isCrt = device !== "modern";
  const wood = device === "crt-wood";

  const screen = (
    <Box
      position="relative"
      w="100%"
      css={{ aspectRatio: "16 / 9" }}
      overflow="hidden"
      borderRadius={isCrt ? "lg" : "md"}
    >
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${vid}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          border: 0,
        }}
      />
      {isCrt && (
        <Box
          position="absolute"
          inset="0"
          pointerEvents="none"
          css={{
            background:
              "repeating-linear-gradient(to bottom, rgba(255,255,255,.05) 0 1px, transparent 1px 3px)",
          }}
        />
      )}
      {isCrt && year && (
        <Text
          position="absolute"
          top="6px"
          left="8px"
          fontFamily="mono"
          fontSize="10px"
          color="#7dffb0"
          css={{ textShadow: "0 0 6px rgba(125,255,176,.6)" }}
        >
          CH 3 · {year}
        </Text>
      )}
    </Box>
  );

  return (
    <Box mt={10}>
      <Text
        fontFamily="mono"
        fontSize="xs"
        letterSpacing="0.15em"
        color="nexzy.gray.100"
        mb={3}
      >
        📼 FROM THE VAULT
      </Text>

      <Box
        maxW={isCrt ? "560px" : "100%"}
        mx={isCrt ? "auto" : "0"}
        p={isCrt ? { base: 3, md: 4 } : "0"}
        borderRadius={isCrt ? "2xl" : "lg"}
        css={{
          background: wood
            ? "linear-gradient(160deg,#5a3c25,#3f2817)"
            : isCrt
              ? "#1a1a1e"
              : "transparent",
        }}
        boxShadow={isCrt ? "0 16px 34px rgba(0,0,0,.5)" : "none"}
        border={device === "modern" ? "1px solid" : "none"}
        borderColor={device === "modern" ? "whiteAlpha.200" : "transparent"}
      >
        {isCrt ? (
          <Box
            bg="#111"
            borderRadius="xl"
            p={{ base: 2, md: 3 }}
            css={{ boxShadow: "inset 0 0 0 3px #2a2a2a" }}
          >
            {screen}
          </Box>
        ) : (
          screen
        )}
      </Box>

      {isCrt && (
        <Text fontSize="xs" color="nexzy.gray.100" textAlign="center" mt={2}>
          {wood
            ? "Straight from the vault — the era's tube TV."
            : "Pulled from the archives."}
        </Text>
      )}
    </Box>
  );
}
