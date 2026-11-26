"use client";

import { useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Minus, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export type CropPreset = {
  /** Width ÷ height of the crop frame. */
  aspect: number;
  /** Size of the image we save. */
  outputWidth: number;
  outputHeight: number;
  /** Circle mask for profile photos. */
  round?: boolean;
  title: string;
};

/** Profile photo: square (shown as a circle), like X/Instagram. */
export const AVATAR_CROP: CropPreset = {
  aspect: 1,
  outputWidth: 400,
  outputHeight: 400,
  round: true,
  title: "Crop profile photo",
};

/** Banner: 3:1, the shape it's shown in on profiles (X uses 1500×500). */
export const BANNER_CROP: CropPreset = {
  aspect: 3,
  outputWidth: 1500,
  outputHeight: 500,
  title: "Crop banner",
};

/** Draws the chosen area into a canvas at the output size and saves it as WebP. */
async function cropToFile(
  src: string,
  area: Area,
  preset: CropPreset,
): Promise<File> {
  const image = new Image();
  image.src = src;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = preset.outputWidth;
  canvas.height = preset.outputHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.9),
  );
  if (!blob) throw new Error("Couldn't crop the image.");
  return new File([blob], `${preset.round ? "avatar" : "banner"}.webp`, {
    type: "image/webp",
  });
}

/**
 * Crop screen: drag to position, zoom with the slider / wheel / pinch, then
 * Apply. Returns the cropped image as a file ready to upload.
 */
export function ImageCropper({
  src,
  preset,
  onApply,
  onCancel,
}: {
  /** Object URL of the picked image; null when closed. */
  src: string | null;
  preset: CropPreset;
  onApply: (file: File) => void;
  onCancel: () => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function apply() {
    if (!src || !area) return;
    setBusy(true);
    try {
      onApply(await cropToFile(src, area, preset));
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const step = (delta: number) =>
    setZoom((z) => Math.min(3, Math.max(1, +(z + delta).toFixed(2))));

  return (
    <Dialog
      open={Boolean(src)}
      onOpenChange={(open) => !open && !busy && onCancel()}
    >
      <DialogContent
        showCloseButton={false}
        className="flex flex-col gap-0 overflow-hidden p-0 max-sm:inset-0 max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none sm:max-w-[600px] sm:rounded-2xl"
      >
        <header className="flex h-[53px] shrink-0 items-center gap-4 px-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="-ml-2 rounded-full px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
          <DialogTitle className="flex-1 font-heading text-lg font-bold tracking-tight">
            {preset.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Drag to position the image and use the slider to zoom.
          </DialogDescription>
          <button
            type="button"
            onClick={() => void apply()}
            disabled={busy || !area}
            className="pressable h-8 rounded-full bg-foreground px-4 text-sm font-bold text-background hover:bg-foreground/85 disabled:opacity-50"
          >
            {busy ? "Applying…" : "Apply"}
          </button>
        </header>

        <div className="relative h-[min(60dvh,420px)] w-full bg-black max-sm:flex-1">
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              minZoom={1}
              maxZoom={3}
              aspect={preset.aspect}
              cropShape={preset.round ? "round" : "rect"}
              showGrid={!preset.round}
              objectFit={preset.aspect > 1 ? "horizontal-cover" : "cover"}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setArea(pixels)}
            />
          )}
        </div>

        <div className="flex items-center gap-3 px-6 py-4">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => step(-0.1)}
            className="rounded-full p-1.5 hover:bg-muted"
          >
            <Minus className="size-4" />
          </button>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="flex-1 accent-primary"
          />
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => step(0.1)}
            className="rounded-full p-1.5 hover:bg-muted"
          >
            <Plus className="size-4" />
          </button>
        </div>
        {error && (
          <p role="alert" className="px-6 pb-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
