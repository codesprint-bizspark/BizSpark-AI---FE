"use client"

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { SECTION_REGISTRY, defaultFeature, type SectionId, type WebsiteEditorState } from "./types"

type Props = {
  config: WebsiteEditorState
  onUpdate: (patch: Partial<WebsiteEditorState['content']>) => void
  onSelectSection: (id: SectionId) => void
}

export default function SectionPalette({ config, onUpdate, onSelectSection }: Props) {
  const c = config.content

  const toggleAnnouncement = (enabled: boolean) => {
    onUpdate({
      announcement: {
        enabled,
        text: c.announcement?.text ?? 'Welcome to our store!',
        bgColor: c.announcement?.bgColor,
        textColor: c.announcement?.textColor,
      },
    })
  }

  const toggleFeatures = (enabled: boolean) => {
    if (enabled && !c.features?.length) {
      onUpdate({ features: [defaultFeature(0), defaultFeature(1), defaultFeature(2), defaultFeature(3)] })
    } else if (!enabled) {
      onUpdate({ features: [] })
    }
  }

  const toggleAbout = (enabled: boolean) => {
    if (enabled && !c.about?.title) {
      onUpdate({ about: { title: 'About Us', text: 'Tell your story here.' } })
    } else if (!enabled) {
      onUpdate({ about: undefined })
    }
  }

  const addFeature = () => {
    const features = [...(c.features ?? [])]
    if (features.length >= 4) return
    features.push(defaultFeature(features.length))
    onUpdate({ features })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sections</p>
      {SECTION_REGISTRY.filter(s => s.toggleable).map(section => {
        const enabled =
          section.id === 'announcement' ? !!c.announcement?.enabled
          : section.id === 'features' ? (c.features?.length ?? 0) > 0
          : section.id === 'about' ? !!c.about?.title
          : false

        return (
          <div key={section.id} className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="text-sm hover:text-primary text-left flex-1"
              onClick={() => onSelectSection(section.id)}
            >
              {section.label}
            </button>
            <Switch
              checked={enabled}
              onCheckedChange={v => {
                if (section.id === 'announcement') toggleAnnouncement(v)
                if (section.id === 'features') toggleFeatures(v)
                if (section.id === 'about') toggleAbout(v)
              }}
            />
          </div>
        )
      })}

      {(c.features?.length ?? 0) > 0 && (c.features?.length ?? 0) < 4 && (
        <Button type="button" variant="outline" size="sm" className="w-full gap-1" onClick={addFeature}>
          <Plus className="size-3" /> Add feature
        </Button>
      )}

      {(c.features?.length ?? 0) > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full text-destructive gap-1"
          onClick={() => onUpdate({ features: c.features?.slice(0, -1) })}
        >
          <Trash2 className="size-3" /> Remove last feature
        </Button>
      )}

      <div className="pt-2 border-t space-y-2">
        <Label className="text-xs text-muted-foreground">Other sections</Label>
        {SECTION_REGISTRY.filter(s => !s.toggleable && s.id !== 'branding').map(s => (
          <button
            key={s.id}
            type="button"
            className="block text-sm hover:text-primary w-full text-left"
            onClick={() => onSelectSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
