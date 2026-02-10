"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ScanBarcode, X, Loader2 } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (isbn: string) => void;
  disabled?: boolean;
}

export function BarcodeScanner({ onScan, disabled }: BarcodeScannerProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const scannerRef = useRef<unknown>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const scanner = scannerRef.current as { stop: () => Promise<void> };
        await scanner.stop();
      } catch {
        // Scanner may already be stopped
      }
      scannerRef.current = null;
    }
  }, []);

  const handleClose = useCallback(async () => {
    await stopScanner();
    setOpen(false);
    setError(null);
    setStarting(false);
  }, [stopScanner]);

  const handleScan = useCallback(
    async (isbn: string) => {
      await stopScanner();
      setOpen(false);
      setError(null);
      setStarting(false);
      onScan(isbn);
    },
    [onScan, stopScanner]
  );

  useEffect(() => {
    if (!open || !containerRef.current) return;

    let cancelled = false;
    setStarting(true);
    setError(null);

    async function startScanner() {
      const { Html5Qrcode } = await import("html5-qrcode");

      if (cancelled) return;

      const scannerId = "barcode-scanner-region";
      const container = containerRef.current;
      if (!container) return;

      // Ensure the container has the target div
      container.innerHTML = "";
      const scanDiv = document.createElement("div");
      scanDiv.id = scannerId;
      container.appendChild(scanDiv);

      const scanner = new Html5Qrcode(scannerId);
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 280, height: 150 },
            aspectRatio: 1.5,
          },
          (decodedText: string) => {
            // ISBN barcodes are EAN-13 (13 digits) or EAN-10 (10 digits)
            const cleaned = decodedText.replace(/[^0-9X]/gi, "");
            if (cleaned.length === 13 || cleaned.length === 10) {
              if (!cancelled) {
                handleScan(cleaned);
              }
            }
          },
          () => {
            // Scan failure — expected on each frame without a barcode
          }
        );

        if (!cancelled) {
          setStarting(false);
        }
      } catch {
        if (!cancelled) {
          setError(
            "Could not access camera. Please allow camera access and try again."
          );
          setStarting(false);
        }
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [open, handleScan, stopScanner]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="flex h-12 items-center justify-center gap-2 rounded-lg border border-parchment-200 bg-white px-3 text-sm font-medium text-ink-600 transition-colors hover:border-parchment-400 hover:bg-parchment-50 active:scale-[0.98] disabled:opacity-50"
        title="Scan ISBN barcode"
        aria-label="Scan ISBN barcode"
      >
        <ScanBarcode className="h-5 w-5" />
        <span>Scan ISBN</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 sm:items-center sm:justify-center">
          <div className="relative w-full rounded-t-2xl bg-white p-4 sm:mx-4 sm:max-w-md sm:rounded-xl sm:rounded-t-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-ink-900">
                Scan ISBN Barcode
              </h2>
              <button
                onClick={handleClose}
                className="rounded-md p-2 text-ink-400 transition-colors hover:bg-parchment-100 hover:text-ink-600"
                aria-label="Close scanner"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-3 text-sm text-ink-500">
              Point your camera at the barcode on the back of a book.
            </p>

            <div
              ref={containerRef}
              className="relative overflow-hidden rounded-lg bg-black"
              style={{ minHeight: 280 }}
            >
              {starting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-sm">Starting camera…</span>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-3 rounded-lg border border-verdict-warning/30 bg-red-50 p-3 text-sm text-verdict-warning">
                {error}
              </div>
            )}

            <button
              onClick={handleClose}
              className="mt-3 w-full rounded-lg border border-parchment-200 py-3 text-sm font-medium text-ink-600 transition-colors hover:bg-parchment-50 sm:hidden"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
