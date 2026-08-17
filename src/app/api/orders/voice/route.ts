import { NextRequest, NextResponse, after } from "next/server";
import { put } from "@vercel/blob";
import { extractOrderFromAudio, SttRateLimitError } from "@/lib/extract-order";
import { persistOrder } from "@/lib/persist-order";
import { flushTelemetry, traced } from "@/lib/telemetry";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  const customerId = formData.get("customerId");
  const customerName = formData.get("customerName");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "audio/webm";

  const blob = await put(`voice/${Date.now()}-${file.name}`, buffer, {
    access: "private",
    contentType: mimeType,
  });

  // Spans are buffered, and a serverless function is frozen the instant it
  // responds — flush after the response so tracing never adds latency to the
  // upload but also never loses the trace.
  after(flushTelemetry);

  let extraction;
  try {
    // One trace per upload: the Whisper span and the Gemini extraction span
    // land under it, so the cost shown against an order is the whole order.
    extraction = await traced(
      {
        traceName: "voice-order",
        userId: typeof customerId === "string" ? customerId : null,
        tags: ["voice", "order-intake"],
        metadata: { mimeType },
      },
      () => extractOrderFromAudio(buffer)
    );
  } catch (err) {
    if (err instanceof SttRateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    throw err;
  }

  if (!extraction.hasOrder || extraction.items.length === 0) {
    return NextResponse.json(
      { error: "No order could be understood from that recording. Try again and clearly say the products and quantities." },
      { status: 422 }
    );
  }

  const order = await persistOrder(extraction, "voice", blob.url, {
    customerId: typeof customerId === "string" && customerId ? customerId : null,
    customerName: typeof customerName === "string" && customerName ? customerName : null,
  });

  return NextResponse.json({ orderId: order.id });
}
