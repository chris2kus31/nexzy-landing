// The Drops app pitch: what the app actually gives you for the games you just
// picked, store buttons, and a scan-to-install code on tablet and desktop
// (a desktop visitor can't tap a store link). Same /get QR as the homepage.
import { Box, Flex, Image, Stack, Text } from "@chakra-ui/react";
import { FiRss, FiUsers, FiMessageCircle } from "react-icons/fi";
import StoreButtons from "@/components/drops/StoreButtons";
import { D } from "@/components/drops/tokens";

const POINTS = [
  {
    icon: FiRss,
    title: "One feed for all your games",
    body: "News, guides and price drops for every game you follow.",
  },
  {
    icon: FiUsers,
    title: "Players who pick like you",
    body: "See who picked the same games and follow them.",
  },
  {
    icon: FiMessageCircle,
    title: "Squad up in a Room",
    body: "Plan the night and play together.",
  },
] as const;

export default function AppPitch({
  location,
  title = "Follow these games on Nexzy",
}: {
  location: string;
  title?: string;
}) {
  return (
    <Box
      p={5}
      borderRadius="18px"
      border="1px solid rgba(110,139,255,0.45)"
      bg="linear-gradient(135deg, rgba(59,107,255,0.20), rgba(26,31,71,0.7))"
    >
      <Text fontSize="xs" fontWeight="800" color={D.blueSoft}>
        Free on iPhone and Android
      </Text>
      <Text fontFamily="title" fontWeight="700" fontSize="2xl" mt={1}>
        {title}
      </Text>
      <Flex gap={5} mt={3} align="flex-start">
        <Stack gap={3} flex="1" minW={0}>
          {POINTS.map(({ icon: Icon, title: t, body }) => (
            <Flex key={t} gap={3} align="flex-start">
              <Flex
                w="30px"
                h="30px"
                flexShrink={0}
                borderRadius="9px"
                bg="rgba(255,210,74,0.14)"
                color={D.yellow}
                align="center"
                justify="center"
              >
                <Icon size={16} />
              </Flex>
              <Box minW={0}>
                <Text fontWeight="700" fontSize="sm">
                  {t}
                </Text>
                <Text color={D.dim} fontSize="sm">
                  {body}
                </Text>
              </Box>
            </Flex>
          ))}
        </Stack>
        <Stack
          display={{ base: "none", md: "flex" }}
          align="center"
          gap={1.5}
          flexShrink={0}
        >
          <Box bg="white" p={2} borderRadius="12px">
            <Image
              src="/qr-get-app.png"
              alt="Scan to get the Nexzy app on your phone"
              boxSize="96px"
            />
          </Box>
          <Text fontSize="xs" color={D.dim}>
            Scan to get it
          </Text>
        </Stack>
      </Flex>
      <Box mt={4}>
        <StoreButtons location={location} />
      </Box>
    </Box>
  );
}
