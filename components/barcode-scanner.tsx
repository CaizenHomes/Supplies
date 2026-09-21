"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { createClient } from "@/lib/supabase/client";

type PickerItem = { id: string; name: string; status: "in_list" | "ordered" };

type ResultState =
  | { kind: "loading" }
  | { kind: "match-ordered"; itemId: string; itemName: string }
  | { kind: "match-in-list"; itemName: string }
  | { kind: "match-no-orders"; productName: string }
  | { kind: "unknown" }
  | { kind: "picker"; productId: string; productName: string; items: PickerItem[] }
  | { kind: "error"; message: string };

type BarcodeScannerProps = {
  module: "groceries" | "supplies";
  onClose: () => void;
  // Called once the user has confirmed "yes, mark this item received" for a scanned
  // match — the scanner has already linked product_id where needed. The parent decides
  // what happens next (its own verified-by step); the scanner's job ends here.
  onConfirmed: (itemId: string, itemName: string) => void;
};

function cameraErrorMessage(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") return "Camera permission was denied.";
    if (err.name === "NotFoundError") return "No camera found on this device.";
  }
  return "Couldn't access the camera.";
}

export function BarcodeScanner({ module, onClose, onConfirmed }: BarcodeScannerProps) {
  const [scanMode, setScanMode] = useState<"camera" | "manual">("camera");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualValue, setManualValue] = useState("");
  const [capturedBarcode, setCapturedBarcode] = useState<string | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
  const [newProductName, setNewProductName] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingControlsRef = useRef<IScannerControls | null>(null);
  const detectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const capturedRef = useRef(false);

  function stopCamera() {
    if (detectIntervalRef.current) {
      clearInterval(detectIntervalRef.current);
      detectIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (zxingControlsRef.current) {
      zxingControlsRef.current.stop();
      zxingControlsRef.current = null;
    }
  }

  // Runs the camera + detection loop only while actively scanning (not once a barcode
  // has been captured and we've moved into the result flow) — the dependency on
  // `result` means capturing a code (or switching to manual entry) tears the camera down.
  useEffect(() => {
    if (scanMode !== "camera" || result !== null) return;

    let cancelled = false;

    async function start() {
      if (!videoRef.current) return;

      if (typeof window !== "undefined" && window.BarcodeDetector) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
          });
          if (cancelled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          streamRef.current = stream;
          videoRef.current!.srcObject = stream;
          await videoRef.current!.play();

          const detector = new window.BarcodeDetector!();
          detectIntervalRef.current = setInterval(async () => {
            if (!videoRef.current || capturedRef.current) return;
            try {
              const codes = await detector.detect(videoRef.current);
              if (codes.length > 0 && !capturedRef.current) {
                capturedRef.current = true;
                handleBarcodeCaptured(codes[0].rawValue);
              }
            } catch {
              // Transient decode errors between frames are expected — ignore.
            }
          }, 300);
        } catch (err) {
          if (!cancelled) setCameraError(cameraErrorMessage(err));
        }
      } else {
        // Fallback for browsers without BarcodeDetector (all of iOS) — @zxing/browser
        // manages its own camera stream and video binding internally.
        try {
          const reader = new BrowserMultiFormatReader();
          const controls = await reader.decodeFromVideoDevice(
            undefined,
            videoRef.current,
            (zxingResult, _err, ctrl) => {
              if (zxingResult && !capturedRef.current) {
                capturedRef.current = true;
                ctrl.stop();
                handleBarcodeCaptured(zxingResult.getText());
              }
            },
          );
          if (cancelled) {
            controls.stop();
            return;
          }
          zxingControlsRef.current = controls;
        } catch (err) {
          if (!cancelled) setCameraError(cameraErrorMessage(err));
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanMode, result]);

  function resetScan() {
    capturedRef.current = false;
    setCapturedBarcode(null);
    setCameraError(null);
    setResult(null);
  }

  async function handleBarcodeCaptured(barcode: string) {
    setCapturedBarcode(barcode);
    setResult({ kind: "loading" });

    const supabase = createClient();
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("barcode", barcode)
      .maybeSingle();

    if (productError) {
      setResult({ kind: "error", message: productError.message });
      return;
    }
    if (!product) {
      setResult({ kind: "unknown" });
      return;
    }

    const { data: matches, error: itemsError } = await supabase
      .from("items")
      .select("id, name, status")
      .eq("product_id", product.id)
      .eq("module", module)
      .in("status", ["in_list", "ordered"]);

    if (itemsError) {
      setResult({ kind: "error", message: itemsError.message });
      return;
    }

    const ordered = matches?.find((item) => item.status === "ordered");
    const inList = matches?.find((item) => item.status === "in_list");

    if (ordered) {
      setResult({ kind: "match-ordered", itemId: ordered.id, itemName: ordered.name });
    } else if (inList) {
      setResult({ kind: "match-in-list", itemName: inList.name });
    } else {
      setResult({ kind: "match-no-orders", productName: product.name });
    }
  }

  async function handleCreateProduct() {
    const name = newProductName.trim();
    if (!name || !capturedBarcode) return;

    setResult({ kind: "loading" });
    const supabase = createClient();

    const { data: product, error } = await supabase
      .from("products")
      .insert({ name, barcode: capturedBarcode })
      .select()
      .single();

    if (error || !product) {
      setResult({
        kind: "error",
        message: error?.code === "23505" ? "That barcode is already in use." : (error?.message ?? "Couldn't create the product."),
      });
      return;
    }

    const { data: items, error: itemsError } = await supabase
      .from("items")
      .select("id, name, status")
      .eq("module", module)
      .in("status", ["in_list", "ordered"])
      .order("requested_at", { ascending: false });

    if (itemsError) {
      setResult({ kind: "error", message: itemsError.message });
      return;
    }

    setResult({
      kind: "picker",
      productId: product.id,
      productName: product.name,
      items: (items ?? []) as PickerItem[],
    });
  }

  async function handlePickerSelect(item: PickerItem, productId: string) {
    setResult({ kind: "loading" });
    const supabase = createClient();

    // Set while status is still in_list/ordered — items_update_manager's RLS policy only
    // allows manager/executive writes for those statuses, not 'received', so this has to
    // happen before mark_received ever runs.
    const { error } = await supabase.from("items").update({ product_id: productId }).eq("id", item.id);

    if (error) {
      setResult({ kind: "error", message: error.message });
      return;
    }

    if (item.status === "ordered") {
      setResult({ kind: "match-ordered", itemId: item.id, itemName: item.name });
    } else {
      setResult({ kind: "match-in-list", itemName: item.name });
    }
  }

  function handleManualSubmit(event: React.FormEvent) {
    event.preventDefault();
    const value = manualValue.trim();
    if (!value) return;
    capturedRef.current = true;
    handleBarcodeCaptured(value);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(16,24,40,0.6)] p-3 sm:p-5"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-surface shadow-md">
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
          <h2 className="text-[17px] font-semibold text-text">Scan barcode</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-bg hover:text-text sm:h-auto sm:w-auto sm:px-2 sm:py-1"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-5 sm:px-6">
          {result === null && scanMode === "camera" && (
            <CameraStep videoRef={videoRef} error={cameraError} />
          )}

          {result === null && scanMode === "manual" && (
            <ManualEntryStep value={manualValue} onChange={setManualValue} onSubmit={handleManualSubmit} />
          )}

          {result !== null && capturedBarcode && (
            <p className="mb-3 text-xs text-text-muted">Scanned: {capturedBarcode}</p>
          )}

          {result?.kind === "loading" && (
            <p className="text-sm text-text-muted">Looking up…</p>
          )}

          {result?.kind === "match-ordered" && (
            <ResultCard>
              <p className="text-[15px] font-medium text-text">{result.itemName}</p>
              <p className="mt-1 text-sm text-text-muted">Mark this as received?</p>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={resetScan} className="rounded-md border border-border-strong bg-surface px-3.5 py-3 text-sm font-medium text-text hover:bg-bg sm:py-2">
                  Scan again
                </button>
                <button
                  type="button"
                  onClick={() => onConfirmed(result.itemId, result.itemName)}
                  className="rounded-md bg-accent px-3.5 py-3 text-sm font-medium text-white hover:bg-accent-hover sm:py-2"
                >
                  Confirm ✓
                </button>
              </div>
            </ResultCard>
          )}

          {result?.kind === "match-in-list" && (
            <ResultCard>
              <p className="text-[15px] font-medium text-text">{result.itemName}</p>
              <p className="mt-1 text-sm text-text-muted">
                This is on the order list but hasn&rsquo;t been marked ordered yet. Go to the
                Order List to mark it ordered first.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={resetScan} className="rounded-md border border-border-strong bg-surface px-3.5 py-3 text-sm font-medium text-text hover:bg-bg sm:py-2">
                  Scan again
                </button>
                <button type="button" onClick={onClose} className="rounded-md bg-accent px-3.5 py-3 text-sm font-medium text-white hover:bg-accent-hover sm:py-2">
                  Close
                </button>
              </div>
            </ResultCard>
          )}

          {result?.kind === "match-no-orders" && (
            <ResultCard>
              <p className="text-sm text-text">
                This is <span className="font-medium">{result.productName}</span> but nothing in
                the current orders.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={resetScan} className="rounded-md border border-border-strong bg-surface px-3.5 py-3 text-sm font-medium text-text hover:bg-bg sm:py-2">
                  Scan again
                </button>
                <button type="button" onClick={onClose} className="rounded-md bg-accent px-3.5 py-3 text-sm font-medium text-white hover:bg-accent-hover sm:py-2">
                  Mark manually
                </button>
              </div>
            </ResultCard>
          )}

          {result?.kind === "unknown" && (
            <ResultCard>
              <p className="text-[15px] font-medium text-text">New product</p>
              <p className="mt-1 text-sm text-text-muted">What is this?</p>
              <input
                type="text"
                autoFocus
                value={newProductName}
                onChange={(event) => setNewProductName(event.target.value)}
                placeholder="Product name"
                className="mt-3 w-full rounded-md border border-border-strong px-2.5 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={resetScan} className="rounded-md border border-border-strong bg-surface px-3.5 py-3 text-sm font-medium text-text hover:bg-bg sm:py-2">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!newProductName.trim()}
                  onClick={handleCreateProduct}
                  className="rounded-md bg-accent px-3.5 py-3 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 sm:py-2"
                >
                  Save →
                </button>
              </div>
            </ResultCard>
          )}

          {result?.kind === "picker" && (
            <ResultCard>
              <p className="text-[15px] font-medium text-text">{result.productName}</p>
              <p className="mt-1 text-sm text-text-muted">Link to which order item?</p>
              {result.items.length === 0 ? (
                <p className="mt-3 text-sm text-text-subtle">
                  Nothing on the current order list for this module.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-border rounded-md border border-border">
                  {result.items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => handlePickerSelect(item, result.productId)}
                        className="flex w-full items-center justify-between px-3.5 py-3 text-left text-sm hover:bg-accent-soft sm:py-2.5"
                      >
                        <span className="text-text">{item.name}</span>
                        <span className="text-xs text-text-muted">
                          {item.status === "ordered" ? "Ordered" : "In list"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex justify-end">
                <button type="button" onClick={onClose} className="rounded-md border border-border-strong bg-surface px-3.5 py-3 text-sm font-medium text-text hover:bg-bg sm:py-2">
                  Close
                </button>
              </div>
            </ResultCard>
          )}

          {result?.kind === "error" && (
            <ResultCard>
              <p className="text-sm text-danger">{result.message}</p>
              <div className="mt-4 flex justify-end">
                <button type="button" onClick={resetScan} className="rounded-md bg-accent px-3.5 py-3 text-sm font-medium text-white hover:bg-accent-hover sm:py-2">
                  Try again
                </button>
              </div>
            </ResultCard>
          )}

          {result === null && (
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setCameraError(null);
                  setScanMode(scanMode === "camera" ? "manual" : "camera");
                }}
                className="flex min-h-11 items-center text-sm font-medium text-accent hover:underline sm:min-h-0"
              >
                {scanMode === "camera" ? "Type barcode manually" : "Use camera instead"}
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-border bg-[#fafbfc] px-4 py-3 text-xs text-text-muted sm:px-6">
          Scanner requires camera permission. Works best on mobile.
        </div>
      </div>
    </div>
  );
}

function CameraStep({
  videoRef,
  error,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  error: string | null;
}) {
  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-black">
        <video ref={videoRef} playsInline muted autoPlay className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-2/3 w-2/3 rounded-lg border-2 border-white/70" />
        </div>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-danger">{error}</p>
      ) : (
        <p className="mt-3 text-sm text-text-muted">Point the camera at a barcode.</p>
      )}
    </div>
  );
}

function ManualEntryStep({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="manual-barcode" className="mb-1.5 block text-sm font-medium text-text">
        Barcode
      </label>
      <input
        id="manual-barcode"
        type="text"
        autoFocus
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="e.g. 096619429184"
        className="w-full rounded-md border border-border-strong px-2.5 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className="mt-3 w-full rounded-md bg-accent px-3.5 py-3 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 sm:py-2"
      >
        Look up
      </button>
    </form>
  );
}

function ResultCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-border bg-bg p-4">{children}</div>;
}
