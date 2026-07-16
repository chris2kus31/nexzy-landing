import NextLink from "next/link";
import { HStack, VStack, Text, Link } from "@chakra-ui/react";
import { getAuthorByName } from "@/lib/blog/authors";
import AuthorAvatar from "./AuthorAvatar";

/**
 * Article byline (E-E-A-T). Shows the named author with avatar + link to their
 * page, plus a "Reviewed by the Nexzy newsroom" trust line (true — every article
 * is human-approved before publishing). The avatar degrades to an initials chip
 * if the headshot is missing, and legacy/unmapped bylines fall back to a plain
 * label.
 */
export default function Byline({
  author,
  date,
  updated,
}: {
  author: string | null;
  date?: string | null;
  updated?: string | null;
}) {
  const name = author || "Nexzy Editorial";
  const persona = getAuthorByName(author);
  // Show "Updated" only when the last edit is clearly after publish (>24h);
  // otherwise a freshly-published post would falsely read "Updated".
  const showUpdated =
    !!date && !!updated && Date.parse(updated) - Date.parse(date) > 86400000;
  const shown = showUpdated ? updated! : date;
  const dateStr = shown
    ? new Date(shown).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <HStack gap={3} align="center">
      <AuthorAvatar src={persona?.avatar} name={name} size={40} />
      <VStack align="flex-start" gap={0}>
        <Text color="gray.200" fontSize="sm">
          By{" "}
          {persona ? (
            <Link
              asChild
              color="nexzy.lightBlue"
              fontWeight="600"
              _hover={{ textDecoration: "underline" }}
            >
              <NextLink href={`/author/${persona.slug}`}>{name}</NextLink>
            </Link>
          ) : (
            <Text as="span" fontWeight="600" color="gray.100">
              {name}
            </Text>
          )}
          {persona ? `, ${persona.role}` : ""}
        </Text>
        <Text color="gray.500" fontSize="xs">
          {dateStr ? `${showUpdated ? "Updated " : ""}${dateStr} · ` : ""}
          Reviewed by the Nexzy newsroom
        </Text>
      </VStack>
    </HStack>
  );
}
