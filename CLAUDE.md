@AGENTS.md

# Stockroom — Inventory Management

A SaaS-style inventory tool. Next.js 16 (App Router, React 19, Turbopack), TypeScript,
Tailwind CSS v4, Prisma 6 + SQLite. Package manager: **bun**.

## Commands

```bash
bun run dev         # dev server (http://localhost:3000)
bun run build       # production build (typecheck + compile; Next 16 does NOT run eslint here)
bun run start       # serve the production build
bun run lint        # eslint — currently broken in this env (see gotchas)

bun run db:generate # regenerate the Prisma client
bun run db:migrate  # create/apply a migration (dev)
bun run db:seed     # reseed the 12 sample products (wipes + reinserts)
bun run db:reset    # drop, re-migrate, and reseed
bun run db:studio   # Prisma Studio
```

## Environment gotchas (Windows + OneDrive)

This project lives under a **OneDrive-synced** folder, which locks/cloud-places
files and breaks in-place directory recreation. Two recurring symptoms and fixes:

- `prisma generate` / `db:migrate` → `EEXIST: mkdir` on the client dir. Fix:
  `rm -rf src/generated node_modules/.prisma` then rerun.
- `next build` → `EEXIST: mkdir '.next'`. Fix: `rm -rf .next` then rebuild.

Because of this, there is intentionally **no `postinstall: prisma generate`** (it would
fail on every `bun add`). Run `bun run db:generate` manually after schema changes.

**node_modules corruption (the big one).** OneDrive dehydrates hard-linked files, so bun's
default install leaves packages hollow (empty dirs / missing files inside packages), which
breaks the app *and* eslint. Mitigation in place: `bunfig.toml` pins `backend = "copyfile"`.
If a build fails with `Module not found` for internal files of a large package (e.g. `next`),
or a package is present-but-empty, restore it from bun's cache (which is not on OneDrive):
`cp -r ~/.bun/install/cache/<pkg>@<ver>@@@1 node_modules/<pkg>`.

**`bun run lint` is currently broken here** — bun fails to install eslint's transitive deps
(`ms`, `debug`, `define-properties`) and mis-resolves eslint plugins at runtime. This is
environment-only; `bun run build` still fully typechecks the code, and lint works on a checkout
that is not under OneDrive.

The durable fix for all of the above is to move the project off OneDrive (or exclude
`node_modules` / `.next` from OneDrive sync).

## Architecture

- **Data model** — `prisma/schema.prisma`: `Product` (id, name, sku unique, category, quantity,
  unitPrice, reorderLevel, timestamps) and `StockMovement` (product w/ `onDelete: Cascade`, type
  `"IN"`/`"OUT"`, amount, resultingQuantity, createdAt). SQLite file at `prisma/dev.db`.
  `unitPrice` is a `Float` for now (revisit as integer cents when valuation/reporting lands).
- **Stock changes** — `src/app/stock/actions.ts` `adjustStock()` runs a `$transaction` that
  updates `Product.quantity` and writes a `StockMovement` together, refuses to drop below 0, and
  revalidates `/stock`, `/movements`, and `/products` so the low-stock badge updates everywhere.
  The Movements page (`src/app/movements/page.tsx`) is a read-only server-rendered log.
- **Prisma client** is generated to **`src/generated/prisma`** (not `node_modules`) and imported
  via the `@/generated/prisma` alias. This is deliberate: Turbopack fails to resolve the
  externalized `@prisma/client` package in dev, especially with a space in the folder path.
  Access it through the singleton in `src/lib/prisma.ts` — never `new PrismaClient()` elsewhere.
- **Data flow** — `src/app/products/page.tsx` is a server component that reads products and
  passes plain objects (`ProductListItem`, see `src/lib/types.ts`) to the client
  `ProductsView`. Mutations are **server actions** in `src/app/products/actions.ts`
  (zod-validated via `src/lib/validation.ts`), which call `revalidatePath('/products')`.
- **Low stock** — the single source of truth is `src/lib/format.ts`: `stockStatus()` returns
  `out` (qty 0) / `low` (qty ≤ reorderLevel) / `healthy`. `isLowStock()` is the inclusive
  ≤ test used for the count, filter, and row highlight.
- **UI** — `src/components/ui/overlay.tsx` is the shared accessible modal (drawer + centered
  dialog): focus trap, Escape, scroll lock, focus restore, reduced-motion. The product create/edit
  form (`product-drawer.tsx`) uses **controlled inputs** on purpose — React 19 resets uncontrolled
  fields after a form action, which would wipe entries on a validation error.

## Design system

One cohesive aesthetic, defined as tokens in `src/app/globals.css` (`@theme`): cool near-white
canvas, one royal-indigo accent, functional stock-status colors (emerald/amber/red). Fonts:
**Space Grotesk** (display), **Inter** (UI/body), **JetBrains Mono** (SKUs), via `next/font`.
The signature element is the **stock gauge** (`stock-gauge.tsx`) — a bar showing quantity vs. its
reorder threshold. Keep numbers `tabular-nums`. Prefer the `.btn`/`.input`/`.icon-btn` component
classes and the token colors (`bg-accent`, `text-ink`, `border-line`, …) over ad-hoc values.

## Scope

Built: SaaS shell + Products CRUD + low-stock signal + seed; the **Stock** page (In/Out
adjustments) and the **Movements** log. **Deliberately not built yet** (disabled "Soon" items in
the sidebar): a dashboard/analytics and auth/teams. Add these one at a time.
