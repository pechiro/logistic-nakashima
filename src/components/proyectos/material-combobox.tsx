"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, PackageSearch, Search, X } from "lucide-react";
import type { MaterialOption } from "@/lib/types";
import { formatInt } from "@/lib/format";

/** The warehouse holds hundreds of products; only render a workable slice. */
const MAX_RESULTS = 50;

/**
 * The characters a keystroke actually added, given what the field showed before.
 *
 * While the panel is closed the input displays the picked material's *name*, so
 * the browser merges the keystroke into that name and `onChange` reports the
 * whole concatenation. Diffing off the common prefix and suffix recovers just
 * what was typed, so the first character after a pick starts a fresh search
 * instead of searching for `"<product name>x"` and finding nothing.
 */
function insertedText(previous: string, next: string): string {
  let start = 0;
  while (start < previous.length && previous[start] === next[start]) start++;

  let end = 0;
  const maxEnd = Math.min(previous.length, next.length) - start;
  while (
    end < maxEnd &&
    previous[previous.length - 1 - end] === next[next.length - 1 - end]
  ) {
    end++;
  }
  return next.slice(start, next.length - end);
}

/**
 * Searchable material picker. Replaces a native <select> whose options read
 * `name (sku) — n en stock` — unusable once the catalogue passed a few hundred
 * rows, and the widest element on the page. Same visual language as the search
 * field on the Productos page: leading magnifier, `.input` shell, results in a
 * plain surface panel.
 *
 * Out-of-stock materials stay listed (so you can see they exist) but are not
 * selectable, and keyboard navigation skips over them.
 */
export function MaterialCombobox({
  id,
  products,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  products: MaterialOption[];
  value: string | null;
  onChange: (productId: string | null) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const optionId = (index: number) => `${listId}-opt-${index}`;

  const selected = useMemo(
    () => products.find((p) => p.id === value) ?? null,
    [products, value],
  );

  const { results, truncated } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? products.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(q))
      : products;
    return {
      results: matched.slice(0, MAX_RESULTS),
      truncated: Math.max(matched.length - MAX_RESULTS, 0),
    };
  }, [products, query]);

  const firstSelectable = useMemo(
    () => results.findIndex((p) => p.quantity > 0),
    [results],
  );

  // Re-point the highlight whenever the result set changes. Adjusting state
  // during render (rather than in an effect) avoids a cascading re-render — the
  // same pattern Overlay and ProductsView use.
  const [prevResults, setPrevResults] = useState(results);
  if (results !== prevResults) {
    setPrevResults(results);
    setActive(firstSelectable);
  }

  /** Always drop the query on close, so reopening never shows a stale search. */
  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  /** Open with the first selectable row highlighted, so Enter works right away. */
  function openPanel() {
    setOpen(true);
    setActive(firstSelectable);
  }

  // Close when a click lands outside the widget.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close();
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, close]);

  // Keep the highlighted row inside the scroll box. Indexing the rendered
  // options avoids escaping useId's punctuation into a CSS selector.
  useEffect(() => {
    if (!open || active < 0) return;
    const options = listRef.current?.querySelectorAll('[role="option"]');
    options?.[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function select(product: MaterialOption) {
    if (product.quantity <= 0) return;
    onChange(product.id);
    close();
    inputRef.current?.focus();
  }

  function clear() {
    onChange(null);
    close();
    inputRef.current?.focus();
  }

  /** Step the highlight, wrapping around and skipping out-of-stock rows. */
  function move(direction: 1 | -1) {
    const selectable = results.flatMap((p, i) => (p.quantity > 0 ? [i] : []));
    if (selectable.length === 0) return;
    const at = selectable.indexOf(active);
    setActive(
      at === -1
        ? selectable[direction === 1 ? 0 : selectable.length - 1]
        : selectable[(at + direction + selectable.length) % selectable.length],
    );
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (open) move(1);
        else openPanel();
        break;
      case "ArrowUp":
        event.preventDefault();
        if (open) move(-1);
        break;
      case "Enter":
        // Swallow the key so picking a material can't submit the Asignar form.
        if (open && active >= 0 && results[active]) {
          event.preventDefault();
          select(results[active]);
        }
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          close();
        }
        break;
      case "Tab":
        close();
        break;
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <Search
        size={15}
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-ink-faint"
      />
      <input
        id={id}
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        // Closed, the field reads back what you picked; open, it is a search box.
        value={open ? query : (selected?.name ?? "")}
        placeholder={selected ? selected.name : "Buscar material por nombre o SKU"}
        onFocus={openPanel}
        // Only on a click that opens it — clicking to move the caret inside an
        // already-open field shouldn't yank the highlight back to the top.
        onClick={() => {
          if (!open) openPanel();
        }}
        onChange={(e) => {
          // Closed, the field is showing `selected.name` and the browser has
          // merged the keystroke into it — search on what was typed, not on the
          // concatenation. See insertedText above.
          const next = e.target.value;
          setQuery(open ? next : insertedText(selected?.name ?? "", next));
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className={`input pl-9 ${selected && !open ? "pr-10" : "pr-3"}`}
      />

      {selected && !open && !disabled && (
        <button
          type="button"
          onClick={clear}
          aria-label={`Quitar ${selected.name}`}
          title="Quitar material"
          className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-r-md text-ink-faint transition-colors hover:text-ink"
        >
          <X size={15} />
        </button>
      )}

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Materiales del almacén"
          className="absolute z-30 mt-1.5 max-h-64 w-full overflow-y-auto overscroll-contain rounded-md border border-line-strong bg-surface py-1 shadow-lg"
        >
          {results.length === 0 && (
            <li
              role="presentation"
              className="flex items-center gap-2.5 px-3 py-3 text-sm text-ink-muted"
            >
              <PackageSearch size={16} className="shrink-0 text-ink-faint" />
              <span className="min-w-0 truncate">
                Ningún material coincide con «{query.trim()}».
              </span>
            </li>
          )}

          {results.map((product, index) => {
            const outOfStock = product.quantity <= 0;
            return (
              <li
                key={product.id}
                id={optionId(index)}
                role="option"
                aria-selected={product.id === value}
                aria-disabled={outOfStock || undefined}
                // preventDefault keeps focus in the input, so the panel doesn't
                // close from a blur before the click lands.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(product)}
                onMouseEnter={() => !outOfStock && setActive(index)}
                className={`flex items-center gap-2.5 px-3 py-2 text-sm ${
                  index === active ? "bg-accent-weak" : ""
                } ${outOfStock ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                <Check
                  size={14}
                  aria-hidden
                  className={`shrink-0 text-accent ${product.id === value ? "" : "invisible"}`}
                />
                <span
                  className={`min-w-0 flex-1 truncate ${
                    outOfStock ? "text-ink-faint" : "text-ink"
                  }`}
                >
                  {product.name}
                </span>
                <span className="shrink-0 font-mono text-[11.5px] text-ink-faint">
                  {product.sku}
                </span>
                <span
                  className={`shrink-0 text-xs tabular-nums ${
                    outOfStock ? "font-medium text-out" : "text-ink-muted"
                  }`}
                >
                  {outOfStock ? "Sin stock" : formatInt(product.quantity)}
                </span>
              </li>
            );
          })}

          {truncated > 0 && (
            <li
              role="presentation"
              className="border-t border-line px-3 py-2 text-xs text-ink-faint"
            >
              y {formatInt(truncated)} más — afina la búsqueda.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
