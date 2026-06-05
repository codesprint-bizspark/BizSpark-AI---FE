export type FeatureIcon = 'truck' | 'refresh' | 'shield' | 'headphones' | 'sparkles'

export type WebsiteEditorState = {
  businessName: string
  tagline: string
  primaryColor: string
  secondaryColor: string
  logoUrl?: string | null
  faviconUrl?: string | null
  content: {
    announcement?: { enabled: boolean; text: string; bgColor?: string; textColor?: string }
    hero?: { title?: string; subtitle?: string; imageUrl?: string; ctaText?: string; ctaLink?: string }
    features?: Array<{ icon: FeatureIcon | string; title: string; description: string }>
    about?: { title?: string; text?: string; imageUrl?: string }
    footer?: {
      contactEmail?: string
      contactPhone?: string
      address?: string
      socialLinks?: { instagram?: string; facebook?: string; twitter?: string; tiktok?: string }
    }
    seo?: { metaDescription?: string; keywords?: string; ogImageUrl?: string }
  }
}

export type SectionId =
  | 'branding'
  | 'announcement'
  | 'hero'
  | 'features'
  | 'about'
  | 'footer'
  | 'seo'

export const FEATURE_ICONS: FeatureIcon[] = ['truck', 'refresh', 'shield', 'headphones', 'sparkles']

export const SECTION_REGISTRY: Array<{
  id: SectionId
  label: string
  toggleable: boolean
}> = [
  { id: 'branding', label: 'Branding', toggleable: false },
  { id: 'announcement', label: 'Announcement', toggleable: true },
  { id: 'hero', label: 'Hero', toggleable: false },
  { id: 'features', label: 'Features', toggleable: true },
  { id: 'about', label: 'About', toggleable: true },
  { id: 'footer', label: 'Footer & Contact', toggleable: false },
  { id: 'seo', label: 'SEO', toggleable: false },
]

export function defaultFeature(index: number): { icon: FeatureIcon; title: string; description: string } {
  const defaults = [
    { icon: 'sparkles' as FeatureIcon, title: 'Quality First', description: 'We never compromise on quality.' },
    { icon: 'headphones' as FeatureIcon, title: 'Friendly Support', description: 'Our team is here to help you.' },
    { icon: 'truck' as FeatureIcon, title: 'Fast Delivery', description: 'Quick and reliable service.' },
    { icon: 'shield' as FeatureIcon, title: 'Trusted', description: 'Built on trust and reliability.' },
  ]
  return defaults[index] ?? defaults[0]
}

export function normalizeEditorState(raw: Record<string, unknown>, businessNameFallback = 'My Store'): WebsiteEditorState {
  const content = (raw.content ?? {}) as WebsiteEditorState['content']
  return {
    businessName: (raw.businessName as string) ?? businessNameFallback,
    tagline: (raw.tagline as string) ?? '',
    primaryColor: (raw.primaryColor as string) ?? '#2563eb',
    secondaryColor: (raw.secondaryColor as string) ?? '#1e40af',
    logoUrl: (raw.logoUrl as string | null) ?? null,
    faviconUrl: (raw.faviconUrl as string | null) ?? null,
    content: {
      announcement: content.announcement ?? { enabled: false, text: '' },
      hero: content.hero ?? { title: '', subtitle: '', ctaText: 'Shop Now', ctaLink: '/shop' },
      features: content.features ?? [],
      about: content.about,
      footer: content.footer ?? {},
      seo: content.seo ?? {},
    },
  }
}

export function toSavePayload(state: WebsiteEditorState): Record<string, unknown> {
  const c = state.content
  return {
    businessName: state.businessName,
    tagline: state.tagline || null,
    primaryColor: state.primaryColor,
    secondaryColor: state.secondaryColor,
    logoUrl: state.logoUrl ?? null,
    faviconUrl: state.faviconUrl ?? null,
    content: {
      announcement: c.announcement?.enabled
        ? { enabled: true, text: c.announcement.text, bgColor: c.announcement.bgColor, textColor: c.announcement.textColor }
        : { enabled: false, text: c.announcement?.text ?? '' },
      hero: {
        title: c.hero?.title,
        subtitle: c.hero?.subtitle,
        imageUrl: c.hero?.imageUrl || undefined,
        ctaText: c.hero?.ctaText,
        ctaLink: c.hero?.ctaLink,
      },
      features: c.features?.length ? c.features : undefined,
      about: c.about?.title || c.about?.text || c.about?.imageUrl
        ? { title: c.about.title, text: c.about.text, imageUrl: c.about.imageUrl || undefined }
        : undefined,
      footer: c.footer,
      seo: c.seo,
    },
  }
}
