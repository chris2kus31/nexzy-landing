"use client";

import { Box, Text } from "@chakra-ui/react";
import SignInPanel from "./SignInPanel";

/**
 * Sign-in popup shown when a signed-out reader tries to post, reply, or vote.
 * Lets them keep whatever they were typing (the composer stays mounted behind
 * the overlay) and continue after signing in.
 */
export default function SignInModal({
  open,
  onClose,
  onSignedIn,
}: {
  open: boolean;
  onClose: () => void;
  onSignedIn?: () => void;
}) {
  if (!open) return null;
  return (
    <Box
      position="fixed"
      inset="0"
      zIndex={2000}
      bg="blackAlpha.700"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={4}
      onClick={onClose}
    >
      <Box
        onClick={(e) => e.stopPropagation()}
        bg="#0f1730"
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="16px"
        p={{ base: 6, md: 8 }}
        maxW="400px"
        w="100%"
        position="relative"
        boxShadow="0 24px 60px rgba(0,0,0,.6)"
      >
        <Box
          as="button"
          position="absolute"
          top={3}
          right={4}
          fontSize="lg"
          color="whiteAlpha.600"
          _hover={{ color: "white" }}
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </Box>
        <Text
          fontFamily="heading"
          fontSize="xl"
          fontWeight="700"
          color="white"
          textAlign="center"
          mb={1}
        >
          Join the conversation
        </Text>
        <Text fontSize="sm" color="whiteAlpha.700" textAlign="center" mb={5}>
          Sign in or create an account to comment, reply, and vote.
        </Text>
        <SignInPanel
          onDone={() => {
            onSignedIn?.();
            onClose();
          }}
        />
      </Box>
    </Box>
  );
}
