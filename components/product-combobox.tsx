"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/types";

export type Product = Tables<"products">;

type ProductComboboxProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onProductSelect: (product: Product) => void;
  placeholder?: string;
  // Not used directly here — the actual lookup-or-create gating happens server-side in
  // resolve_product_id(). This just lets the parent form pass the caller's role through
  // for any future create-flow UI (e.g. a "this will add a new product" hint).
  canCreateProducts: boolean;
};

const DEBOUNCE_MS = 250;
const MAX_RESULTS = 8;
const MIN_QUERY_LENGTH = 2;

export function ProductCombobox({
  id,
  value,
  onChange,
  onProductSelect,
  placeholder,
}: ProductComboboxProps) {
  const [results, setResults] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);
  const listboxId = useId();

  useEffect(() => {
    const term = value.trim();
    if (term.length < MIN_QUERY_LENGTH) {
      // Don't setState synchronously in the effect body — the render below already
      // gates dropdown visibility on the same length threshold, so stale results/isOpen
      // from a prior search are harmless left as-is until a new search overwrites them.
      return;
    }

    const thisRequestId = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .ilike("name", `%${term}%`)
        .order("name")
        .limit(MAX_RESULTS);

      // A slower, older request can resolve after a newer one — ignore it so stale
      // results don't flash in over what the user is now typing.
      if (thisRequestId !== requestIdRef.current) return;

      if (!error && data) {
        setResults(data);
        setIsOpen(data.length > 0);
        setHighlightedIndex(-1);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectProduct(product: Product) {
    onChange(product.name);
    onProductSelect(product);
    setIsOpen(false);
    setResults([]);
    setHighlightedIndex(-1);
  }

  function handleClear() {
    onChange("");
    setIsOpen(false);
    setResults([]);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
    } else if (event.key === "Enter") {
      if (highlightedIndex >= 0) {
        event.preventDefault();
        selectProduct(results[highlightedIndex]);
      }
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  const showDropdown = isOpen && results.length > 0 && value.trim().length >= MIN_QUERY_LENGTH;

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => results.length > 0 && setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-controls={listboxId}
        className="w-full rounded-md border border-border-strong px-2.5 py-2 pr-8 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
      />

      {value.length > 0 && (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleClear}
          aria-label="Clear"
          className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-text-subtle hover:bg-bg hover:text-text"
        >
          ×
        </button>
      )}

      {showDropdown && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-[24rem] w-full divide-y divide-border overflow-x-hidden overflow-y-auto rounded-md border border-border bg-surface shadow-md"
        >
          {results.map((product, index) => (
            <li key={product.id} role="option" aria-selected={index === highlightedIndex}>
              <button
                type="button"
                // Prevents the input from blurring (and the dropdown from closing)
                // before the click's onClick handler gets to run.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectProduct(product)}
                className={`block w-full cursor-pointer px-3.5 py-2.5 text-left hover:bg-accent-soft ${
                  index === highlightedIndex ? "bg-accent-soft" : ""
                }`}
              >
                <div className="text-[15px] font-normal leading-snug text-text">{product.name}</div>
                {(product.default_vendor || product.default_unit_price != null) && (
                  <div className="mt-0.5 text-[13px] leading-snug text-text-muted">
                    {[
                      product.default_vendor,
                      product.default_unit_price != null
                        ? `$${product.default_unit_price.toFixed(2)}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
