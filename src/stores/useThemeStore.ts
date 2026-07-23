import { create } from "zustand"
import { SiteSettings, DEFAULT_SITE_SETTINGS } from "../lib/db/types"
import { getDBClient } from "../lib/db/client"

interface ThemeState {
  settings: SiteSettings
  isLoaded: boolean
  loadSettings: () => Promise<void>
  applyTheme: () => void
}

function applyCSS(settings: SiteSettings) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  root.style.setProperty("--bg", settings.backgroundColor)
  root.style.setProperty("--paper", settings.cardColor)
  root.style.setProperty("--ink", settings.textColor)
  root.style.setProperty("--muted", settings.mutedTextColor)
  root.style.setProperty("--line", settings.borderColor)
  root.style.setProperty("--primary", settings.primaryColor)
  root.style.setProperty("--secondary", settings.secondaryColor)
  root.style.setProperty("--accent", settings.accentColor)
  root.style.setProperty("--font-base", `${settings.fontSizeBase}px`)
  root.style.setProperty("--font-scale", String(settings.fontSizeScale))

  const sansFonts = `"${settings.fontFamily}", "Noto Sans TC", system-ui, sans-serif`
  const serifFonts = `"${settings.fontFamilySerif}", "Noto Serif TC", Georgia, serif`
  root.style.setProperty("--font-sans", sansFonts)
  root.style.setProperty("--font-serif", serifFonts)

  document.body.style.fontFamily = sansFonts
  document.body.style.fontSize = `${settings.fontSizeBase}px`
  document.body.style.background = settings.backgroundColor
  document.body.style.color = settings.textColor
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  settings: DEFAULT_SITE_SETTINGS,
  isLoaded: false,

  loadSettings: async () => {
    try {
      const db = getDBClient()
      const s = await db.getSiteSettings()
      set({ settings: s, isLoaded: true })
      applyCSS(s)
    } catch {
      set({ isLoaded: true })
      applyCSS(DEFAULT_SITE_SETTINGS)
    }
  },

  applyTheme: () => {
    applyCSS(get().settings)
  }
}))
