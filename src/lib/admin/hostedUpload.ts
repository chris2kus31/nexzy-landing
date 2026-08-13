// lib/admin/hostedUpload.ts
//
// Shared hosted-MP4 upload flow (browser -> presigned S3 PUT -> attach), used by
// both the per-row upload button and the New/Edit video form.
"use client";

import { getHostedUploadUrl, setHostedMedia } from "./client";

/** Read intrinsic dimensions + duration from a video File in the browser. */
export function readVideoMeta(
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

/** Full upload: read meta -> presigned URL -> PUT to S3 -> attach to the video. */
export async function uploadHostedFile(
  videoId: string,
  file: File,
): Promise<void> {
  const meta = await readVideoMeta(file);
  const { url, key } = await getHostedUploadUrl(videoId, file.type);
  const put = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!put.ok) throw new Error(`Upload failed (${put.status})`);
  await setHostedMedia(videoId, {
    mediaKey: key,
    durationSec: meta.durationSec,
    width: meta.width,
    height: meta.height,
  });
}
