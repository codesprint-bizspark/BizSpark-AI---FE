"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import WebsiteEditorLayout from "@/components/website-editor/WebsiteEditorLayout"
import { useWebsiteConfig } from "@/components/website-editor/hooks/useWebsiteConfig"
import { useMediaUpload } from "@/components/website-editor/hooks/useMediaUpload"
import { normalizeEditorState, toSavePayload, type SectionId } from "@/components/website-editor/types"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

function EditorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const taskId = searchParams.get("taskId")
  const draftKey = searchParams.get("draftKey")

  const [businessId, setBusinessId] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState("")
  const [selectedSection, setSelectedSection] = useState<SectionId | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [initialDraft, setInitialDraft] = useState<ReturnType<typeof normalizeEditorState> | null>(null)

  useEffect(() => {
    const id = localStorage.getItem("active_biz_id")
    if (!id) {
      router.replace("/dashboard/website")
      return
    }
    setBusinessId(id)

    if (draftKey && typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem(draftKey)
        if (raw) setInitialDraft(normalizeEditorState(JSON.parse(raw)))
      } catch { /* ignore */ }
    }

    apiClient.get(`/business/${id}`).then(res => {
      if (res.data?.name) setBusinessName(res.data.name)
    }).catch(() => {})
  }, [router, draftKey])

  const {
    config,
    updateConfig,
    updateContent,
    loading,
    saving,
    dirty,
    save,
  } = useWebsiteConfig({
    businessId,
    businessName,
    taskId,
    initialDraft,
  })

  const { upload, uploading } = useMediaUpload(businessId)

  const mode = taskId ? "draft" : "published"

  const handleSave = async () => {
    try {
      await save()
      toast({ title: "Saved", description: "Your website changes have been saved." })
    } catch (e: unknown) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" })
    }
  }

  const handlePublish = async () => {
    if (!taskId || !config || !businessId) return
    setPublishing(true)
    try {
      await apiClient.post(`/agents/tasks/${taskId}/approve`, { content: toSavePayload(config) })
      toast({ title: "Published!", description: "Your storefront is now live." })
      router.push("/dashboard/website")
    } catch (e: unknown) {
      toast({ title: "Publish failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" })
    } finally {
      setPublishing(false)
    }
  }

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <WebsiteEditorLayout
      businessName={businessName || config.businessName}
      config={config}
      selectedSection={selectedSection}
      onSelectSection={setSelectedSection}
      onUpdateConfig={updateConfig}
      onUpdateContent={updateContent}
      onSave={handleSave}
      onPublish={taskId ? handlePublish : undefined}
      saving={saving}
      publishing={publishing}
      dirty={dirty}
      mode={mode}
      onUpload={upload}
      uploading={uploading}
    />
  )
}

export default function WebsiteEditorPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96"><Loader2 className="size-8 animate-spin" /></div>}>
      <EditorContent />
    </Suspense>
  )
}
