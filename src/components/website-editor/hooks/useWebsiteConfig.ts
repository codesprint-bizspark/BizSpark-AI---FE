"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { apiClient } from "@/lib/api-client"
import { normalizeEditorState, toSavePayload, type WebsiteEditorState } from "../types"

type Options = {
  businessId: string | null
  businessName?: string
  taskId?: string | null
  initialDraft?: WebsiteEditorState | null
}

export function useWebsiteConfig({ businessId, businessName, taskId, initialDraft }: Options) {
  const [config, setConfig] = useState<WebsiteEditorState | null>(initialDraft ?? null)
  const [loading, setLoading] = useState(!initialDraft)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (initialDraft) {
      setConfig(initialDraft)
      setLoading(false)
      return
    }
    if (!businessId || loadedRef.current) return

    const load = async () => {
      setLoading(true)
      try {
        if (taskId) {
          const taskRes = await apiClient.get(`/agents/tasks/${taskId}`)
          const generated = taskRes.data?.outputData?.generatedContent
          if (generated) {
            setConfig(normalizeEditorState(generated, businessName))
            loadedRef.current = true
            return
          }
        }
        const res = await apiClient.getWebsiteConfig(businessId)
        setConfig(normalizeEditorState(res.data ?? {}, businessName))
        loadedRef.current = true
      } catch {
        setConfig(normalizeEditorState({}, businessName))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [businessId, businessName, taskId, initialDraft])

  const updateConfig = useCallback((patch: Partial<WebsiteEditorState> | ((prev: WebsiteEditorState) => WebsiteEditorState)) => {
    setConfig(prev => {
      if (!prev) return prev
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }
      return next
    })
    setDirty(true)
  }, [])

  const updateContent = useCallback((sectionPatch: Partial<WebsiteEditorState['content']>) => {
    setConfig(prev => {
      if (!prev) return prev
      return { ...prev, content: { ...prev.content, ...sectionPatch } }
    })
    setDirty(true)
  }, [])

  const save = useCallback(async () => {
    if (!businessId || !config) return
    setSaving(true)
    try {
      await apiClient.patchWebsiteConfig(businessId, toSavePayload(config))
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }, [businessId, config])

  return { config, setConfig, updateConfig, updateContent, loading, saving, dirty, save }
}
