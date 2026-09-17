'use client'

import { useState } from 'react'
import { PhotoUploader, type UploadedPhoto } from '@/components/rsa/photos/photo-uploader'
import { PortalPageHeader } from '@/components/rsa/portal-page'

export default function Page() {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([])
  return (
    <div className="space-y-4">
      <PortalPageHeader
        title="Photos"
        description="Before / after and damage documentation."
      />
      <PhotoUploader value={photos} onChange={setPhotos} />
    </div>
  )
}
