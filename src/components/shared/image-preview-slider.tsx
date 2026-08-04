"use client";

import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { Images, Maximize2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PreviewImage {
  src: string;
  alt: string;
}

interface ImagePreviewSliderProps {
  images: PreviewImage[];
  initialIndex?: number;
  open: boolean;
  title: string;
  onOpenChange: (open: boolean) => void;
}

export function ImagePreviewSlider({
  images,
  initialIndex = 0,
  open,
  title,
  onOpenChange,
}: ImagePreviewSliderProps) {
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.min(Math.max(initialIndex, 0), images.length - 1),
  );
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        setActiveIndex((index) => Math.max(index - 1, 0));
      }
      if (event.key === "ArrowRight") {
        setActiveIndex((index) => Math.min(index + 1, images.length - 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [images.length, open]);

  if (!images.length) return null;

  const activeImage = images[activeIndex];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-[#06101f]/70 backdrop-blur-xl data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-0 z-[90] flex flex-col p-3 outline-none sm:p-5">
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <Dialog.Description className="sr-only">
            Fahrzeugbilder in großer Ansicht mit Vorschaubildern auswählen.
          </Dialog.Description>

          <div className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-white/12 bg-white/10 px-3 py-2 text-white shadow-2xl backdrop-blur-2xl">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-white/10">
                <Images className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold">{title}</p>
                <p className="text-xs text-white/70">
                  Bild {activeIndex + 1} von {images.length}
                </p>
              </div>
            </div>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
                aria-label="Bildvorschau schließen"
              >
                <X />
              </Button>
            </Dialog.Close>
          </div>

          <div
            className="relative my-3 min-h-0 flex-1 overflow-hidden rounded-[var(--radius-sm)] border border-white/12 bg-black/18 shadow-2xl backdrop-blur-2xl sm:my-5"
            onTouchStart={(event) => {
              touchStartX.current = event.changedTouches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
              if (touchStartX.current === null) return;
              const deltaX =
                event.changedTouches[0].clientX - touchStartX.current;
              touchStartX.current = null;
              if (Math.abs(deltaX) < 48) return;
              setActiveIndex((index) =>
                deltaX < 0
                  ? Math.min(index + 1, images.length - 1)
                  : Math.max(index - 1, 0),
              );
            }}
          >
            <Image
              key={activeImage.src}
              fill
              priority
              sizes="100vw"
              src={activeImage.src}
              alt={activeImage.alt}
              className="object-contain p-2 transition-opacity duration-300 sm:p-4"
            />
          </div>

          <div className="rounded-[var(--radius-sm)] border border-white/12 bg-white/10 p-2 shadow-2xl backdrop-blur-2xl">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((image, index) => (
                <button
                  key={image.src}
                  type="button"
                  aria-label={`Bild ${index + 1} anzeigen`}
                  aria-pressed={index === activeIndex}
                  className={cn(
                    "relative h-16 w-24 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border transition-[border-color,opacity,transform] duration-200 sm:h-20 sm:w-32",
                    index === activeIndex
                      ? "border-accent opacity-100"
                      : "border-white/18 opacity-65 hover:opacity-100",
                  )}
                  onClick={() => setActiveIndex(index)}
                >
                  <Image
                    fill
                    sizes="8rem"
                    src={image.src}
                    alt=""
                    className="object-cover"
                  />
                  {index === activeIndex && (
                    <span className="absolute right-1.5 bottom-1.5 grid size-6 place-items-center rounded-full bg-accent text-accent-foreground">
                      <Maximize2 className="size-3" aria-hidden="true" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
