import { getDb } from "../src/db";
import { products } from "../src/db/schema";

type SeedProduct = {
  sku: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  priceIdr: number;
  discountMinQty?: number;
  discountPercent?: number;
  aliases: string[];
};

const STARTER_CATALOG: SeedProduct[] = [
  // Noodles — Wings Food
  { sku: "WF-NDL-001", name: "Mie Sedaap Goreng Original", brand: "Mie Sedaap", category: "noodles", unit: "bungkus", priceIdr: 3000, discountMinQty: 20, discountPercent: 5, aliases: ["sedaap", "sedap", "mie sedap goreng", "mi sedaap goreng", "sedaap goreng"] },
  { sku: "WF-NDL-002", name: "Mie Sedaap Goreng Rendang", brand: "Mie Sedaap", category: "noodles", unit: "bungkus", priceIdr: 3200, discountMinQty: 20, discountPercent: 5, aliases: ["sedaap rendang", "mie sedap rendang"] },
  { sku: "WF-NDL-003", name: "Mie Sedaap Soto", brand: "Mie Sedaap", category: "noodles", unit: "bungkus", priceIdr: 3000, discountMinQty: 20, discountPercent: 5, aliases: ["sedaap soto", "mie sedap soto", "sedap soto"] },
  { sku: "WF-NDL-004", name: "Mie Sedaap Kari Spesial", brand: "Mie Sedaap", category: "noodles", unit: "bungkus", priceIdr: 3000, discountMinQty: 20, discountPercent: 5, aliases: ["sedaap kari", "mie sedap kari"] },
  { sku: "WF-NDL-005", name: "Mie Sedaap Cup Korean Spicy Chicken", brand: "Mie Sedaap", category: "noodles", unit: "cup", priceIdr: 6500, discountMinQty: 12, discountPercent: 5, aliases: ["sedaap cup", "mie cup korean", "mie sedap cup"] },
  { sku: "WF-NDL-006", name: "Mie Sedaap Baked", brand: "Mie Sedaap", category: "noodles", unit: "bungkus", priceIdr: 3500, aliases: ["sedaap baked", "mie sedap panggang"] },
  { sku: "WF-NDL-007", name: "Mie Sedaap Goreng Ayam Bawang", brand: "Mie Sedaap", category: "noodles", unit: "dus", priceIdr: 3000, discountMinQty: 20, discountPercent: 5, aliases: ["mie sedap ayam bawang", "sedaap ayam bawang", "mie sedap ayam bawang dus"] },

  // Seasoning / cooking — Wings Food
  { sku: "WF-SSN-001", name: "Kecap Sedaap Manis 275ml", brand: "Kecap Sedaap", category: "seasoning", unit: "botol", priceIdr: 9000, aliases: ["kecap sedap", "soy sauce sedaap", "sedaap kecap"] },
  { sku: "WF-SSN-002", name: "Kecap Sedaap Sachet", brand: "Kecap Sedaap", category: "seasoning", unit: "sachet", priceIdr: 500, discountMinQty: 50, discountPercent: 8, aliases: ["kecap sachet", "kecap sedap sachet"] },
  { sku: "WF-SSN-003", name: "Minyak Goreng Sedaap 1L", brand: "Sedaap", category: "seasoning", unit: "pouch", priceIdr: 16000, discountMinQty: 12, discountPercent: 6, aliases: ["minyak sedaap", "minyak goreng"] },
  { sku: "WF-SSN-004", name: "Minyak Goreng Sabrina 2L", brand: "Sabrina", category: "seasoning", unit: "pouch", priceIdr: 30000, discountMinQty: 6, discountPercent: 6, aliases: ["minyak sabrina", "sabrina cooking oil"] },

  // RTD Beverages — Wings Food
  // An alias must be variant-specific. The family-level terms ("ale ale",
  // "aleale") used to live here, which made the extractor answer a bare
  // "Ale Ale" with Anggur — a confident wrong SKU, where the correct output is
  // null so a human asks the customer which variant they meant.
  { sku: "WF-BEV-001", name: "Ale-Ale Anggur", brand: "Ale-Ale", category: "beverages", unit: "sachet", priceIdr: 1000, discountMinQty: 50, discountPercent: 8, aliases: ["ale-ale anggur", "anggur"] },
  { sku: "WF-BEV-002", name: "Ale-Ale Jambu", brand: "Ale-Ale", category: "beverages", unit: "sachet", priceIdr: 1000, discountMinQty: 50, discountPercent: 8, aliases: ["ale ale jambu"] },
  { sku: "WF-BEV-003", name: "Ale-Ale FunFlava Cocopandan", brand: "Ale-Ale", category: "beverages", unit: "sachet", priceIdr: 1000, discountMinQty: 50, discountPercent: 8, aliases: ["ale ale cocopandan", "funflava"] },
  { sku: "WF-BEV-004", name: "Floridina Orange 350ml", brand: "Floridina", category: "beverages", unit: "botol", priceIdr: 4000, discountMinQty: 24, discountPercent: 5, aliases: ["florida", "floridina orange", "minuman floridina"] },
  { sku: "WF-BEV-005", name: "Teh Rio", brand: "Teh Rio", category: "beverages", unit: "botol", priceIdr: 3500, aliases: ["teh rio", "the rio"] },
  { sku: "WF-BEV-006", name: "Teh Javana 350ml", brand: "Teh Javana", category: "beverages", unit: "botol", priceIdr: 4000, aliases: ["teh javana", "the javana"] },
  { sku: "WF-BEV-007", name: "Power F", brand: "Power F", category: "beverages", unit: "botol", priceIdr: 4500, aliases: ["power f", "minuman power f"] },
  { sku: "WF-BEV-008", name: "Isoplus", brand: "Isoplus", category: "beverages", unit: "botol", priceIdr: 4000, aliases: ["isoplus", "iso plus"] },
  { sku: "WF-BEV-009", name: "Milku UHT Coklat 190ml", brand: "Milku", category: "beverages", unit: "kotak", priceIdr: 5000, aliases: ["milku", "susu milku coklat"] },

  // Coffee — Wings Food
  { sku: "WF-COF-001", name: "Top Coffee Original", brand: "Top Coffee", category: "coffee", unit: "sachet", priceIdr: 1200, discountMinQty: 50, discountPercent: 8, aliases: ["kopi top", "top kopi", "top coffee original"] },
  { sku: "WF-COF-002", name: "Top Coffee Susu", brand: "Top Coffee", category: "coffee", unit: "sachet", priceIdr: 1200, discountMinQty: 50, discountPercent: 8, aliases: ["top coffee susu", "kopi top susu"] },
  { sku: "WF-COF-003", name: "Neo Coffee", brand: "Neo Coffee", category: "coffee", unit: "sachet", priceIdr: 1500, aliases: ["neo coffee", "kopi neo"] },
  { sku: "WF-COF-004", name: "Extra Joss Original", brand: "Extra Joss", category: "coffee", unit: "sachet", priceIdr: 1000, discountMinQty: 50, discountPercent: 8, aliases: ["extrajoss", "joss", "minuman extra joss"] },
  { sku: "WF-COF-005", name: "Extra Joss Aktif", brand: "Extra Joss", category: "coffee", unit: "sachet", priceIdr: 1000, discountMinQty: 50, discountPercent: 8, aliases: ["extra joss aktif"] },

  // Powder drinks — Wings Food
  // "Full O Milk" is what the order notes actually write for this product.
  // Without it the shared "milk"/"coklat" tokens pulled the match to
  // Milku UHT Coklat 190ml — a real product, and the wrong one.
  { sku: "WF-PWD-001", name: "Choco Drink", brand: "Choco Drink", category: "powder_drinks", unit: "sachet", priceIdr: 1000, discountMinQty: 50, discountPercent: 8, aliases: ["chocolate drink", "coklat", "susu coklat", "choco drink", "milk coklat", "full o milk", "fullo milk", "full o milk coklat"] },
  { sku: "WF-PWD-002", name: "Jasjus Jeruk", brand: "Jasjus", category: "powder_drinks", unit: "sachet", priceIdr: 500, discountMinQty: 50, discountPercent: 8, aliases: ["jasjus", "jasjus orange"] },
  { sku: "WF-PWD-003", name: "Milkjus Coklat", brand: "Milkjus", category: "powder_drinks", unit: "sachet", priceIdr: 800, aliases: ["milkjus", "milkjus coklat"] },
  { sku: "WF-PWD-004", name: "Teajus", brand: "Teajus", category: "powder_drinks", unit: "sachet", priceIdr: 500, aliases: ["teajus", "teh jus"] },
  { sku: "WF-PWD-005", name: "Segar Dingin", brand: "Segar Dingin", category: "powder_drinks", unit: "sachet", priceIdr: 500, aliases: ["segar dingin drink", "sd drink"] },

  // Snacks / ice cream — Glico Wings / Calbee Wings
  { sku: "WF-SNK-001", name: "Potabee Original", brand: "Potabee", category: "snacks", unit: "pack", priceIdr: 7000, aliases: ["potabee", "keripik kentang potabee"] },
  { sku: "WF-SNK-002", name: "Krisbee", brand: "Krisbee", category: "snacks", unit: "pack", priceIdr: 6000, aliases: ["krisbee"] },
  { sku: "WF-SNK-003", name: "Waku Waku Ice Cream", brand: "Waku Waku", category: "snacks", unit: "pcs", priceIdr: 5000, aliases: ["waku waku", "es krim waku waku"] },

  // Household — Wings Group
  { sku: "WG-HH-001", name: "So Klin Matic Deterjen 800g", brand: "So Klin", category: "household", unit: "pouch", priceIdr: 18000, discountMinQty: 12, discountPercent: 6, aliases: ["soklin", "detergen soklin", "so klin matic"] },
  { sku: "WG-HH-002", name: "So Klin Pewangi Softener", brand: "So Klin", category: "household", unit: "pouch", priceIdr: 12000, aliases: ["soklin pewangi", "pelembut so klin"] },
  { sku: "WG-HH-009", name: "So Klin 2in1 Softener English Rose 700ml", brand: "So Klin", category: "household", unit: "pouch", priceIdr: 13500, discountMinQty: 12, discountPercent: 6, aliases: ["soklin 2 in 1 softener", "soklin english rose", "soklin softener english rose"] },
  { sku: "WG-HH-003", name: "Daia Deterjen", brand: "Daia", category: "household", unit: "pouch", priceIdr: 14000, discountMinQty: 12, discountPercent: 5, aliases: ["daia deterjen", "sabun cuci daia"] },
  { sku: "WG-HH-004", name: "Boom Deterjen", brand: "Boom", category: "household", unit: "pouch", priceIdr: 13000, aliases: ["boom deterjen", "sabun cuci boom"] },
  { sku: "WG-HH-005", name: "Mama Lemon Sabun Cuci Piring 800ml", brand: "Mama Lemon", category: "household", unit: "botol", priceIdr: 10000, aliases: ["sabun cuci piring", "mama lemon dish soap"] },
  { sku: "WG-HH-010", name: "Mama Lemon Jeruk Nipis 680ml", brand: "Mama Lemon", category: "household", unit: "botol", priceIdr: 9000, aliases: ["mama lemon jeruk nipis", "mama lemon lime", "sabun cuci piring jeruk nipis"] },
  { sku: "WG-HH-006", name: "Wings Biru Deterjen Bubuk", brand: "Wings Biru", category: "household", unit: "pouch", priceIdr: 5000, aliases: ["wings biru", "detergen wings biru"] },
  { sku: "WG-HH-007", name: "Super Sol Pembersih Lantai", brand: "Super Sol", category: "household", unit: "botol", priceIdr: 8000, aliases: ["super sol", "pembersih lantai"] },
  { sku: "WG-HH-008", name: "WPC Porcelain & Closet Cleaner", brand: "WPC", category: "household", unit: "botol", priceIdr: 9000, aliases: ["wpc", "pembersih kloset"] },

  // Personal care — Wings Care / Lion Wings
  { sku: "WG-PC-001", name: "Ciptadent Toothpaste 190g", brand: "Ciptadent", category: "personal_care", unit: "tube", priceIdr: 10000, aliases: ["pasta gigi ciptadent", "ciptadent toothpaste"] },
  { sku: "WG-PC-002", name: "Systema Toothpaste", brand: "Systema", category: "personal_care", unit: "tube", priceIdr: 14000, aliases: ["pasta gigi systema", "systema toothpaste"] },
  { sku: "WG-PC-003", name: "Systema Mouthwash", brand: "Systema", category: "personal_care", unit: "botol", priceIdr: 15000, aliases: ["systema mouthwash", "obat kumur systema"] },
  { sku: "WG-PC-004", name: "Giv Body Wash", brand: "Giv", category: "personal_care", unit: "botol", priceIdr: 15000, aliases: ["sabun giv", "giv body wash"] },
  { sku: "WG-PC-005", name: "Giv Sabun Batang", brand: "Giv", category: "personal_care", unit: "bar", priceIdr: 3000, aliases: ["giv soap", "sabun batang giv"] },
  { sku: "WG-PC-011", name: "Giv White Hijab", brand: "Giv", category: "personal_care", unit: "lusin", priceIdr: 36000, discountMinQty: 5, discountPercent: 5, aliases: ["giv white hijab soap", "sabun giv hijab", "giv hijab"] },
  { sku: "WG-PC-006", name: "Nuvo Sabun Kesehatan", brand: "Nuvo", category: "personal_care", unit: "bar", priceIdr: 3500, aliases: ["sabun nuvo", "nuvo soap bar"] },
  { sku: "WG-PC-007", name: "Nuvo Hand Sanitizer", brand: "Nuvo", category: "personal_care", unit: "botol", priceIdr: 8000, aliases: ["nuvo hand sanitizer", "hand sanitizer nuvo"] },
  { sku: "WG-PC-008", name: "Emeron Shampoo Sachet", brand: "Emeron", category: "personal_care", unit: "sachet", priceIdr: 1000, discountMinQty: 50, discountPercent: 8, aliases: ["emeron shampoo", "shampo emeron"] },
  { sku: "WG-PC-009", name: "Zinc Shampoo Anti Dandruff", brand: "Zinc", category: "personal_care", unit: "botol", priceIdr: 18000, aliases: ["zinc shampoo", "shampo zinc anti ketombe"] },
  { sku: "WG-PC-010", name: "Serasoft Conditioner Sachet", brand: "Serasoft", category: "personal_care", unit: "sachet", priceIdr: 500, aliases: ["serasoft", "conditioner serasoft"] },

  // Baby care — Wings Care
  { sku: "WG-BC-001", name: "Kodomo Baby Shampoo", brand: "Kodomo", category: "baby_care", unit: "botol", priceIdr: 12000, aliases: ["kodomo shampoo", "shampo bayi kodomo"] },
  { sku: "WG-BC-002", name: "Baby Happy Diapers M", brand: "Baby Happy", category: "baby_care", unit: "pack", priceIdr: 35000, discountMinQty: 6, discountPercent: 5, aliases: ["baby happy diaper", "pampers baby happy"] },
  { sku: "WG-BC-003", name: "Hers Protex Pembalut", brand: "Hers Protex", category: "baby_care", unit: "pack", priceIdr: 8000, aliases: ["hers protex", "pembalut hers"] },
];

async function main() {
  const db = getDb();
  await db.insert(products).values(STARTER_CATALOG).onConflictDoNothing();
  console.log(`Seeded ${STARTER_CATALOG.length} Wings products.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
