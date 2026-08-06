import { getDb } from "@/db";
import { products } from "@/db/schema";

export async function loadCatalog() {
  const db = getDb();
  return db.select().from(products);
}

export function buildCatalogPromptBlock(
  catalog: Awaited<ReturnType<typeof loadCatalog>>
) {
  return catalog
    .map((p) => `- ${p.name} (aliases: ${p.aliases.join(", ") || "none"})`)
    .join("\n");
}
