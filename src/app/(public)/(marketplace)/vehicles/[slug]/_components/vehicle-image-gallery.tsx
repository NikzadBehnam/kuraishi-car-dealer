"use client";

import Image from "next/image";
import { Maximize2 } from "lucide-react";
import { useState } from "react";

import {
  ImagePreviewSlider,
  type PreviewImage,
} from "@/components/shared/image-preview-slider";

interface VehicleImageGalleryProps {
  images: string[];
  title: string;
}

export function VehicleImageGallery({
  images,
  title,
}: VehicleImageGalleryProps) {
  const [open, setOpen] = useState(false);
  const [initialIndex, setInitialIndex] = useState(0);
  const previewImages: PreviewImage[] = images.map((src, index) => ({
    src,
    alt: `${title} Ansicht ${index + 1}`,
  }));

  const openPreview = (index: number) => {
    setInitialIndex(index);
    setOpen(true);
  };

  return (
    <>
      <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
        <button
          type="button"
          className="group relative aspect-[16/10] overflow-hidden rounded-[var(--radius-sm)] focus-visible:outline-none"
          aria-label={`${title} Bild 1 vergrößern`}
          onClick={() => openPreview(0)}
        >
          <Image
            priority
            fill
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            src={images[0]}
            alt={`${title} Frontansicht`}
          />
          <GalleryHint />
        </button>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
          {images.slice(1, 3).map((image, index) => (
            <button
              type="button"
              className="group relative aspect-[16/10] overflow-hidden rounded-[var(--radius-sm)] focus-visible:outline-none md:aspect-auto"
              key={image}
              aria-label={`${title} Bild ${index + 2} vergrößern`}
              onClick={() => openPreview(index + 1)}
            >
              <Image
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                src={image}
                alt={`${title} Ansicht ${index + 2}`}
              />
              <GalleryHint compact />
            </button>
          ))}
        </div>
      </div>

      {open && (
        <ImagePreviewSlider
          images={previewImages}
          initialIndex={initialIndex}
          open={open}
          title={title}
          onOpenChange={setOpen}
        />
      )}
    </>
  );
}

function GalleryHint({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`absolute right-3 bottom-3 inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-white/18 bg-[#06101f]/55 font-bold text-white opacity-0 shadow-lg backdrop-blur-xl transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 ${
        compact ? "px-2.5 py-2 text-xs" : "px-3 py-2 text-sm"
      }`}
    >
      <Maximize2 className="size-4" aria-hidden="true" />
      {!compact && "Ansehen"}
    </span>
  );
}
