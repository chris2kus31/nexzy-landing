import { Container, Heading, Text, Button, Stack } from "@chakra-ui/react";

export default function Home() {
  return (
    <Container maxW="container.xl" py={10}>
      <Stack>
        <Heading>Welcome to Nexzy</Heading>
        <Text>Your Chakra UI is working!</Text>
        <Button colorScheme="blue">Get Started</Button>
      </Stack>
    </Container>
  );
}
