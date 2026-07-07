"use client";

import { useCallback, useMemo, useState } from "react";
import { PackagePlus, PackageSearch, Plus, Search } from "lucide-react";
import type { ProductListItem } from "@/lib/types";
import { isLowStock } from "@/lib/format";
import { ProductTable } from "./product-table";
import { ProductDrawer } from "./product-drawer";
import { DeleteDialog } from "./delete-dialog";
import { Toast } from "@/components/toast";

export function ProductsView({
  products,
  categories,
}: {
  products: ProductListItem[];
  categories: string[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [lowOnly, setLowOnly] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ProductListItem | null>(null);
  const [formNonce, setFormNonce] = useState(0);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductListItem | null>(null);

  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  const lowCount = useMemo(
    () => products.filter((p) => isLowStock(p.quantity, p.reorderLevel)).length,
    [products],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (lowOnly && !isLowStock(p.quantity, p.reorderLevel)) return false;
      if (q && !`${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [products, query, category, lowOnly]);

  const showToast = useCallback(
    (message: string) => setToast({ id: Date.now(), message }),
    [],
  );
  const dismissToast = useCallback(() => setToast(null), []);

  const openCreate = useCallback(() => {
    setEditing(null);
    setFormNonce((n) => n + 1);
    setDrawerOpen(true);
  }, []);
  const openEdit = useCallback((product: ProductListItem) => {
    setEditing(product);
    setFormNonce((n) => n + 1);
    setDrawerOpen(true);
  }, []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const onSaved = useCallback(
    (message: string) => {
      setDrawerOpen(false);
      showToast(message);
    },
    [showToast],
  );

  const askDelete = useCallback((product: ProductListItem) => {
    setDeleteTarget(product);
    setDeleteOpen(true);
  }, []);
  const closeDelete = useCallback(() => setDeleteOpen(false), []);
  const onDeleted = useCallback(
    (message: string) => {
      setDeleteOpen(false);
      showToast(message);
    },
    [showToast],
  );

  const clearFilters = useCallback(() => {
    setQuery("");
    setCategory("all");
    setLowOnly(false);
  }, []);

  const hasProducts = products.length > 0;
  const formKey = `${editing?.id ?? "new"}-${formNonce}`;

  return (
    <>
      {/* top-14 clears the mobile top bar; resets to 0 once the sidebar shows. */}
      <header className="sticky top-14 z-20 border-b border-line bg-canvas/80 backdrop-blur-md lg:top-0">
        <div className="flex items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
              Inventory
            </p>
            <h1 className="mt-0.5 font-display text-2xl font-semibold tracking-tight text-ink">
              Products
            </h1>
          </div>
          <button type="button" onClick={openCreate} className="btn btn-primary">
            <Plus size={16} strokeWidth={2.4} />
            <span className="hidden sm:inline">New product</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </header>

      <div className="px-5 py-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5 text-sm text-ink-muted">
            <span>
              <strong className="font-display text-ink tabular-nums">
                {products.length}
              </strong>{" "}
              {products.length === 1 ? "product" : "products"}
            </span>
            {lowCount > 0 && (
              <>
                <span className="text-line-strong" aria-hidden>
                  ·
                </span>
                <button
                  type="button"
                  onClick={() => setLowOnly((v) => !v)}
                  aria-pressed={lowOnly}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    lowOnly
                      ? "border-low-bar/40 bg-low-weak text-low"
                      : "border-line bg-surface text-ink-muted hover:bg-surface-2"
                  }`}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-low-bar"
                    aria-hidden
                  />
                  {lowCount} low
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-none">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products"
                aria-label="Search products"
                className="input h-9 w-full pl-8 sm:w-56"
              />
            </div>
            <label htmlFor="category-filter" className="sr-only">
              Filter by category
            </label>
            <select
              id="category-filter"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input h-9 w-auto"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!hasProducts ? (
          <EmptyState
            icon={<PackagePlus size={22} />}
            title="No products yet"
            body="Add your first item to start tracking stock levels."
            action={
              <button
                type="button"
                onClick={openCreate}
                className="btn btn-primary"
              >
                <Plus size={16} strokeWidth={2.4} />
                New product
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<PackageSearch size={22} />}
            title="No products match"
            body="Try a different search, or clear the filters to see everything."
            action={
              <button
                type="button"
                onClick={clearFilters}
                className="btn btn-secondary"
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <ProductTable
            products={filtered}
            onEdit={openEdit}
            onDelete={askDelete}
          />
        )}
      </div>

      <ProductDrawer
        open={drawerOpen}
        editing={editing}
        categories={categories}
        formKey={formKey}
        onClose={closeDrawer}
        onSaved={onSaved}
      />
      <DeleteDialog
        open={deleteOpen}
        product={deleteTarget}
        onClose={closeDelete}
        onDeleted={onDeleted}
      />
      {toast && (
        <Toast key={toast.id} message={toast.message} onDismiss={dismissToast} />
      )}
    </>
  );
}

function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-ink-muted">
        {icon}
      </span>
      <h2 className="mt-4 font-display text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">{body}</p>
      <div className="mt-5">{action}</div>
    </div>
  );
}
