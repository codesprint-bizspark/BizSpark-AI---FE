"use client"

import { cn } from "@/lib/utils"
import EditableText from "./editable/EditableText"
import EditableImage from "./editable/EditableImage"
import SectionOutline from "./editable/SectionOutline"
import FeatureIcon from "./FeatureIcon"
import type { SectionId, WebsiteEditorState } from "./types"

type Props = {
  config: WebsiteEditorState
  selectedSection: SectionId | null
  onSelectSection: (id: SectionId) => void
  onUpdateConfig: (patch: Partial<WebsiteEditorState>) => void
  onUpdateContent: (patch: Partial<WebsiteEditorState['content']>) => void
  onUpload: (file: File) => Promise<string>
  uploading: boolean
  previewWidth: 'desktop' | 'mobile'
}

export default function EditorCanvas({
  config,
  selectedSection,
  onSelectSection,
  onUpdateConfig,
  onUpdateContent,
  onUpload,
  uploading,
  previewWidth,
}: Props) {
  const c = config.content
  const primary = config.primaryColor

  return (
    <div
      className={cn(
        'mx-auto bg-gray-50 shadow-xl transition-all duration-300 overflow-hidden',
        previewWidth === 'mobile' ? 'max-w-[390px]' : 'max-w-full',
      )}
      style={{
        ['--color-primary' as string]: primary,
        ['--color-secondary' as string]: config.secondaryColor,
      }}
    >
      {/* Navbar preview */}
      <SectionOutline sectionId="branding" label="Branding" selected={selectedSection === 'branding'} onSelect={onSelectSection}>
        <nav className="bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xl" style={{ color: primary }}>
              {config.logoUrl
                ? // eslint-disable-next-line @next/next/no-img-element
                  <img src={config.logoUrl} alt="" className="size-8 rounded object-cover" />
                : (
                  <button type="button" onClick={() => onSelectSection('branding')} className="size-8 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">
                    Logo
                  </button>
                )}
              <EditableText
                value={config.businessName}
                onChange={v => onUpdateConfig({ businessName: v })}
                className="truncate max-w-[200px]"
              />
            </div>
            <div className="hidden sm:flex gap-4 text-sm text-gray-600">
              <span>Shop</span><span>Cart</span>
            </div>
          </div>
        </nav>
      </SectionOutline>

      {/* Announcement */}
      {c.announcement?.enabled && (
        <SectionOutline sectionId="announcement" label="Announcement" selected={selectedSection === 'announcement'} onSelect={onSelectSection}>
          <div
            className="text-center py-2 px-4 text-sm font-medium"
            style={{
              backgroundColor: c.announcement.bgColor ?? primary,
              color: c.announcement.textColor ?? '#fff',
            }}
          >
            <EditableText
              value={c.announcement.text}
              onChange={v => onUpdateContent({ announcement: { ...c.announcement!, enabled: true, text: v } })}
            />
          </div>
        </SectionOutline>
      )}

      {/* Hero */}
      <SectionOutline sectionId="hero" label="Hero" selected={selectedSection === 'hero'} onSelect={onSelectSection}>
        <section className="relative min-h-[360px] flex items-center overflow-hidden bg-gray-900">
          {c.hero?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.hero.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
          ) : (
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${primary}cc, ${config.secondaryColor}cc)` }} />
          )}
          <div className="absolute top-4 right-4 w-48 z-10 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <EditableImage
              value={c.hero?.imageUrl}
              onChange={v => onUpdateContent({ hero: { ...c.hero, imageUrl: v ?? undefined } })}
              onUpload={onUpload}
              uploading={uploading}
              aspectClass="aspect-video"
              label="Hero"
            />
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-20 w-full">
            <EditableText
              as="h1"
              value={c.hero?.title ?? ''}
              onChange={v => onUpdateContent({ hero: { ...c.hero, title: v } })}
              placeholder="Hero title"
              className="text-3xl sm:text-4xl font-bold text-white max-w-2xl leading-tight block"
            />
            <EditableText
              value={c.hero?.subtitle ?? ''}
              onChange={v => onUpdateContent({ hero: { ...c.hero, subtitle: v } })}
              placeholder="Hero subtitle"
              multiline
              className="mt-4 text-lg text-white/80 max-w-xl block"
            />
            <span
              className="inline-block mt-6 px-6 py-2.5 rounded-lg font-semibold text-white"
              style={{ backgroundColor: primary }}
            >
              {c.hero?.ctaText || 'Shop Now'}
            </span>
          </div>
        </section>
      </SectionOutline>

      {/* Features */}
      {(c.features?.length ?? 0) > 0 && (
        <SectionOutline sectionId="features" label="Features" selected={selectedSection === 'features'} onSelect={onSelectSection}>
          <section className="bg-white border-b py-10">
            <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-6">
              {c.features!.map((f, i) => (
                <div key={i} className="flex flex-col items-center text-center gap-2">
                  <div style={{ color: primary }}><FeatureIcon name={f.icon} /></div>
                  <EditableText
                    value={f.title}
                    onChange={v => {
                      const features = [...c.features!]
                      features[i] = { ...features[i], title: v }
                      onUpdateContent({ features })
                    }}
                    className="font-semibold text-sm text-gray-900 block"
                  />
                  <EditableText
                    value={f.description}
                    onChange={v => {
                      const features = [...c.features!]
                      features[i] = { ...features[i], description: v }
                      onUpdateContent({ features })
                    }}
                    multiline
                    className="text-xs text-gray-500 block"
                  />
                </div>
              ))}
            </div>
          </section>
        </SectionOutline>
      )}

      {/* About */}
      {c.about?.title && (
        <SectionOutline sectionId="about" label="About" selected={selectedSection === 'about'} onSelect={onSelectSection}>
          <section className="bg-gray-50 py-12">
            <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row gap-8 items-center">
              {c.about.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.about.imageUrl} alt="" className="w-full md:w-1/2 rounded-xl object-cover aspect-video" />
              )}
              <div className={c.about.imageUrl ? 'md:w-1/2' : 'max-w-2xl mx-auto text-center w-full'}>
                <EditableText
                  as="h2"
                  value={c.about.title ?? ''}
                  onChange={v => onUpdateContent({ about: { ...c.about, title: v } })}
                  className="text-2xl font-bold text-gray-900 mb-3 block"
                />
                <EditableText
                  value={c.about.text ?? ''}
                  onChange={v => onUpdateContent({ about: { ...c.about, text: v } })}
                  multiline
                  className="text-gray-600 leading-relaxed block"
                />
              </div>
            </div>
          </section>
        </SectionOutline>
      )}

      {/* Footer preview */}
      <SectionOutline sectionId="footer" label="Footer" selected={selectedSection === 'footer'} onSelect={onSelectSection}>
        <footer className="bg-white border-t py-8">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
            <p className="font-bold text-lg mb-1" style={{ color: primary }}>{config.businessName}</p>
            {config.tagline && <p className="mb-2">{config.tagline}</p>}
            {c.footer?.contactEmail && (
              <EditableText
                value={c.footer.contactEmail}
                onChange={v => onUpdateContent({ footer: { ...c.footer, contactEmail: v } })}
                className="block"
              />
            )}
            <p className="text-xs text-gray-400 mt-4">&copy; {new Date().getFullYear()} {config.businessName}</p>
          </div>
        </footer>
      </SectionOutline>
    </div>
  )
}
