"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, Monitor, Rocket, Save, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import EditorCanvas from "./EditorCanvas"
import SectionSidebar from "./SectionSidebar"
import SectionPalette from "./SectionPalette"
import type { SectionId, WebsiteEditorState } from "./types"

type Props = {
  businessName: string
  config: WebsiteEditorState
  selectedSection: SectionId | null
  onSelectSection: (id: SectionId) => void
  onUpdateConfig: (patch: Partial<WebsiteEditorState>) => void
  onUpdateContent: (patch: Partial<WebsiteEditorState['content']>) => void
  onSave: () => Promise<void>
  onPublish?: () => Promise<void>
  saving: boolean
  publishing?: boolean
  dirty: boolean
  mode: 'draft' | 'published'
  onUpload: (file: File) => Promise<string>
  uploading: boolean
}

export default function WebsiteEditorLayout({
  businessName,
  config,
  selectedSection,
  onSelectSection,
  onUpdateConfig,
  onUpdateContent,
  onSave,
  onPublish,
  saving,
  publishing,
  dirty,
  mode,
  onUpload,
  uploading,
}: Props) {
  const [previewWidth, setPreviewWidth] = useState<'desktop' | 'mobile'>('desktop')

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b bg-background shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/website"><ArrowLeft className="size-4 mr-1" /> Back</Link>
          </Button>
          <div className="min-w-0">
            <h1 className="font-semibold truncate">{businessName} — Editor</h1>
            {dirty && <p className="text-xs text-amber-600">Unsaved changes</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex border rounded-md p-0.5">
            <button
              type="button"
              className={cn('p-1.5 rounded', previewWidth === 'desktop' && 'bg-muted')}
              onClick={() => setPreviewWidth('desktop')}
              title="Desktop preview"
            >
              <Monitor className="size-4" />
            </button>
            <button
              type="button"
              className={cn('p-1.5 rounded', previewWidth === 'mobile' && 'bg-muted')}
              onClick={() => setPreviewWidth('mobile')}
              title="Mobile preview"
            >
              <Smartphone className="size-4" />
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => void onSave()} disabled={saving || !dirty}>
            {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : <Save className="size-4 mr-1" />}
            Save
          </Button>
          {mode === 'draft' && onPublish && (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/website">Redo</Link>
              </Button>
              <Button size="sm" onClick={() => void onPublish()} disabled={publishing}>
              {publishing ? <Loader2 className="size-4 animate-spin mr-1" /> : <Rocket className="size-4 mr-1" />}
              Publish
            </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Canvas */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/30" onClick={() => onSelectSection('branding')}>
          <EditorCanvas
            config={config}
            selectedSection={selectedSection}
            onSelectSection={onSelectSection}
            onUpdateConfig={onUpdateConfig}
            onUpdateContent={onUpdateContent}
            onUpload={onUpload}
            uploading={uploading}
            previewWidth={previewWidth}
          />
        </div>

        {/* Sidebar */}
        <aside className="w-80 border-l bg-background shrink-0 overflow-y-auto hidden md:block">
          <div className="p-4 border-b">
            <SectionPalette config={config} onUpdate={onUpdateContent} onSelectSection={onSelectSection} />
          </div>
          <SectionSidebar
            sectionId={selectedSection}
            config={config}
            onUpdateConfig={onUpdateConfig}
            onUpdateContent={onUpdateContent}
            onUpload={onUpload}
            uploading={uploading}
          />
        </aside>
      </div>
    </div>
  )
}
