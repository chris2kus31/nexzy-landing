import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import NextLink from "next/link";
import { Heading, Text, Link, List, Box } from "@chakra-ui/react";

/**
 * Renders article markdown into themed Chakra elements (server-rendered for
 * SEO). Raw HTML in markdown is ignored by react-markdown by default, so this
 * is XSS-safe.
 */
export default function Markdown({ children }: { children: string }) {
  return (
    <Box color="gray.200" lineHeight="1.8" fontSize="lg">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <Heading as="h1" size="2xl" color="white" mt={8} mb={4}>
              {children}
            </Heading>
          ),
          h2: ({ children }) => (
            <Heading as="h2" size="xl" color="white" mt={8} mb={3}>
              {children}
            </Heading>
          ),
          h3: ({ children }) => (
            <Heading as="h3" size="lg" color="white" mt={6} mb={2}>
              {children}
            </Heading>
          ),
          p: ({ children }) => <Text mb={4}>{children}</Text>,
          a: ({ href, children }) => {
            // Internal links (/blog/...) navigate in-tab via Next's router;
            // external links open in a new tab.
            const isInternal = typeof href === "string" && href.startsWith("/");
            if (isInternal) {
              return (
                <Link
                  asChild
                  color="nexzy.lightBlue"
                  textDecoration="underline"
                >
                  <NextLink href={href}>{children}</NextLink>
                </Link>
              );
            }
            return (
              <Link
                href={href}
                color="nexzy.lightBlue"
                textDecoration="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </Link>
            );
          },
          ul: ({ children }) => (
            <List.Root mb={4} pl={6}>
              {children}
            </List.Root>
          ),
          ol: ({ children }) => (
            <List.Root as="ol" mb={4} pl={6}>
              {children}
            </List.Root>
          ),
          li: ({ children }) => <List.Item mb={2}>{children}</List.Item>,
          strong: ({ children }) => (
            <Text as="strong" color="white" fontWeight="700">
              {children}
            </Text>
          ),
          em: ({ children }) => <Text as="em">{children}</Text>,
          blockquote: ({ children }) => (
            <Box
              borderLeft="3px solid"
              borderColor="nexzy.blue"
              pl={4}
              my={4}
              color="gray.300"
              fontStyle="italic"
            >
              {children}
            </Box>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </Box>
  );
}
