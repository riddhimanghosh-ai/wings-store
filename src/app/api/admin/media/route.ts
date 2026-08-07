import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";

/**
 * Voice notes were uploaded without an explicit content type, so the blob
 * reports application/octet-stream and browsers refuse to play them in an
 * <audio> element. Fall back to the extension in that case.
 */
const EXTENSION_TYPES: Record<string, string> = {
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  mp4: "audio/mp4",
  ogg: "audio/ogg",
  wav: "audio/wav",
  webm: "audio/webm",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  heic: "image/heic",
  png: "image/png",
  webp: "image/webp",
};

function resolveContentType(url: string, stored: string | undefined) {
  if (stored && stored !== "application/octet-stream") return stored;
  const ext = new URL(url).pathname.split(".").pop()?.toLowerCase();
  return (ext && EXTENSION_TYPES[ext]) || stored || "application/octet-stream";
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url || !url.includes(".blob.vercel-storage.com")) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  const result = await get(url, { access: "private" });
  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: { "Content-Type": resolveContentType(url, result.blob.contentType) },
  });
}
