import { create } from "zustand"
import { Currency } from "../lib/db/types"

interface AppState {
  currency: Currency
  lang: "zh" | "en"
  setCurrency: (c: Currency) => void
  setLang: (l: "zh" | "en") => void
}

function isBrowser() {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  } catch {
    return false
  }
}

function loadStoredValue<T extends string>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback
  try {
    return (localStorage.getItem(key) as T | null) || fallback
  } catch {
    return fallback
  }
}

function saveStoredValue(key: string, value: string) {
  if (!isBrowser()) return
  try { localStorage.setItem(key, value) } catch {}
}

function setBodyLang(lang: "zh" | "en") {
  if (typeof document !== "undefined") document.body.dataset.lang = lang
}

export const useAppStore = create<AppState>((set) => ({
  currency: loadStoredValue<Currency>("cs12_currency", "HKD"),
  lang: loadStoredValue<"zh" | "en">("cs12-language", "zh"),
  setCurrency: (c) => { saveStoredValue("cs12_currency", c); set({ currency: c }) },
  setLang: (l) => { saveStoredValue("cs12-language", l); set({ lang: l }); setBodyLang(l) }
}))
