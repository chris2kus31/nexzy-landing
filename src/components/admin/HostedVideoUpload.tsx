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
import { uploadHostedFile } from "@/lib/admin/hostedUpload";

const ACCEPT = "video/mp4,video/quicktime";

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
    setMsg("Uploading…");
    try {
      await uploadHostedFile(videoId, file);
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
