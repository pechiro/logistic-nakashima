// Import the generated client directly (schema output = ../src/generated/prisma).
// The seed runs outside Next, so it can't use the "@/" alias.
import { PrismaClient } from "../src/generated/prisma";
import { hashPassword } from "../src/lib/auth";

const prisma = new PrismaClient();

// 12 realistic products across five categories. Six sit at or below their
// reorder level so the "low stock" surface has something to show on first run.
const products = [
  // Electronics
  { name: "Aeron Wireless Mouse", sku: "ELC-1042", category: "Electronics", quantity: 8, reorderLevel: 15, unitPrice: 29.99 },
  { name: "USB-C Hub, 7-in-1", sku: "ELC-2087", category: "Electronics", quantity: 42, reorderLevel: 20, unitPrice: 45.0 },
  { name: "Mechanical Keyboard, TKL", sku: "ELC-3311", category: "Electronics", quantity: 3, reorderLevel: 10, unitPrice: 89.99 },
  { name: '27" 4K Monitor', sku: "ELC-4560", category: "Electronics", quantity: 17, reorderLevel: 8, unitPrice: 329.0 },
  // Office Supplies
  { name: "A5 Dotted Notebook", sku: "OFF-1201", category: "Office Supplies", quantity: 120, reorderLevel: 40, unitPrice: 12.5 },
  { name: "Gel Ink Pens, 12-pack", sku: "OFF-1330", category: "Office Supplies", quantity: 30, reorderLevel: 30, unitPrice: 8.75 },
  // Packaging
  { name: "Kraft Shipping Boxes, Medium", sku: "PKG-5002", category: "Packaging", quantity: 5, reorderLevel: 25, unitPrice: 1.2 },
  { name: "Bubble Mailers, 100 ct", sku: "PKG-5110", category: "Packaging", quantity: 60, reorderLevel: 30, unitPrice: 18.4 },
  // Home & Kitchen
  { name: "Stainless Water Bottle, 750ml", sku: "HOM-7788", category: "Home & Kitchen", quantity: 34, reorderLevel: 20, unitPrice: 22.0 },
  { name: "Ceramic Pour-Over Set", sku: "HOM-8090", category: "Home & Kitchen", quantity: 0, reorderLevel: 12, unitPrice: 38.0 },
  // Apparel
  { name: "Cotton Crew T-Shirt, Black", sku: "APP-3021", category: "Apparel", quantity: 54, reorderLevel: 25, unitPrice: 15.0 },
  { name: "Merino Beanie", sku: "APP-3145", category: "Apparel", quantity: 9, reorderLevel: 20, unitPrice: 24.0 },
];

// Only the "cucho" login is seeded, and non-destructively (see main). No
// predefined team list is inserted or recreated — every other user is managed
// directly (e.g. in the Supabase Dashboard).

// Initial projects that warehouse materials get dispatched to.
const PROJECTS = ["PAITA", "ICYP", "CALLIZO", "RIVERA"];

async function main() {
  // Fully non-destructive: every step upserts, so re-seeding never wipes live
  // inventory, projects, dispatched materials, or users.

  // Sample products, idempotent by sku. `update: {}` means an existing product
  // keeps its live quantity/price/etc. — the seed only fills in what's missing.
  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    });
  }
  console.log(`Ensured ${products.length} sample products (existing rows untouched).`);

  // Ensure ONLY the "cucho" login, via upsert (never deleteMany) so seeding
  // cannot wipe users managed elsewhere (e.g. the Supabase Dashboard). cucho's
  // password comes from SEED_PW_CUCHO so it never lands in git.
  const cuchoPassword = process.env.SEED_PW_CUCHO;
  if (!cuchoPassword) {
    throw new Error(
      "Missing SEED_PW_CUCHO — set it in .env before seeding (see .env.example).",
    );
  }
  await prisma.user.upsert({
    where: { username: "cucho" },
    update: { passwordHash: hashPassword(cuchoPassword) },
    create: { username: "cucho", passwordHash: hashPassword(cuchoPassword) },
  });
  console.log("Ensured login: cucho.");

  // Initial projects, idempotent by name. Never deletes existing projects or the
  // materials already dispatched to them.
  for (const name of PROJECTS) {
    await prisma.project.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log(`Ensured ${PROJECTS.length} projects (existing rows untouched).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
