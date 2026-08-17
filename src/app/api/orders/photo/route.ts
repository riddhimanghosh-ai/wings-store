import { NextRequest, NextResponse, after } from "next/server";
import { put } from "@vercel/blob";
import { extractOrderFromImage } from "@/lib/extract-order";
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

  const blob = await put(`photos/${Date.now()}-${file.name}`, buffer, {
    access: "private",
    contentType: file.type || "image/jpeg",
  });

  after(flushTelemetry);

  // Both Gemini calls — vision OCR and extraction — hang off this one trace.
  const extraction = await traced(
    {
      traceName: "photo-order",
      userId: typeof customerId === "string" ? customerId : null,
      tags: ["photo", "order-intake"],
    },
    () => extractOrderFromImage(buffer)
  );

  if (!extraction.hasOrder || extraction.items.length === 0) {
    return NextResponse.json(
      { error: "No order could be read from that photo. Try a clearer, closer shot of the note." },
      { status: 422 }
    );
  }

  const order = await persistOrder(extraction, "photo", blob.url, {
    customerId: typeof customerId === "string" && customerId ? customerId : null,
    customerName: typeof customerName === "string" && customerName ? customerName : null,
  });

  return NextResponse.json({ orderId: order.id });
}
