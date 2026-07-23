import { create } from "zustand"
import { Product } from "../lib/db/types"

export interface CartItem {
  product: Product
  qty: number
}

interface CartState {
  items: CartItem[]
  couponCode: string | null
  addItem: (product: Product, qty?: number) => void
  removeItem: (productId: string) => void
  updateQty: (productId: string, qty: number) => void
  clear: () => void
  setCoupon: (code: string | null) => void
}

function isBrowser() {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  } catch {
    return false
  }
}

function normalizeItems(items: CartItem[]) {
  return items
    .map(item => ({ ...item, qty: Math.min(Math.max(0, item.qty), Math.max(0, item.product.stock)) }))
    .filter(item => item.qty > 0)
}

function loadCart(): CartItem[] {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem("cs12_cart")
    if (raw) return normalizeItems(JSON.parse(raw))
  } catch {}
  return []
}

function saveCart(items: CartItem[]) {
  if (!isBrowser()) return
  try { localStorage.setItem("cs12_cart", JSON.stringify(normalizeItems(items))) } catch {}
}

function loadCoupon() {
  if (!isBrowser()) return null
  try { return localStorage.getItem("cs12_coupon") } catch { return null }
}

export const useCartStore = create<CartState>((set, get) => ({
  items: loadCart(),
  couponCode: loadCoupon(),

  addItem: (product, qty = 1) => {
    if (product.stock <= 0 || qty <= 0) return
    const items = [...get().items]
    const existing = items.find(i => i.product.id === product.id)
    if (existing) {
      existing.product = product
      existing.qty = Math.min(product.stock, existing.qty + qty)
    }
    else items.push({ product, qty: Math.min(product.stock, qty) })
    const normalized = normalizeItems(items)
    saveCart(normalized)
    set({ items: normalized })
  },
  removeItem: (productId) => {
    const items = get().items.filter(i => i.product.id !== productId)
    saveCart(items)
    set({ items })
  },
  updateQty: (productId, qty) => {
    if (qty <= 0) { get().removeItem(productId); return }
    const items = get().items.map(i => i.product.id === productId ? { ...i, qty: Math.min(qty, Math.max(0, i.product.stock)) } : i)
    const normalized = normalizeItems(items)
    saveCart(normalized)
    set({ items: normalized })
  },
  clear: () => { saveCart([]); set({ items: [], couponCode: null }); if (isBrowser()) localStorage.removeItem("cs12_coupon") },
  setCoupon: (code) => {
    if (!isBrowser()) { set({ couponCode: code }); return }
    if (code) localStorage.setItem("cs12_coupon", code)
    else localStorage.removeItem("cs12_coupon")
    set({ couponCode: code })
  }
}))
