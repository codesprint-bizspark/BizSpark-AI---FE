"use client"

import { useCallback, useState } from "react"
import { apiClient } from "@/lib/api-client"

export function useMediaUpload(businessId: string | null) {
  const [uploading, setUploading] = useState(false)

  const upload = useCallback(async (file: File): Promise<string> => {
    if (!businessId) throw new Error("No business selected")
    setUploading(true)
    try {
      const res = await apiClient.uploadFile(`/business/${businessId}/website/media`, file)
      const url = res?.data?.url
      if (!url) throw new Error("No URL returned from upload")
      return url
    } finally {
      setUploading(false)
    }
  }, [businessId])

  return { upload, uploading }
}
