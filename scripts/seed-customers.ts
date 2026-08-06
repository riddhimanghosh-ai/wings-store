import { getDb } from "../src/db";
import { customers } from "../src/db/schema";

const DEMO_CUSTOMERS = [
  {
    storeName: "Toko Bu Sari",
    contactName: "Sari Wulandari",
    phone: "+62 812-3456-7890",
    city: "Surabaya",
    address: "Jl. Raya Darmo No. 45, Surabaya",
  },
  {
    storeName: "Warung Pak Budi",
    contactName: "Budi Santoso",
    phone: "+62 813-2233-4455",
    city: "Jakarta",
    address: "Jl. Kebon Jeruk No. 12, Jakarta Barat",
  },
  {
    storeName: "Grosir Maju Jaya",
    contactName: "Andi Pratama",
    phone: "+62 811-9988-7766",
    city: "Bandung",
    address: "Jl. Asia Afrika No. 88, Bandung",
  },
  {
    storeName: "Minimarket Sejahtera",
    contactName: "Dewi Lestari",
    phone: "+62 815-5566-7788",
    city: "Semarang",
    address: "Jl. Pandanaran No. 21, Semarang",
  },
  {
    storeName: "Toko Sinar Abadi",
    contactName: "Rudi Hartono",
    phone: "+62 817-1122-3344",
    city: "Medan",
    address: "Jl. Gatot Subroto No. 7, Medan",
  },
];

async function main() {
  const db = getDb();
  await db.insert(customers).values(DEMO_CUSTOMERS).onConflictDoNothing();
  console.log(`Seeded ${DEMO_CUSTOMERS.length} demo customers.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
