"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { saveProduct, type SaveResult } from "@/app/products/actions";
import type { FieldErrors } from "@/lib/validation";
import type { ProductListItem } from "@/lib/types";

const CATEGORY_LIST_ID = "product-category-options";
const INITIAL_STATE: SaveResult = { ok: false };

export function ProductDrawer({
  open,
  editing,
  categories,
  formKey,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing: ProductListItem | null;
  categories: string[];
  formKey: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  return (
    <Overlay
      open={open}
      onClose={onClose}
      variant="drawer"
      labelledBy="drawer-title"
      describedBy="drawer-desc"
    >
      <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
        <div>
          <h2
            id="drawer-title"
            className="font-display text-lg font-semibold tracking-tight text-ink"
          >
            {editing ? "Edit product" : "New product"}
          </h2>
          <p id="drawer-desc" className="mt-0.5 text-sm text-ink-muted">
            {editing
              ? "Update the details for this item."
              : "Add an item to your inventory."}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="icon-btn -mr-2"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </header>

      {/* Remounts per open (formKey) so form + action state start fresh. */}
      <ProductForm
        key={formKey}
        editing={editing}
        categories={categories}
        onSaved={onSaved}
        onCancel={onClose}
      />
    </Overlay>
  );
}

function ProductForm({
  editing,
  categories,
  onSaved,
  onCancel,
}: {
  editing: ProductListItem | null;
  categories: string[];
  onSaved: (message: string) => void;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveProduct, INITIAL_STATE);
  const handled = useRef(false);

  // Controlled inputs: React 19 resets uncontrolled fields after a form action
  // completes, which would wipe the user's entries on a validation error.
  const [values, setValues] = useState(() => ({
    name: editing?.name ?? "",
    sku: editing?.sku ?? "",
    category: editing?.category ?? "",
    quantity: editing ? String(editing.quantity) : "0",
    reorderLevel: editing ? String(editing.reorderLevel) : "0",
    unitPrice: editing ? String(editing.unitPrice) : "",
  }));
  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((prev) => ({ ...prev, [key]: e.target.value }));

  useEffect(() => {
    if (state.ok && !handled.current) {
      handled.current = true;
      onSaved(state.message);
    }
  }, [state, onSaved]);

  const fieldErrors: FieldErrors = (!state.ok && state.fieldErrors) || {};
  const formError = !state.ok ? state.formError : undefined;

  // Point each input at its error (or hint) message so screen readers announce it.
  const describedBy = (field: keyof FieldErrors, hasHint = false) =>
    fieldErrors[field] ? `${field}-error` : hasHint ? `${field}-hint` : undefined;

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        {editing && <input type="hidden" name="id" value={editing.id} />}

        <Field label="Name" htmlFor="name" error={fieldErrors.name}>
          <input
            id="name"
            name="name"
            type="text"
            data-autofocus
            value={values.name}
            onChange={set("name")}
            placeholder="e.g. Mechanical Keyboard, TKL"
            maxLength={120}
            aria-invalid={!!fieldErrors.name}
            aria-describedby={describedBy("name")}
            className="input"
          />
        </Field>

        <Field
          label="SKU"
          htmlFor="sku"
          error={fieldErrors.sku}
          hint="Letters, numbers, and hyphens. Must be unique."
        >
          <input
            id="sku"
            name="sku"
            type="text"
            value={values.sku}
            onChange={set("sku")}
            placeholder="ELC-1042"
            maxLength={40}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={!!fieldErrors.sku}
            aria-describedby={describedBy("sku", true)}
            className="input font-mono uppercase"
          />
        </Field>

        <Field label="Category" htmlFor="category" error={fieldErrors.category}>
          <input
            id="category"
            name="category"
            type="text"
            list={CATEGORY_LIST_ID}
            value={values.category}
            onChange={set("category")}
            placeholder="e.g. Electronics"
            maxLength={60}
            aria-invalid={!!fieldErrors.category}
            aria-describedby={describedBy("category")}
            className="input"
          />
          <datalist id={CATEGORY_LIST_ID}>
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="In stock" htmlFor="quantity" error={fieldErrors.quantity}>
            <input
              id="quantity"
              name="quantity"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={values.quantity}
              onChange={set("quantity")}
              aria-invalid={!!fieldErrors.quantity}
              aria-describedby={describedBy("quantity")}
              className="input tnum"
            />
          </Field>
          <Field
            label="Reorder at"
            htmlFor="reorderLevel"
            error={fieldErrors.reorderLevel}
            hint="Flag as low at or below this."
          >
            <input
              id="reorderLevel"
              name="reorderLevel"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={values.reorderLevel}
              onChange={set("reorderLevel")}
              aria-invalid={!!fieldErrors.reorderLevel}
              aria-describedby={describedBy("reorderLevel", true)}
              className="input tnum"
            />
          </Field>
        </div>

        <Field label="Unit price" htmlFor="unitPrice" error={fieldErrors.unitPrice}>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint">
              $
            </span>
            <input
              id="unitPrice"
              name="unitPrice"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={values.unitPrice}
              onChange={set("unitPrice")}
              placeholder="0.00"
              aria-invalid={!!fieldErrors.unitPrice}
              aria-describedby={describedBy("unitPrice")}
              className="input tnum pl-7"
            />
          </div>
        </Field>

        {formError && (
          <p
            role="alert"
            className="rounded-md border border-out/30 bg-out-weak px-3 py-2 text-sm text-out"
          >
            {formError}
          </p>
        )}
      </div>

      <footer className="flex items-center justify-end gap-2 border-t border-line bg-surface px-6 py-4">
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Saving…" : editing ? "Save changes" : "Add product"}
        </button>
      </footer>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="field-label">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1 text-xs text-out">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="mt-1 text-xs text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
