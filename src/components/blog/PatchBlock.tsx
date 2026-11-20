import type { PublicPost } from "@/lib/blog/api";
import PatchBoard from "@/components/blog/PatchBoard";
import { boardFromFormatData } from "@/lib/blog/patch";

type Patch = NonNullable<NonNullable<PublicPost["formatData"]>["patch"]>;

/**
 * Patch Notes core module for patch_notes posts: renders formatData.patch as
 * the patch board (components/blog/PatchBoard.tsx). Older posts that only have
 * kind/name/detail still render (no old -> new numbers, no groups). Renders
 * nothing without changes.
 */
export default function PatchBlock({ patch }: { patch?: Patch | null }) {
  const data = boardFromFormatData(patch);
  return data ? <PatchBoard data={data} /> : null;
}
