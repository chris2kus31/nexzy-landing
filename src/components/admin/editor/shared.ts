import type { BlogPost } from "@/lib/admin/client";

/** Byline options for the author override (writer names are appended at runtime). */
export const BYLINES = ["Chuy", "Eli", "Leslie", "Nexzy Editorial"];

/** The editable form the post editors bind to. Shared by the article + guide editors. */
export interface FormState {
  title: string;
  seoTitle: string;
  excerpt: string;
  seoDescription: string;
  bodyMarkdown: string;
  imageAlt: string;
  imageCredit: string;
  youtubeUrl: string;
  tags: string;
  faq: string;
}

export function toForm(p: BlogPost): FormState {
  return {
    title: p.title || "",
    seoTitle: p.seoTitle || "",
    excerpt: p.excerpt || "",
    seoDescription: p.seoDescription || "",
    bodyMarkdown: p.bodyMarkdown || "",
    imageAlt: p.imageAlt || "",
    imageCredit: p.imageCredit || "",
    youtubeUrl: p.youtubeUrl || "",
    tags: (p.tags || []).join(", "),
    faq: (p.faq || []).map((f) => `${f.q} :: ${f.a}`).join("\n"),
  };
}

export const labelProps = {
  fontSize: "xs",
  fontWeight: "600",
  color: "nexzy.gray.100",
  mb: 1,
  textTransform: "uppercase" as const,
  letterSpacing: "wide",
};

export const inputProps = {
  bg: "whiteAlpha.50",
  color: "nexzy.white",
  borderColor: "whiteAlpha.300",
  _placeholder: { color: "whiteAlpha.500" },
  w: "full",
  maxW: "full",
};
