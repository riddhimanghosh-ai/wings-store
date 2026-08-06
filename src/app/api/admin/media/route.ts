import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";

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
    headers: { "Content-Type": result.blob.contentType },
  });
}
