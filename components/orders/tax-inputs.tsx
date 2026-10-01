// Optional order-level GST/PST fields (Groceries only), shared by the mark-ordered dialogs
// and the Edit tax dialog. The server re-validates with parseTaxInput; the pattern here
// just gives instant feedback for the same rule (no negatives, up to 2 decimals).
const TAX_PATTERN = "\\$?\\d+(\\.\\d{1,2})?";

function formatDefault(value: number | null | undefined): string {
  return value == null ? "" : value.toFixed(2);
}

export function TaxInputs({
  idPrefix,
  defaultGst,
  defaultPst,
}: {
  idPrefix: string;
  defaultGst?: number | null;
  defaultPst?: number | null;
}) {
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TaxField id={`${idPrefix}-gst`} name="gst" label="GST" defaultValue={formatDefault(defaultGst)} />
        <TaxField id={`${idPrefix}-pst`} name="pst" label="PST" defaultValue={formatDefault(defaultPst)} />
      </div>
      <p className="mt-1 text-xs text-text-muted">
        Optional. Enter the dollar amounts from the receipt — leave blank for $0.
      </p>
    </div>
  );
}

function TaxField({
  id,
  name,
  label,
  defaultValue,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-text">
        {label} <span className="font-normal text-text-muted">(optional)</span>
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-text-muted">
          $
        </span>
        <input
          id={id}
          name={name}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          pattern={TAX_PATTERN}
          title="A dollar amount like 4.25 — no negatives, up to 2 decimals"
          placeholder="0.00"
          defaultValue={defaultValue}
          className="w-full rounded-md border border-border-strong py-2 pl-6 pr-2.5 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </div>
    </div>
  );
}
