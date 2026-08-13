"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  SimpleGrid,
  Heading,
  Text,
  Button,
  Input,
  Image,
  Badge,
  Spinner,
} from "@chakra-ui/react";
import {
  FiSearch,
  FiTrash2,
  FiPlus,
  FiExternalLink,
  FiEdit2,
  FiStar,
  FiEye,
  FiEyeOff,
  FiX,
} from "react-icons/fi";
import {
  listVideos,
  createVideo,
  updateVideo,
  deleteVideo,
  attachVideoGame,
  detachVideoGame,
  searchGamesForLink,
  getVideoSeries,
  type AdminVideo,
  type GameLite,
} from "@/lib/admin/client";
import HostedVideoUpload from "@/components/admin/HostedVideoUpload";
import { uploadHostedFile } from "@/lib/admin/hostedUpload";

const primaryBtn = {
  bg: "nexzy.blue",
  color: "white",
  _hover: { bg: "nexzy.blue", opacity: 0.9 },
};
const outlineBtn = {
  variant: "outline" as const,
  color: "nexzy.white",
  borderColor: "whiteAlpha.300",
  _hover: { bg: "whiteAlpha.100" },
};
const inputStyle = {
  size: "sm" as const,
  bg: "whiteAlpha.50",
  color: "nexzy.white",
  borderColor: "whiteAlpha.300",
  _placeholder: { color: "whiteAlpha.500" },
};

function youtubeIdOf(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return m ? m[1] : /^[a-zA-Z0-9_-]{11}$/.test(url) ? url : null;
}
function thumbFor(v: AdminVideo): string | null {
  if (v.thumbnailUrl) return v.thumbnailUrl;
  const id = youtubeIdOf(v.youtubeUrl);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}
function isShort(url: string | null): boolean {
  return !!url && /\/shorts\/|#short\b/i.test(url);
}

/**
 * Videos library — the CMS for video content. Create / edit / feature /
 * publish / delete any video (standalone or game-linked), and attach games
 * from the video's side. Complements the game-first Game hub. Talks to
 * /newsroom/admin/videos.
 */
export default function VideosPanel() {
  const [videos, setVideos] = useState<AdminVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [reels, setReels] = useState("");
  const [facebook, setFacebook] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [series, setSeries] = useState("");
  const [addingNewSeries, setAddingNewSeries] = useState(false);
  const [seriesOptions, setSeriesOptions] = useState<string[]>([]);
  const [hostedFile, setHostedFile] = useState<File | null>(null);
  const [source, setSource] = useState<"nexzy" | "external">("nexzy");
  const [featured, setFeatured] = useState(false);
  const [saving, setSaving] = useState(false);

  // per-video game attach search
  const [attachFor, setAttachFor] = useState<string | null>(null);
  const [gq, setGq] = useState("");
  const [gResults, setGResults] = useState<GameLite[]>([]);
  const [gSearching, setGSearching] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setVideos(await listVideos(200));
      getVideoSeries()
        .then(setSeriesOptions)
        .catch(() => {});
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setYoutubeUrl("");
    setTiktok("");
    setReels("");
    setFacebook("");
    setThumbnailUrl("");
    setCaption("");
    setSeries("");
    setAddingNewSeries(false);
    setHostedFile(null);
    setSource("nexzy");
    setFeatured(false);
  }
  function openNew() {
    resetForm();
    setShowForm(true);
    setMsg(null);
  }
  function startEdit(v: AdminVideo) {
    setEditingId(v.id);
    setTitle(v.title ?? "");
    setYoutubeUrl(v.youtubeUrl ?? "");
    setTiktok(v.platformLinks?.tiktok ?? "");
    setReels(v.platformLinks?.reels ?? "");
    setFacebook(v.platformLinks?.facebook ?? "");
    setThumbnailUrl(v.thumbnailUrl ?? "");
    setCaption(v.caption ?? "");
    setSeries(v.series ?? "");
    setAddingNewSeries(false);
    setSource(v.source === "external" ? "external" : "nexzy");
    setFeatured(!!v.featured);
    setShowForm(true);
    setMsg(null);
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (title.trim().length < 1) return;
    setSaving(true);
    setMsg(null);
    try {
      const platformLinks: Record<string, string> = {};
      if (tiktok.trim()) platformLinks.tiktok = tiktok.trim();
      if (reels.trim()) platformLinks.reels = reels.trim();
      if (facebook.trim()) platformLinks.facebook = facebook.trim();
      const payload = {
        title: title.trim(),
        youtubeUrl: youtubeUrl.trim(),
        platformLinks,
        thumbnailUrl: thumbnailUrl.trim(),
        caption: caption.trim(),
        series: series.trim() || undefined,
        source,
        featured,
      };
      const saved = editingId
        ? await updateVideo(editingId, payload)
        : await createVideo(payload);
      // If an MP4 was picked in the form, upload it now that the video exists.
      if (hostedFile && saved?.id) {
        setMsg("Uploading video…");
        await uploadHostedFile(saved.id, hostedFile);
      }
      setMsg(null); // clear the "Uploading…" status on success
      setShowForm(false);
      resetForm();
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleFeature(v: AdminVideo) {
    setBusy(v.id);
    try {
      await updateVideo(v.id, { featured: !v.featured });
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function toggleStatus(v: AdminVideo) {
    setBusy(v.id);
    try {
      await updateVideo(v.id, {
        status: v.status === "published" ? "hidden" : "published",
      });
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function remove(v: AdminVideo) {
    // Hard delete (removes the video + its game links) — confirm first so one
    // stray click can't wipe a video.
    if (
      !window.confirm(
        `Delete “${v.title}”? This permanently removes the video and its links.`,
      )
    )
      return;
    setBusy(v.id);
    try {
      await deleteVideo(v.id);
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function detach(v: AdminVideo, gameId: string) {
    setBusy(v.id);
    try {
      await detachVideoGame(v.id, gameId);
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function gameSearch() {
    if (gq.trim().length < 2) return;
    setGSearching(true);
    try {
      setGResults(await searchGamesForLink(gq));
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setGSearching(false);
    }
  }
  async function attach(v: AdminVideo, g: GameLite) {
    setBusy(v.id);
    try {
      await attachVideoGame(v.id, g.id, {
        isPrimary: (v.games?.length ?? 0) === 0,
      });
      setAttachFor(null);
      setGq("");
      setGResults([]);
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Box>
      <Flex align="center" justify="space-between" mb={1} gap={3} wrap="wrap">
        <Heading size="md" color="nexzy.white">
          Videos library
        </Heading>
        <Button size="sm" {...primaryBtn} onClick={openNew}>
          <FiPlus /> New video
        </Button>
      </Flex>
      <Text color="nexzy.gray.100" fontSize="sm" mb={4}>
        Every video, game-linked or standalone. YouTube plays inline on the
        site; TikTok / Reels are &ldquo;also on&rdquo; links. One video can be
        &ldquo;★ Featured&rdquo; at a time — it headlines the /videos hub &amp;
        home rail. Use the Game hub to manage a single game&rsquo;s videos.
      </Text>

      {msg && (
        <Text fontSize="sm" color="red.400" mb={3}>
          {msg}
        </Text>
      )}

      {showForm && (
        <Box
          borderWidth="1px"
          borderColor={editingId ? "nexzy.blue" : "whiteAlpha.300"}
          borderRadius="md"
          p={4}
          mb={6}
        >
          <Text fontSize="sm" fontWeight="700" color="nexzy.white" mb={3}>
            {editingId ? "Edit video" : "New video"}
          </Text>
          <VStack align="stretch" gap={2}>
            <Input
              {...inputStyle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title *"
            />
            <Input
              {...inputStyle}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Caption / description (optional)"
            />
            <Box>
              <Text fontSize="xs" color="gray.400" mb={1}>
                Series (optional) — groups this video into a rail on the Videos
                tab
              </Text>
              <select
                value={addingNewSeries ? "__new__" : series}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__new__") {
                    setAddingNewSeries(true);
                    setSeries("");
                  } else {
                    setAddingNewSeries(false);
                    setSeries(val);
                  }
                }}
                style={{
                  width: "100%",
                  background: "#1a2036",
                  color: "#e6e8f0",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 14,
                }}
              >
                <option value="">— No series —</option>
                {seriesOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="__new__">+ New series…</option>
              </select>
              {addingNewSeries ? (
                <Input
                  {...inputStyle}
                  mt={2}
                  autoFocus
                  value={series}
                  onChange={(e) => setSeries(e.target.value)}
                  placeholder="New series name (e.g. Rewind, Boss Rush)"
                />
              ) : null}
            </Box>
            <Input
              {...inputStyle}
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="YouTube URL (plays inline)"
            />
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={2}>
              <Input
                {...inputStyle}
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                placeholder="TikTok URL (optional)"
              />
              <Input
                {...inputStyle}
                value={reels}
                onChange={(e) => setReels(e.target.value)}
                placeholder="Instagram Reels URL (optional)"
              />
            </SimpleGrid>
            <Input
              {...inputStyle}
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              placeholder="Facebook Reels URL (optional)"
            />
            <Input
              {...inputStyle}
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="Thumbnail URL (optional — YouTube auto-derives)"
            />
            <Box>
              <Text fontSize="xs" color="gray.400" mb={1}>
                Hosted video (optional) — upload an MP4 to play natively in the
                app feed
              </Text>
              <input
                type="file"
                accept="video/mp4,video/quicktime"
                onChange={(e) => setHostedFile(e.target.files?.[0] ?? null)}
                style={{ color: "#cbd5e1", fontSize: 13 }}
              />
              {hostedFile ? (
                <Text fontSize="xs" color="green.300" mt={1}>
                  {hostedFile.name} — uploads on save
                </Text>
              ) : null}
            </Box>
            <HStack gap={2} wrap="wrap">
              <Text fontSize="xs" color="nexzy.gray.100">
                Source:
              </Text>
              <Button
                size="xs"
                onClick={() => setSource("nexzy")}
                {...(source === "nexzy" ? primaryBtn : outlineBtn)}
              >
                Nexzy-made
              </Button>
              <Button
                size="xs"
                onClick={() => setSource("external")}
                {...(source === "external" ? primaryBtn : outlineBtn)}
              >
                External
              </Button>
              <Box w="1px" h="18px" bg="whiteAlpha.300" mx={1} />
              <Button
                size="xs"
                onClick={() => setFeatured((f) => !f)}
                {...(featured ? primaryBtn : outlineBtn)}
              >
                <FiStar /> {featured ? "Featured" : "Not featured"}
              </Button>
            </HStack>
            <HStack gap={2}>
              <Button
                size="sm"
                {...primaryBtn}
                onClick={save}
                loading={saving}
                disabled={title.trim().length < 1}
              >
                {editingId ? "Save changes" : "Create video"}
              </Button>
              <Button
                size="sm"
                {...outlineBtn}
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </HStack>
            {!editingId && (
              <Text fontSize="xs" color="whiteAlpha.500">
                After creating, use &ldquo;+ game&rdquo; on the row to attach it
                to games.
              </Text>
            )}
          </VStack>
        </Box>
      )}

      {loading ? (
        <Spinner size="sm" color="nexzy.blue" />
      ) : videos.length === 0 ? (
        <Text fontSize="sm" color="whiteAlpha.500">
          No videos yet. Click &ldquo;New video&rdquo; to add one.
        </Text>
      ) : (
        <VStack align="stretch" gap={2}>
          {videos.map((v) => {
            const thumb = thumbFor(v);
            const short = isShort(v.youtubeUrl);
            return (
              <Box
                key={v.id}
                borderWidth="1px"
                borderColor={
                  editingId === v.id ? "nexzy.blue" : "whiteAlpha.200"
                }
                borderRadius="md"
                p={2}
              >
                <Flex align="center" gap={3}>
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt=""
                      w="64px"
                      h="36px"
                      borderRadius="sm"
                      objectFit="cover"
                    />
                  ) : (
                    <Box
                      w="64px"
                      h="36px"
                      borderRadius="sm"
                      bg="whiteAlpha.100"
                    />
                  )}
                  <Box flex="1" minW="0">
                    <HStack gap={2}>
                      <Text
                        fontSize="sm"
                        color="nexzy.white"
                        lineClamp={1}
                        fontWeight={v.featured ? "700" : "400"}
                      >
                        {v.title}
                      </Text>
                      {v.featured && (
                        <Badge colorPalette="yellow" variant="solid">
                          ★ Featured
                        </Badge>
                      )}
                    </HStack>
                    <HStack gap={1} mt={1} wrap="wrap">
                      <Badge
                        colorPalette={v.source === "nexzy" ? "blue" : "gray"}
                        variant="subtle"
                      >
                        {v.source}
                      </Badge>
                      {short && (
                        <Badge colorPalette="pink" variant="subtle">
                          Short
                        </Badge>
                      )}
                      <Badge
                        colorPalette={
                          v.status === "published" ? "green" : "orange"
                        }
                        variant="subtle"
                      >
                        {v.status}
                      </Badge>
                      {v.platformLinks?.tiktok && (
                        <Badge colorPalette="pink" variant="outline">
                          TikTok
                        </Badge>
                      )}
                      {v.platformLinks?.reels && (
                        <Badge colorPalette="purple" variant="outline">
                          Reels
                        </Badge>
                      )}
                      {v.platformLinks?.facebook && (
                        <Badge colorPalette="blue" variant="outline">
                          Facebook
                        </Badge>
                      )}
                      {(v.videoUrl || v.mediaKey) && (
                        <Badge colorPalette="green" variant="solid">
                          Hosted
                        </Badge>
                      )}
                      <Text fontSize="11px" color="whiteAlpha.500">
                        {v.viewCount} views
                      </Text>
                    </HStack>
                    {/* attached games */}
                    <HStack gap={1} mt={1.5} wrap="wrap">
                      {(v.games ?? []).map((g) => (
                        <HStack
                          key={g.id}
                          gap={1}
                          px={2}
                          py={0.5}
                          borderRadius="full"
                          bg="whiteAlpha.100"
                        >
                          <Text fontSize="11px" color="nexzy.white">
                            {g.name}
                          </Text>
                          <Box
                            as="button"
                            onClick={() => detach(v, g.id)}
                            color="whiteAlpha.600"
                            _hover={{ color: "red.300" }}
                          >
                            <FiX size={11} />
                          </Box>
                        </HStack>
                      ))}
                      <Button
                        size="2xs"
                        variant="ghost"
                        color="nexzy.lightBlue"
                        _hover={{ bg: "whiteAlpha.100" }}
                        onClick={() =>
                          setAttachFor(attachFor === v.id ? null : v.id)
                        }
                      >
                        + game
                      </Button>
                    </HStack>
                  </Box>
                  <HStack gap={1}>
                    <Button
                      size="xs"
                      {...(v.featured ? primaryBtn : outlineBtn)}
                      onClick={() => toggleFeature(v)}
                      loading={busy === v.id}
                      title={v.featured ? "Unfeature" : "Feature"}
                    >
                      <FiStar />
                    </Button>
                    <Button
                      size="xs"
                      {...outlineBtn}
                      onClick={() => toggleStatus(v)}
                      loading={busy === v.id}
                      title={v.status === "published" ? "Hide" : "Publish"}
                    >
                      {v.status === "published" ? <FiEyeOff /> : <FiEye />}
                    </Button>
                    <Button
                      size="xs"
                      {...outlineBtn}
                      onClick={() => startEdit(v)}
                      title="Edit"
                    >
                      <FiEdit2 />
                    </Button>
                    {v.youtubeUrl && (
                      <Button
                        size="xs"
                        {...outlineBtn}
                        onClick={() =>
                          window.open(
                            v.youtubeUrl!,
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                        title="Open on YouTube"
                      >
                        <FiExternalLink />
                      </Button>
                    )}
                    <Button
                      size="xs"
                      {...outlineBtn}
                      onClick={() => remove(v)}
                      loading={busy === v.id}
                      title="Delete video"
                    >
                      <FiTrash2 />
                    </Button>
                  </HStack>
                </Flex>

                {/* Self-hosted MP4 upload (Nexzy TikTok native feed source) */}
                <Box mt={2} pl="76px">
                  <HostedVideoUpload
                    videoId={v.id}
                    hasHosted={!!(v.videoUrl || v.mediaKey)}
                    onDone={load}
                  />
                </Box>

                {/* attach-game search row */}
                {attachFor === v.id && (
                  <Box
                    mt={2}
                    pt={2}
                    borderTop="1px solid"
                    borderColor="whiteAlpha.200"
                  >
                    <HStack gap={2}>
                      <Input
                        {...inputStyle}
                        value={gq}
                        onChange={(e) => setGq(e.target.value)}
                        placeholder="Search a game to attach…"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") gameSearch();
                        }}
                      />
                      <Button
                        size="sm"
                        {...primaryBtn}
                        onClick={gameSearch}
                        loading={gSearching}
                      >
                        <FiSearch />
                      </Button>
                    </HStack>
                    {gResults.length > 0 && (
                      <VStack align="stretch" gap={1} mt={2}>
                        {gResults.map((g) => (
                          <Flex
                            key={g.id}
                            align="center"
                            gap={2}
                            p={2}
                            borderWidth="1px"
                            borderColor="whiteAlpha.200"
                            borderRadius="md"
                            cursor="pointer"
                            _hover={{ bg: "whiteAlpha.100" }}
                            onClick={() => attach(v, g)}
                          >
                            {g.backgroundImage && (
                              <Image
                                src={g.backgroundImage}
                                alt=""
                                boxSize="24px"
                                borderRadius="sm"
                                objectFit="cover"
                              />
                            )}
                            <Text
                              flex="1"
                              fontSize="sm"
                              color="nexzy.white"
                              lineClamp={1}
                            >
                              {g.name}
                            </Text>
                          </Flex>
                        ))}
                      </VStack>
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
        </VStack>
      )}
    </Box>
  );
}
