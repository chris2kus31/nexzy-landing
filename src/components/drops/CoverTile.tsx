// One game's box art (portrait 3:4), or a quiet placeholder with the name.
import { Box, Image, Text } from "@chakra-ui/react";
import { D } from "@/components/drops/tokens";

export default function CoverTile({
  cover,
  name,
  badge,
  radius = "8px",
  showName = false,
}: {
  cover: string | null;
  name?: string;
  badge?: string | null;
  radius?: string;
  showName?: boolean;
}) {
  return (
    <Box
      position="relative"
      aspectRatio="3 / 4"
      borderRadius={radius}
      overflow="hidden"
      bg={D.line}
    >
      {cover && (
        <Image
          src={cover}
          alt={name ?? ""}
          w="100%"
          h="100%"
          objectFit="cover"
          loading="lazy"
          decoding="async"
        />
      )}
      {(showName || !cover) && name && (
        <>
          <Box
            position="absolute"
            inset={0}
            bgGradient="to-t"
            gradientFrom="rgba(0,0,0,0.8)"
            gradientTo="transparent"
            gradientVia="transparent"
          />
          <Text
            position="absolute"
            left={1.5}
            right={1.5}
            bottom={1.5}
            fontSize="xs"
            fontWeight="700"
            color="white"
            lineClamp={2}
          >
            {name}
          </Text>
        </>
      )}
      {badge && (
        <Box
          position="absolute"
          top={1}
          left={1}
          minW="20px"
          h="20px"
          px={1}
          borderRadius="5px"
          bg={D.yellow}
          color={D.base}
          fontFamily="title"
          fontWeight="700"
          fontSize="xs"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          {badge}
        </Box>
      )}
    </Box>
  );
}
