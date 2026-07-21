import { Fragment, type ReactNode } from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import AppCta from "@/components/blog/AppCta";
import GuideMarkdown from "./GuideMarkdown";

/**
 * GUIDE-ONLY body renderer. Splits the guide markdown into its "## " sections
 * and gives them the Nexzy guide treatment: the answer-first "short version" as
 * a highlighted callout, "if it's not working" as an amber troubleshooting
 * block, everything else as a normal section — and drops the install CTA in
 * right after the answer. News/blog render through ArticleBody instead, so this
 * can evolve on its own with no blast radius.
 */

type Section = { heading: string; body: string };

function splitSections(md: string): Section[] {
  const lines = md.split(/\r?\n/);
  const out: Section[] = [];
  let cur: Section | null = null;
  const preamble: string[] = [];
  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m && !line.startsWith("###")) {
      if (cur) out.push(cur);
      cur = { heading: m[1].replace(/[#*`]/g, "").trim(), body: "" };
    } else if (cur) {
      cur.body += line + "\n";
    } else {
      preamble.push(line);
    }
  }
  if (cur) out.push(cur);
  const pre = preamble.join("\n").trim();
  if (pre) out.unshift({ heading: "", body: pre });
  return out.map((s) => ({ heading: s.heading, body: s.body.trim() }));
}

function ShortVersion({ children }: { children: ReactNode }) {
  return (
    <Box
      bg="rgba(0,123,255,0.07)"
      borderWidth="1px"
      borderColor="rgba(0,123,255,0.25)"
      borderLeftWidth="4px"
      borderLeftColor="nexzy.blue"
      borderRadius="xl"
      px={5}
      py={4}
      mb={2}
    >
      <Text
        fontSize="11px"
        fontWeight="800"
        letterSpacing="0.14em"
        textTransform="uppercase"
        color="nexzy.lightBlue"
        mb={2}
      >
        The short version
      </Text>
      <Box css={{ "& > div > p:last-child": { marginBottom: 0 } }}>
        {children}
      </Box>
    </Box>
  );
}

function Trouble({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <Box
      mt={9}
      borderLeftWidth="3px"
      borderLeftColor="nexzy.gold"
      bg="rgba(255,196,0,0.05)"
      borderRadius="0 12px 12px 0"
      px={5}
      py={4}
    >
      <Text
        fontSize="12px"
        fontWeight="800"
        letterSpacing="0.08em"
        textTransform="uppercase"
        color="nexzy.gold"
        mb={2}
      >
        {heading || "If it's not working"}
      </Text>
      {children}
    </Box>
  );
}

export default function GuideBody({
  body,
  location,
}: {
  body: string;
  location: string;
}) {
  const sections = splitSections(body);
  if (!sections.length) return <GuideMarkdown>{body}</GuideMarkdown>;

  return (
    <Box>
      {sections.map((s, i) => {
        const key = s.heading.toLowerCase();
        const isShort = key.startsWith("the short version");
        const isTrouble =
          key.startsWith("if it") || key.includes("not working");

        let node: ReactNode;
        if (isShort) {
          node = (
            <ShortVersion>
              <GuideMarkdown>{s.body}</GuideMarkdown>
            </ShortVersion>
          );
        } else if (isTrouble) {
          node = (
            <Trouble heading={s.heading}>
              <GuideMarkdown>{s.body}</GuideMarkdown>
            </Trouble>
          );
        } else {
          node = (
            <Box>
              {s.heading && (
                <Heading
                  as="h2"
                  fontFamily="heading"
                  size="xl"
                  color="white"
                  mt={9}
                  mb={3}
                >
                  {s.heading}
                </Heading>
              )}
              <GuideMarkdown>{s.body}</GuideMarkdown>
            </Box>
          );
        }

        return (
          <Fragment key={i}>
            {node}
            {i === 0 && (
              <Box my={8}>
                <AppCta variant="inline" location={location} />
              </Box>
            )}
          </Fragment>
        );
      })}
    </Box>
  );
}
