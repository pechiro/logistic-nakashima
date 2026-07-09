"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ChevronDown, Sparkles, X } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { saveProduct, type SaveResult } from "@/app/products/actions";
import type { FieldErrors } from "@/lib/validation";
import type { ProductListItem } from "@/lib/types";

const CATEGORY_LIST_ID = "product-category-options";
const INITIAL_STATE: SaveResult = { ok: false };

// Fixed category options; "Otros" reveals a free-text field for anything else.
const PREDEFINED_CATEGORIES = ["Herramientas", "Material", "Consumible", "EPP"] as const;

// Unambiguous charset (no 0/O/1/I) for readable, effectively-unique SKUs.
// Collisions are astronomically unlikely, and the server rejects dupes anyway.
const SKU_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateSku(): string {
  const bytes = new Uint32Array(6);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < bytes.length; i++) code += SKU_ALPHABET[bytes[i] % SKU_ALPHABET.length];
  return `NK-${code}`;
}

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
            {editing ? "Editar producto" : "Nuevo producto"}
          </h2>
          <p id="drawer-desc" className="mt-0.5 text-sm text-ink-muted">
            {editing
              ? "Actualiza los detalles de este artículo."
              : "Añade un artículo a tu inventario."}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="icon-btn -mr-2"
          aria-label="Cerrar"
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
    description: editing?.description ?? "",
    quantity: editing ? String(editing.quantity) : "0",
    reorderLevel: editing ? String(editing.reorderLevel) : "0",
    unitPrice: editing ? String(editing.unitPrice) : "",
  }));
  const set =
    (key: keyof typeof values) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((prev) => ({ ...prev, [key]: e.target.value }));

  // Category is a fixed dropdown with an "Otros" free-text escape hatch. An
  // existing category that isn't a preset (e.g. older data) opens as "Otros"
  // with its value prefilled so editing never silently drops it.
  const initialCategory = editing?.category ?? "";
  const isPresetCategory = (PREDEFINED_CATEGORIES as readonly string[]).includes(initialCategory);
  const [categoryChoice, setCategoryChoice] = useState(
    initialCategory === "" ? "" : isPresetCategory ? initialCategory : "Otros",
  );
  const [customCategory, setCustomCategory] = useState(
    initialCategory !== "" && !isPresetCategory ? initialCategory : "",
  );
  const resolvedCategory = categoryChoice === "Otros" ? customCategory : categoryChoice;

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

        <Field label="Nombre" htmlFor="name" error={fieldErrors.name}>
          <input
            id="name"
            name="name"
            type="text"
            data-autofocus
            value={values.name}
            // Force uppercase in real time as the user types.
            onChange={(e) =>
              setValues((prev) => ({ ...prev, name: e.target.value.toUpperCase() }))
            }
            placeholder="P. EJ. TECLADO MECÁNICO, TKL"
            maxLength={120}
            autoCapitalize="characters"
            aria-invalid={!!fieldErrors.name}
            aria-describedby={describedBy("name")}
            className="input uppercase"
          />
        </Field>

        <Field
          label="SKU"
          htmlFor="sku"
          error={fieldErrors.sku}
          hint="Letras, números y guiones. Debe ser único."
        >
          <div className="relative">
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
              className="input font-mono uppercase pr-[4.75rem]"
            />
            <button
              type="button"
              onClick={() => setValues((prev) => ({ ...prev, sku: generateSku() }))}
              className="absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent-weak"
              title="Generar un SKU aleatorio"
            >
              <Sparkles size={13} strokeWidth={2} />
              Auto
            </button>
          </div>
        </Field>

        <Field label="Categoría" htmlFor="category" error={fieldErrors.category}>
          {/* One hidden field carries the final value: the selected preset, or
              the free-text entry when "Otros" is chosen. Keeps the server's
              single `category` field unchanged. */}
          <input type="hidden" name="category" value={resolvedCategory} />
          <div className="relative">
            <select
              id="category"
              value={categoryChoice}
              onChange={(e) => setCategoryChoice(e.target.value)}
              aria-invalid={!!fieldErrors.category}
              aria-describedby={describedBy("category")}
              className="input w-full appearance-none pr-9"
            >
              <option value="" disabled>
                Selecciona una categoría…
              </option>
              {PREDEFINED_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
              <option value="Otros">Otros</option>
            </select>
            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint"
            />
          </div>

          {categoryChoice === "Otros" && (
            <>
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                list={CATEGORY_LIST_ID}
                placeholder="Escribe el nombre de la categoría"
                maxLength={60}
                autoFocus
                aria-label="Nombre de categoría personalizada"
                aria-invalid={!!fieldErrors.category}
                aria-describedby={describedBy("category")}
                className="input mt-2"
              />
              <datalist id={CATEGORY_LIST_ID}>
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="En stock" htmlFor="quantity" error={fieldErrors.quantity}>
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
            label="Reordenar en"
            htmlFor="reorderLevel"
            error={fieldErrors.reorderLevel}
            hint="Marcar como bajo en este valor o por debajo."
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

        <Field label="Precio unitario" htmlFor="unitPrice" error={fieldErrors.unitPrice}>
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

        <Field
          label="Descripción / Notas"
          htmlFor="description"
          optional
          error={fieldErrors.description}
        >
          <textarea
            id="description"
            name="description"
            value={values.description}
            onChange={set("description")}
            rows={3}
            maxLength={500}
            placeholder="Detalles adicionales: ubicación, proveedor, estado…"
            aria-invalid={!!fieldErrors.description}
            aria-describedby={describedBy("description")}
            className="textarea"
          />
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
          Cancelar
        </button>
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Guardando…" : editing ? "Guardar cambios" : "Añadir producto"}
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
  optional,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="field-label flex items-center justify-between gap-2">
        <span>{label}</span>
        {optional && (
          <span className="text-[11px] font-normal text-ink-faint">Opcional</span>
        )}
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
