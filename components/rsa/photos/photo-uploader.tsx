'use client'

import { useState } from 'react'
import imageCompression from 'browser-image-compression'
import { ImagePlus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  { value: 'scene', label: 'Scene / Surroundings' },
  { value: 'damage', label: 'Damage Close-up' },
  { value: 'plate', label: 'License Plate' },
  { value: 'odometer', label: 'Odometer' },
  { value: 'tire', label: 'Tire / Wheel' },
  { value: 'other', label: 'Other' },
] as const

export type UploadedPhoto = {
  id: string
  category: string
  previewUrl: string
  name: string
  size: number
  progress: number
}

export function PhotoUploader({
  value = [],
  onChange,
  className,
}: {
  value?: UploadedPhoto[]
  onChange?: (photos: UploadedPhoto[]) => void
  className?: string
}) {
  const [category, setCategory] = useState<string>('scene')
  const [busy, setBusy] = useState(false)

  const update = (next: UploadedPhoto[]) => onChange?.(next)

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    const next = [...value]
    for (const file of Array.from(files)) {
      const id = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const placeholder: UploadedPhoto = {
        id,
        category,
        previewUrl: '',
        name: file.name,
        size: file.size,
        progress: 10,
      }
      next.push(placeholder)
      update([...next])

      try {
        const compressed = await imageCompression(file, {
          maxSizeMB: 0.8,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
        })
        const previewUrl = URL.createObjectURL(compressed)
        const idx = next.findIndex((p) => p.id === id)
        if (idx >= 0) {
          next[idx] = {
            ...next[idx],
            previewUrl,
            size: compressed.size,
            progress: 100,
          }
          update([...next])
        }
      } catch {
        const idx = next.findIndex((p) => p.id === id)
        if (idx >= 0) {
          next[idx] = {
            ...next[idx],
            previewUrl: URL.createObjectURL(file),
            progress: 100,
          }
          update([...next])
        }
      }
    }
    setBusy(false)
  }

  const remove = (id: string) => {
    const target = value.find((p) => p.id === id)
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
    update(value.filter((p) => p.id !== id))
  }

  return (
    <Card className={cn('space-y-4 p-4', className)}>
      <CardHeader className="space-y-1 p-0">
        <h3 className="text-base font-semibold text-black">Photos</h3>
        <p className="text-sm text-gray">
          Add clear photos by category. Images are compressed in the browser.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 p-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="sm:w-56">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="inline-flex cursor-pointer">
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={busy}
              onChange={(e) => void onFiles(e.target.files)}
            />
            <span className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-black px-2.5 py-2 text-xs font-medium text-white">
              <ImagePlus className="size-4" />
              {busy ? 'Compressing…' : 'Add photos'}
            </span>
          </label>
        </div>

        {value.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray">
            No photos yet
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {value.map((photo) => (
              <div
                key={photo.id}
                className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-200"
              >
                {photo.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.previewUrl}
                    alt={photo.name}
                    className="h-32 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-32 items-center justify-center text-xs">
                    Uploading… {photo.progress}%
                  </div>
                )}
                <div className="flex items-center justify-between gap-1 p-2">
                  <Badge variant="outline" size="small">
                    {CATEGORIES.find((c) => c.value === photo.category)?.label ??
                      photo.category}
                  </Badge>
                  <Button
                    type="button"
                    variant="outline-general"
                    size="small"
                    className="!px-2 size-7 text-danger"
                    onClick={() => remove(photo.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                {photo.progress < 100 && (
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-gray-300">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${photo.progress}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
