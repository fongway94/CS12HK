import { create } from "zustand"
import { Currency } from "../lib/db/types"

interface AppState {
  currency: Currency
  lang: "zh" | "en"
  setCurrency: (c: Currency) => void
  setLang: (l: "zh" | "en") => void
}

export const useAppStore = create<AppState>((set) => ({
  currency: (localStorage.getItem("cs12_currency") as Currency) || "HKD",
  lang: (localStorage.getItem("cs12-language") as any) || "zh",
  setCurrency: (c) => { localStorage.setItem("cs12_currency", c); set({ currency: c }) },
  setLang: (l) => { localStorage.setItem("cs12-language", l); set({ lang: l }); document.body.dataset.lang = l }
}))
