"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, X, Loader2 } from "lucide-react";

interface CoverScannerProps {
  onCapture: (imageBase64: string) => void;
  disabled?: boolean;
}

export function CoverScanner({ onCapture, disabled }: CoverScannerProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    setOpen(false);
    setError(null);
    setStarting(false);
  }, [stopCamera]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    // Convert to base64 JPEG (strip the data URL prefix)
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    const base64 = dataUrl.split(",")[1];

    stopCamera();
    setOpen(false);
    setError(null);
    setStarting(false);

    if (base64) {
      onCapture(base64);
    }
  }, [onCapture, stopCamera]);

  const handleOpen = useCallback(async () => {
    setOpen(true);
    setStarting(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;

      // Wait for the video element to be available (modal just opened)
      const waitForVideo = () => {
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.onloadedmetadata = () => {
            setStarting(false);
          };
        } else {
          // Video element not yet mounted — retry on next frame
          requestAnimationFrame(waitForVideo);
        }
      };
      requestAnimationFrame(waitForVideo);
    } catch {
      setError(
        "Could not access camera. Please allow camera access and try again."
      );
      setStarting(false);
    }
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className="flex h-12 items-center justify-center gap-2 rounded-lg border border-parchment-200 bg-white px-3 text-sm font-medium text-ink-600 transition-colors hover:border-parchment-400 hover:bg-parchment-50 active:scale-[0.98] disabled:opacity-50"
        title="Identify book from cover photo"
        aria-label="Identify book from cover photo"
      >
        <Camera className="h-5 w-5" />
        <span>Book Photo</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 sm:items-center sm:justify-center">
          <div className="relative w-full rounded-t-2xl bg-white p-4 sm:mx-4 sm:max-w-md sm:rounded-xl sm:rounded-t-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-ink-900">
                Photo Book Cover
              </h2>
              <button
                onClick={handleClose}
                className="rounded-md p-2 text-ink-400 transition-colors hover:bg-parchment-100 hover:text-ink-600"
                aria-label="Close camera"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-3 text-sm text-ink-500">
              Take a photo of the front cover. We&apos;ll identify the book
              using AI.
            </p>

            <div
              className="relative overflow-hidden rounded-lg bg-black"
              style={{ minHeight: 320 }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
                style={{ minHeight: 320 }}
              />
              {starting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-sm">Starting camera…</span>
                </div>
              )}
            </div>

            {!starting && !error && (
              <button
                onClick={handleCapture}
                className="mt-3 w-full rounded-lg bg-ink-900 py-3 text-sm font-medium text-white transition-colors hover:bg-ink-800"
              >
                Take Photo
              </button>
            )}

            {error && (
              <div className="mt-3 rounded-lg border border-verdict-warning/30 bg-red-50 p-3 text-sm text-verdict-warning">
                {error}
              </div>
            )}

            {!starting && !error && (
              <button
                onClick={handleClose}
                className="mt-2 w-full rounded-lg border border-parchment-200 py-3 text-sm font-medium text-ink-600 transition-colors hover:bg-parchment-50 sm:hidden"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
