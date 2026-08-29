import { useState, useRef, useEffect, useCallback } from "react";
import { uploadRosterImage } from "../lib/storage";

interface ImageCropperModalProps {
  imageSrc: string;
  onCropComplete: (croppedUrl: string) => void;
  onCancel: () => void;
}

export function ImageCropperModal({
  imageSrc,
  onCropComplete,
  onCancel,
}: ImageCropperModalProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [fitMode, setFitMode] = useState<"cover" | "contain">("cover");
  const [rotation, setRotation] = useState(0);
  const [processing, setProcessing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset position & scale when image changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  }, [imageSrc]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart],
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setScale((prev) => Math.min(Math.max(prev * zoomFactor, 0.5), 4));
  };

  const handleCrop = async () => {
    if (!imageRef.current) return;
    setProcessing(true);

    try {
      const img = imageRef.current;
      const targetWidth = 800;
      const targetHeight = 1000; // 4:5 aspect ratio

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("Could not create canvas context");

      // Fill background
      ctx.fillStyle = "#0c0d0e";
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Save context state for transformations
      ctx.save();
      ctx.translate(targetWidth / 2, targetHeight / 2);
      ctx.rotate((rotation * Math.PI) / 180);

      // Determine base display dimensions
      const containerRect = containerRef.current?.getBoundingClientRect();
      const containerW = containerRect?.width || 320;
      const containerH = containerRect?.height || 400;

      const scaleMultiplier = targetWidth / containerW;

      // Calculate source image draw size based on fitMode
      let drawW: number;
      let drawH: number;

      const imgAspect = img.naturalWidth / img.naturalHeight;
      const targetAspect = targetWidth / targetHeight;

      if (fitMode === "cover") {
        if (imgAspect > targetAspect) {
          drawH = targetHeight * scale;
          drawW = drawH * imgAspect;
        } else {
          drawW = targetWidth * scale;
          drawH = drawW / imgAspect;
        }
      } else {
        // contain mode
        if (imgAspect > targetAspect) {
          drawW = targetWidth * 0.9 * scale;
          drawH = drawW / imgAspect;
        } else {
          drawH = targetHeight * 0.9 * scale;
          drawW = drawH * imgAspect;
        }
      }

      const drawX = position.x * scaleMultiplier - drawW / 2;
      const drawY = position.y * scaleMultiplier - drawH / 2;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();

      // Convert canvas to Blob
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", 0.92),
      );

      if (blob) {
        const file = new File([blob], `operator-${Date.now()}.webp`, {
          type: "image/webp",
        });
        const uploadedUrl = await uploadRosterImage(file);
        onCropComplete(uploadedUrl);
      } else {
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        onCropComplete(dataUrl);
      }
    } catch (err) {
      console.error("Cropping failed:", err);
      // Fallback: pass original
      onCropComplete(imageSrc);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="flex w-full max-w-xl flex-col border border-border bg-surface shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="font-display text-base font-black tracking-tight uppercase">
              OPERATOR IMAGE FRAMING &amp; CROP
            </div>
            <div className="font-mono text-[10px] tracking-[0.1em] text-muted">
              4:5 DISPLAY ASPECT RATIO · DRAG TO REPOSITION · SCROLL TO ZOOM
            </div>
          </div>
          <button
            onClick={onCancel}
            className="font-mono text-sm text-muted transition-colors hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Interactive Cropper Viewport */}
        <div className="flex flex-col items-center justify-center bg-[#070809] p-6">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            className="relative aspect-[4/5] w-72 cursor-grab overflow-hidden border-2 border-accent/80 bg-background shadow-lg active:cursor-grabbing sm:w-80"
          >
            {/* Guide overlay grid */}
            <div className="pointer-events-none absolute inset-0 z-20 grid grid-cols-3 grid-rows-3 border border-accent/20">
              <div className="border-b border-r border-accent/15" />
              <div className="border-b border-r border-accent/15" />
              <div className="border-b border-accent/15" />
              <div className="border-b border-r border-accent/15" />
              <div className="border-b border-r border-accent/15" />
              <div className="border-b border-accent/15" />
              <div className="border-r border-accent/15" />
              <div className="border-r border-accent/15" />
              <div />
            </div>

            {/* Corner Markers */}
            <div className="pointer-events-none absolute left-2 top-2 z-20 size-3 border-l-2 border-t-2 border-accent" />
            <div className="pointer-events-none absolute right-2 top-2 z-20 size-3 border-r-2 border-t-2 border-accent" />
            <div className="pointer-events-none absolute bottom-2 left-2 z-20 size-3 border-b-2 border-l-2 border-accent" />
            <div className="pointer-events-none absolute bottom-2 right-2 z-20 size-3 border-b-2 border-r-2 border-accent" />

            {/* Target 4:5 badge */}
            <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 border border-accent/40 bg-background/80 px-2 py-0.5 font-mono text-[9px] font-bold text-accent backdrop-blur-sm">
              4:5 DISPLAY FRAME
            </div>

            {/* Image to pan and zoom */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop target"
              draggable={false}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                objectFit: fitMode,
                transition: isDragging ? "none" : "transform 0.1s ease-out",
              }}
              className="pointer-events-none size-full select-none"
            />
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="space-y-4 border-t border-border bg-surface p-5">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] tracking-[0.1em] text-muted">ZOOM:</span>
            <button
              onClick={() => setScale((s) => Math.max(s - 0.15, 0.5))}
              className="border border-border px-2 py-0.5 font-mono text-xs text-muted hover:text-foreground"
            >
              -
            </button>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="h-1 flex-1 accent-accent"
            />
            <button
              onClick={() => setScale((s) => Math.min(s + 0.15, 3))}
              className="border border-border px-2 py-0.5 font-mono text-xs text-muted hover:text-foreground"
            >
              +
            </button>
            <span className="w-12 text-right font-mono text-[10px] tabular-nums text-accent">
              {Math.round(scale * 100)}%
            </span>
          </div>

          {/* Fit Mode & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-muted mr-1">FIT:</span>
              <button
                type="button"
                onClick={() => { setFitMode("cover"); setScale(1); setPosition({ x: 0, y: 0 }); }}
                className={`border px-2.5 py-1 font-mono text-[10px] tracking-[0.1em] transition-colors ${
                  fitMode === "cover"
                    ? "border-accent bg-accent/15 font-bold text-accent"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                FILL FRAME
              </button>
              <button
                type="button"
                onClick={() => { setFitMode("contain"); setScale(1); setPosition({ x: 0, y: 0 }); }}
                className={`border px-2.5 py-1 font-mono text-[10px] tracking-[0.1em] transition-colors ${
                  fitMode === "contain"
                    ? "border-accent bg-accent/15 font-bold text-accent"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                FIT FULL IMAGE
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="border border-border px-2 py-1 font-mono text-[10px] text-muted hover:text-foreground"
                title="Rotate 90deg"
              >
                ↻ 90°
              </button>
              <button
                type="button"
                onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); setRotation(0); }}
                className="border border-border px-2 py-1 font-mono text-[10px] text-muted hover:text-foreground"
              >
                RESET
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="border border-border px-4 py-2 font-mono text-[11px] tracking-[0.1em] text-muted hover:text-foreground"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={handleCrop}
                className="bg-accent px-5 py-2 font-mono text-[11px] font-bold tracking-[0.15em] text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {processing ? "CROPPING…" : "APPLY & FIT PHOTO ✓"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
