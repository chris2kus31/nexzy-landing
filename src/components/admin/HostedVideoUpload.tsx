// components/admin/HostedVideoUpload.tsx
//
// Admin control to upload a self-hosted MP4 for an existing video (the "Nexzy
// TikTok" native feed source). Flow:
//   1. pick an .mp4/.mov file
//   2. read its width/height/duration client-side (a hidden <video> element)
//   3. POST for a presigned S3 PUT URL
//   4. PUT the file DIRECTLY to S3 (needs the bucket CORS PUT rule)
//   5. PATCH the video with the key + dimensions -> it's now hosted
"use client";

import { useRef, useState } from "react";
import { Box, Button, Text } from "@chakra-ui/react";
import { FiUploadCloud, FiCheckCircle } from "react-icons/fi";
import { getHostedUploadUrl, setHostedMedia } from "@/lib/admin/client";

const ACCEPT = "video/mp4,video/quicktime";

/** Read intrinsic dimensions + duration from a video File in the browser. */
function readVideoMeta(
  file: File,
): Promise<{ width: number; height: number; durationSec: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement("video");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      const meta = {
        width: el.videoWidth || 0,
        height: el.videoHeight || 0,
        durationSec: Math.round(el.duration || 0),
      };
      URL.revokeObjectURL(url);
      resolve(meta);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0, durationSec: 0 });
    };
    el.src = url;
  });
}

export default function HostedVideoUpload({
  videoId,
  hasHosted,
  onDone,
}: {
  videoId: string;
  hasHosted?: boolean;
  onDone?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    setErr(false);
    setMsg("Reading video…");
    try {
      const meta = await readVideoMeta(file);
      setMsg("Requesting upload URL…");
      const { url, key } = await getHostedUploadUrl(videoId, file.type);

      setMsg("Uploading to S3…");
      const put = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);

      setMsg("Attaching…");
      await setHostedMedia(videoId, {
        mediaKey: key,
        durationSec: meta.durationSec,
        width: meta.width,
        height: meta.height,
      });
      setMsg("Uploaded ✓");
      onDone?.();
    } catch (e) {
      setErr(true);
      setMsg(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = ""; // allow re-selecting the same file
        }}
      />
      <Button
        size="sm"
        gap={2}
        fontWeight="600"
        loading={busy}
        loadingText="Uploading…"
        onClick={() => inputRef.current?.click()}
        bg={hasHosted ? "green.600" : "blue.500"}
        color="white"
        _hover={{ bg: hasHosted ? "green.700" : "blue.600" }}
        borderRadius="md"
      >
        {hasHosted ? <FiCheckCircle /> : <FiUploadCloud />}
        {hasHosted ? "Replace hosted video" : "Upload video (MP4)"}
      </Button>
      {msg ? (
        <Text fontSize="xs" mt={1.5} color={err ? "red.300" : "gray.300"}>
          {msg}
        </Text>
      ) : (
        <Text fontSize="11px" mt={1.5} color="whiteAlpha.500">
          {hasHosted
            ? "This video plays natively in the app feed."
            : "Adds a native MP4 for the in-app vertical feed (signed-in users)."}
        </Text>
      )}
    </Box>
  );
}
