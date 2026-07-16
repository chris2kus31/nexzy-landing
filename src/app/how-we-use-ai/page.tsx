import { redirect } from "next/navigation";

// The old "How we use AI" page has been replaced by the human-led Editorial
// Standards page. Redirect (permanent) so existing links + SEO don't 404.
export default function HowWeUseAIRedirect() {
  redirect("/editorial-standards");
}
