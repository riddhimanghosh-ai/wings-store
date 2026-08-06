import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { extractOrderFromAudio } from "@/lib/extract-order";
import { persistOrder } from "@/lib/persist-order";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  const customerId = formData.get("customerId");
  const customerName = formData.get("customerName");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const blob = await put(`voice/${Date.now()}-${file.name}`, buffer, {
    access: "private",
    contentType: file.type || "audio/webm",
  });

  const extraction = await extractOrderFromAudio(buffer);

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
