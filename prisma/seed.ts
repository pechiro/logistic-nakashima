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

// Five authorized team members. Usernames live in code; passwords come from the
// environment so real credentials never land in git. Set SEED_PW_<USERNAME> in
// .env (git-ignored) — see .env.example for the keys. Passwords are stored hashed.
const TEAM_USERNAMES = ["rbocanegra", "jtuller", "gsalazar", "churtado", "dianahol"];

const teamMembers = TEAM_USERNAMES.map((username) => {
  const key = `SEED_PW_${username.toUpperCase()}`;
  const password = process.env[key];
  if (!password) {
    throw new Error(
      `Missing ${key} — set team passwords in .env before seeding (see .env.example).`,
    );
  }
  return { username, password };
});

// Initial projects that warehouse materials get dispatched to.
const PROJECTS = ["PAITA", "ICYP", "CALLIZO", "RIVERA"];

async function main() {
  // Idempotent: wipe and reseed so `db:reset`/`db:seed` are repeatable.
  await prisma.product.deleteMany();
  await prisma.product.createMany({ data: products });

  const low = products.filter((p) => p.quantity <= p.reorderLevel).length;
  console.log(`Seeded ${products.length} products (${low} at or below reorder level).`);

  // Five team members. Login (src/app/login/actions.ts) looks the submitted
  // username up in this table, so any of these credentials is authorized. No
  // signup flow — edit this list to manage the team, then reseed.
  await prisma.user.deleteMany();
  await prisma.user.createMany({
    data: teamMembers.map((m) => ({
      username: m.username,
      passwordHash: hashPassword(m.password),
    })),
  });
  console.log(`Seeded ${teamMembers.length} users (${teamMembers.map((m) => m.username).join(", ")}).`);

  // Initial projects. Materials are dispatched to these (see the Proyectos module).
  await prisma.projectItem.deleteMany();
  await prisma.project.deleteMany();
  await prisma.project.createMany({ data: PROJECTS.map((name) => ({ name })) });
  console.log(`Seeded ${PROJECTS.length} projects (${PROJECTS.join(", ")}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
