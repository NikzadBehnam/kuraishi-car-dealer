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
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-[#06101f]/58 backdrop-blur-xl data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-[90] flex max-h-[calc(100svh-2rem)] w-[calc(100vw-1.25rem)] max-w-6xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--radius-sm)] border border-white/14 bg-[#0b1626]/82 text-white shadow-2xl outline-none backdrop-blur-2xl data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:w-[min(92vw,72rem)]">
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <Dialog.Description className="sr-only">
            Fahrzeugbilder in großer Ansicht mit Vorschaubildern auswählen.
          </Dialog.Description>

          <div className="flex items-center justify-between gap-3 border-b border-white/12 bg-white/8 px-3 py-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-white/10 ring-1 ring-white/10">
                <Images className="size-5" aria-hidden="true" />
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
                className="rounded-[var(--radius-sm)] text-white hover:bg-white/10"
                aria-label="Bildvorschau schließen"
              >
                <X />
              </Button>
            </Dialog.Close>
          </div>

          <div
            className="relative m-3 h-[min(58svh,38rem)] overflow-hidden rounded-[var(--radius-sm)] border border-white/10 bg-black/24 shadow-inner sm:m-4 sm:h-[min(64svh,42rem)]"
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
              className="object-contain p-2 transition-opacity duration-300 sm:p-3"
            />
          </div>

          <div className="border-t border-white/12 bg-white/8 p-3">
            <div className="flex justify-start gap-2 overflow-x-auto pb-1 sm:justify-center">
              {images.map((image, index) => (
                <button
                  key={image.src}
                  type="button"
                  aria-label={`Bild ${index + 1} anzeigen`}
                  aria-pressed={index === activeIndex}
                  className={cn(
                    "relative h-14 w-20 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border transition-[border-color,opacity,transform] duration-200 sm:h-16 sm:w-24",
                    index === activeIndex
                      ? "scale-[1.02] border-accent opacity-100 shadow-lg shadow-accent/20"
                      : "border-white/18 opacity-60 hover:opacity-100",
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
                    <span className="absolute right-1 bottom-1 grid size-5 place-items-center rounded-full bg-accent text-accent-foreground">
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
