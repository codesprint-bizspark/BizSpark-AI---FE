"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import EditableColor from "./editable/EditableColor"
import EditableImage from "./editable/EditableImage"
import { FEATURE_ICONS, type SectionId, type WebsiteEditorState } from "./types"

type Props = {
  sectionId: SectionId | null
  config: WebsiteEditorState
  onUpdateConfig: (patch: Partial<WebsiteEditorState>) => void
  onUpdateContent: (patch: Partial<WebsiteEditorState['content']>) => void
  onUpload: (file: File) => Promise<string>
  uploading: boolean
}

export default function SectionSidebar({
  sectionId,
  config,
  onUpdateConfig,
  onUpdateContent,
  onUpload,
  uploading,
}: Props) {
  const c = config.content

  if (!sectionId) {
    return (
      <div className="text-sm text-muted-foreground p-4">
        Click a section in the preview or use the section list to edit.
      </div>
    )
  }

  const field = "w-full text-sm"

  if (sectionId === 'branding') {
    return (
      <div className="space-y-4 p-4">
        <h3 className="font-semibold">Branding</h3>
        <div><Label>Business name</Label><Input className={field} value={config.businessName} onChange={e => onUpdateConfig({ businessName: e.target.value })} /></div>
        <div><Label>Tagline</Label><Input className={field} value={config.tagline} onChange={e => onUpdateConfig({ tagline: e.target.value })} /></div>
        <div className="flex gap-4">
          <EditableColor value={config.primaryColor} onChange={v => onUpdateConfig({ primaryColor: v })} label="Primary" />
          <EditableColor value={config.secondaryColor} onChange={v => onUpdateConfig({ secondaryColor: v })} label="Secondary" />
        </div>
        <div>
          <Label>Logo</Label>
          <EditableImage value={config.logoUrl} onChange={v => onUpdateConfig({ logoUrl: v })} onUpload={onUpload} uploading={uploading} aspectClass="aspect-square max-w-[120px]" label="Logo" />
        </div>
        <div><Label>Favicon URL</Label><Input className={field} value={config.faviconUrl ?? ''} onChange={e => onUpdateConfig({ faviconUrl: e.target.value || null })} placeholder="https://..." /></div>
      </div>
    )
  }

  if (sectionId === 'announcement') {
    return (
      <div className="space-y-4 p-4">
        <h3 className="font-semibold">Announcement</h3>
        <div><Label>Text</Label><Input className={field} value={c.announcement?.text ?? ''} onChange={e => onUpdateContent({ announcement: { ...c.announcement!, enabled: true, text: e.target.value } })} /></div>
        <div className="flex gap-4">
          <EditableColor value={c.announcement?.bgColor ?? config.primaryColor} onChange={v => onUpdateContent({ announcement: { ...c.announcement!, enabled: true, text: c.announcement?.text ?? '', bgColor: v } })} label="Background" />
          <EditableColor value={c.announcement?.textColor ?? '#ffffff'} onChange={v => onUpdateContent({ announcement: { ...c.announcement!, enabled: true, text: c.announcement?.text ?? '', textColor: v } })} label="Text" />
        </div>
      </div>
    )
  }

  if (sectionId === 'hero') {
    return (
      <div className="space-y-4 p-4">
        <h3 className="font-semibold">Hero</h3>
        <div><Label>Title</Label><Input className={field} value={c.hero?.title ?? ''} onChange={e => onUpdateContent({ hero: { ...c.hero, title: e.target.value } })} /></div>
        <div><Label>Subtitle</Label><Textarea className={field} rows={2} value={c.hero?.subtitle ?? ''} onChange={e => onUpdateContent({ hero: { ...c.hero, subtitle: e.target.value } })} /></div>
        <div><Label>CTA text</Label><Input className={field} value={c.hero?.ctaText ?? ''} onChange={e => onUpdateContent({ hero: { ...c.hero, ctaText: e.target.value } })} /></div>
        <div><Label>CTA link</Label><Input className={field} value={c.hero?.ctaLink ?? '/shop'} onChange={e => onUpdateContent({ hero: { ...c.hero, ctaLink: e.target.value } })} /></div>
        <div>
          <Label>Background image</Label>
          <EditableImage value={c.hero?.imageUrl} onChange={v => onUpdateContent({ hero: { ...c.hero, imageUrl: v ?? undefined } })} onUpload={onUpload} uploading={uploading} label="Hero image" />
        </div>
      </div>
    )
  }

  if (sectionId === 'features') {
    return (
      <div className="space-y-4 p-4">
        <h3 className="font-semibold">Features</h3>
        {(c.features ?? []).map((f, i) => (
          <div key={i} className="border rounded-lg p-3 space-y-2">
            <Label>Feature {i + 1}</Label>
            <Select value={f.icon} onValueChange={v => {
              const features = [...(c.features ?? [])]
              features[i] = { ...features[i], icon: v }
              onUpdateContent({ features })
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FEATURE_ICONS.map(icon => <SelectItem key={icon} value={icon}>{icon}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input className={field} value={f.title} placeholder="Title" onChange={e => {
              const features = [...(c.features ?? [])]
              features[i] = { ...features[i], title: e.target.value }
              onUpdateContent({ features })
            }} />
            <Textarea className={field} rows={2} value={f.description} placeholder="Description" onChange={e => {
              const features = [...(c.features ?? [])]
              features[i] = { ...features[i], description: e.target.value }
              onUpdateContent({ features })
            }} />
          </div>
        ))}
      </div>
    )
  }

  if (sectionId === 'about') {
    return (
      <div className="space-y-4 p-4">
        <h3 className="font-semibold">About</h3>
        <div><Label>Title</Label><Input className={field} value={c.about?.title ?? ''} onChange={e => onUpdateContent({ about: { ...c.about, title: e.target.value } })} /></div>
        <div><Label>Text</Label><Textarea className={field} rows={4} value={c.about?.text ?? ''} onChange={e => onUpdateContent({ about: { ...c.about, text: e.target.value } })} /></div>
        <EditableImage value={c.about?.imageUrl} onChange={v => onUpdateContent({ about: { ...c.about, imageUrl: v ?? undefined } })} onUpload={onUpload} uploading={uploading} label="About image" />
      </div>
    )
  }

  if (sectionId === 'footer') {
    return (
      <div className="space-y-4 p-4">
        <h3 className="font-semibold">Footer & Contact</h3>
        <div><Label>Email</Label><Input className={field} type="email" value={c.footer?.contactEmail ?? ''} onChange={e => onUpdateContent({ footer: { ...c.footer, contactEmail: e.target.value } })} /></div>
        <div><Label>Phone</Label><Input className={field} value={c.footer?.contactPhone ?? ''} onChange={e => onUpdateContent({ footer: { ...c.footer, contactPhone: e.target.value } })} /></div>
        <div><Label>Address</Label><Textarea className={field} rows={2} value={c.footer?.address ?? ''} onChange={e => onUpdateContent({ footer: { ...c.footer, address: e.target.value } })} /></div>
        <div><Label>Instagram</Label><Input className={field} value={c.footer?.socialLinks?.instagram ?? ''} onChange={e => onUpdateContent({ footer: { ...c.footer, socialLinks: { ...c.footer?.socialLinks, instagram: e.target.value } } })} /></div>
        <div><Label>Facebook</Label><Input className={field} value={c.footer?.socialLinks?.facebook ?? ''} onChange={e => onUpdateContent({ footer: { ...c.footer, socialLinks: { ...c.footer?.socialLinks, facebook: e.target.value } } })} /></div>
      </div>
    )
  }

  if (sectionId === 'seo') {
    return (
      <div className="space-y-4 p-4">
        <h3 className="font-semibold">SEO</h3>
        <div><Label>Meta description</Label><Textarea className={field} rows={2} value={c.seo?.metaDescription ?? ''} onChange={e => onUpdateContent({ seo: { ...c.seo, metaDescription: e.target.value } })} /></div>
        <div><Label>Keywords</Label><Input className={field} value={c.seo?.keywords ?? ''} onChange={e => onUpdateContent({ seo: { ...c.seo, keywords: e.target.value } })} /></div>
        <EditableImage value={c.seo?.ogImageUrl} onChange={v => onUpdateContent({ seo: { ...c.seo, ogImageUrl: v ?? undefined } })} onUpload={onUpload} uploading={uploading} label="OG image" aspectClass="aspect-[1.91/1]" />
      </div>
    )
  }

  return null
}
