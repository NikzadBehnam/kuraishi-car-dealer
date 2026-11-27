"use client";

import Image from "next/image";
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  MAX_PHOTOS_PER_UPLOAD,
  MAX_VEHICLE_PHOTOS,
  photoUploadRequestSchema,
  staffPhotoUrl,
} from "@/lib/vehicle-photo-validation";

const endpoint = "/api/admin/vehicles/photo-uploads";
const grantsSchema = z.object({
  uploads: z.array(
    z.object({
      uploadId: z.uuid(),
      url: z.url(),
      fields: z.record(z.string(), z.string()),
    }),
  ),
});

async function uploadRequest(
  method: "POST" | "PATCH" | "DELETE",
  body: unknown,
  signal?: AbortSignal,
) {
  const response = await fetch(endpoint, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
    keepalive: method === "DELETE",
  });
  if (response.status === 204) return null;
  const data: unknown = await response.json();
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(data);
    throw new Error(
      error.success ? error.data.error : "The photo request failed.",
    );
  }
  return data;
}

function discard(uploadId: string) {
  return uploadRequest("DELETE", { uploadId }).catch(() => {
    console.error("Could not discard the upload; it will expire.");
  });
}

type Photo = { id: string; url: string; filename?: string };

export function useVehiclePhotos(
  vehicleId: string | undefined,
  initialIds: string[],
  onChange: (ids: string[]) => void,
) {
  const [photos, setPhotos] = useState<Photo[]>(() =>
    initialIds.map((id) => ({ id, url: staffPhotoUrl(id) })),
  );
  const [progress, setProgress] = useState<string | null>(null);
  const pending = useRef(new Set<string>());
  const previews = useRef(new Set<string>());
  const active = useRef<AbortController | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const pendingIds = pending.current;
    const urls = previews.current;
    return () => {
      mounted.current = false;
      active.current?.abort();
      pendingIds.forEach((id) => void discard(id));
      urls.forEach((url) => URL.revokeObjectURL(url));
      pendingIds.clear();
      urls.clear();
    };
  }, []);

  function replace(next: Photo[]) {
    setPhotos(next);
    onChange(next.map(({ id }) => id));
  }

  function move(index: number, direction: -1 | 1) {
    const other = index + direction;
    if (active.current || other < 0 || other >= photos.length) return;
    const next = [...photos];
    [next[index], next[other]] = [next[other], next[index]];
    replace(next);
  }

  function remove(photo: Photo) {
    if (active.current) return;
    if (pending.current.delete(photo.id)) {
      void discard(photo.id);
      URL.revokeObjectURL(photo.url);
      previews.current.delete(photo.url);
    }
    replace(photos.filter(({ id }) => id !== photo.id));
  }

  async function upload(files: File[]) {
    if (active.current || !files.length) return;
    if (photos.length + files.length > MAX_VEHICLE_PHOTOS) {
      toast.error(`A vehicle can have up to ${MAX_VEHICLE_PHOTOS} photos.`);
      return;
    }
    const details = files.map(({ type, size }) => ({
      contentType: type,
      sizeBytes: size,
    }));
    const batches = [];
    for (
      let index = 0;
      index < details.length;
      index += MAX_PHOTOS_PER_UPLOAD
    ) {
      const batch = photoUploadRequestSchema.safeParse({
        vehicleId,
        files: details.slice(index, index + MAX_PHOTOS_PER_UPLOAD),
      });
      if (!batch.success) {
        toast.error("Choose JPEG or PNG photos up to 10 MB each.");
        return;
      }
      batches.push(batch.data);
    }
    const operation = new AbortController();
    active.current = operation;
    const added: Photo[] = [];
    const uncompleted = new Set<string>();
    let index = 0;
    setProgress("Preparing photos…");
    try {
      for (const batch of batches) {
        const { uploads } = grantsSchema.parse(
          await uploadRequest("POST", batch, operation.signal),
        );
        if (uploads.length !== batch.files.length)
          throw new Error("The server returned an incomplete photo batch.");
        uploads.forEach(({ uploadId }) => {
          pending.current.add(uploadId);
          uncompleted.add(uploadId);
        });
        for (const { uploadId, url, fields } of uploads) {
          const file = files[index++];
          setProgress(`Uploading photo ${index} of ${files.length}…`);
          const data = new FormData();
          for (const [name, value] of Object.entries(fields))
            data.append(name, value);
          data.append("file", file);
          const saved = await fetch(url, {
            method: "POST",
            body: data,
            signal: operation.signal,
          });
          if (!saved.ok) throw new Error(`Could not upload ${file.name}.`);
          await uploadRequest("PATCH", { uploadId }, operation.signal);
          uncompleted.delete(uploadId);
          const preview = URL.createObjectURL(file);
          previews.current.add(preview);
          added.push({ id: uploadId, url: preview, filename: file.name });
        }
      }
    } catch (error) {
      if (!operation.signal.aborted) {
        toast.error(
          error instanceof Error ? error.message : "The photo upload failed.",
        );
      }
    } finally {
      for (const id of uncompleted) {
        if (pending.current.delete(id)) void discard(id);
      }
      active.current = null;
      if (operation.signal.aborted) {
        for (const photo of added) {
          if (pending.current.delete(photo.id)) void discard(photo.id);
          if (previews.current.delete(photo.url)) URL.revokeObjectURL(photo.url);
        }
      } else if (mounted.current && added.length) {
        replace([...photos, ...added]);
      }
      if (mounted.current) setProgress(null);
    }
  }

  const cancel = () => active.current?.abort();
  const markSaved = () => pending.current.clear();
  return { photos, progress, upload, move, remove, cancel, markSaved };
}

export function VehiclePhotosField({
  field,
  disabled,
}: {
  field: ReturnType<typeof useVehiclePhotos>;
  disabled: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-4">
      <div
        className="rounded-md border border-dashed p-4 text-center sm:p-6"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (!disabled)
            void field.upload(Array.from(event.dataTransfer.files));
        }}
      >
        <input
          ref={input}
          hidden
          type="file"
          multiple
          accept="image/jpeg,image/png"
          disabled={disabled}
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? []);
            event.currentTarget.value = "";
            void field.upload(files);
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled || field.photos.length >= MAX_VEHICLE_PHOTOS}
          onClick={() => input.current?.click()}
        >
          <ImagePlus /> Add photos
        </Button>
        {field.progress && (
          <Button type="button" variant="ghost" onClick={field.cancel}>
            Cancel upload
          </Button>
        )}
        <p className="text-muted-foreground mt-2 text-sm">
          Or drop JPEG or PNG photos here (up to 10 MB each).
        </p>
        <p className="mt-2 text-sm" role="status">
          {field.progress ??
            `${field.photos.length} / ${MAX_VEHICLE_PHOTOS} photos`}
        </p>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {field.photos.map((photo, index) => (
          <li key={photo.id} className="overflow-hidden rounded-md border">
            <div className="bg-secondary relative aspect-video">
              <Image
                fill
                unoptimized
                className="object-cover"
                src={photo.url}
                alt={photo.filename ?? `Vehicle photo ${index + 1}`}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 p-2">
              <span className="text-sm font-semibold">
                {index === 0 ? "Cover photo" : `Photo ${index + 1}`}
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Move photo ${index + 1} earlier`}
                  disabled={disabled || index === 0}
                  onClick={() => field.move(index, -1)}
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Move photo ${index + 1} later`}
                  disabled={disabled || index === field.photos.length - 1}
                  onClick={() => field.move(index, 1)}
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove photo ${index + 1}`}
                  disabled={disabled}
                  onClick={() => field.remove(photo)}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
