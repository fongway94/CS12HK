import { create } from "zustand"
import { Product, ProductVariant } from "../lib/db/types"

export interface CartItem {
  product: Product
  qty: number
  variant?: ProductVariant
  variantId?: string
}

interface CartState {
  items: CartItem[]
  couponCode: string | null
  addItem: (product: Product, qty?: number, variant?: ProductVariant) => void
  removeItem: (productId: string, variantId?: string) => void
  updateQty: (productId: string, qty: number, variantId?: string) => void
  clear: () => void
  setCoupon: (code: string | null) => void
}

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem("cs12_cart")
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function saveCart(items: CartItem[]) {
  try { localStorage.setItem("cs12_cart", JSON.stringify(items)) } catch {}
}

function loadCoupon() {
  try { return localStorage.getItem("cs12_coupon") } catch { return null }
}

export const useCartStore = create<CartState>((set, get) => ({
  items: loadCart(),
  couponCode: loadCoupon(),

  addItem: (product, qty = 1, variant) => {
    const items = [...get().items]
    const variantId = variant?.id
    const existing = items.find(i => i.product.id === product.id && i.variantId === variantId)
    if (existing) existing.qty += qty
    else items.push({ product, qty, variant, variantId })
    saveCart(items)
    set({ items })
  },
  removeItem: (productId, variantId) => {
    const items = get().items.filter(i => !(i.product.id === productId && i.variantId === variantId))
    saveCart(items)
    set({ items })
  },
  updateQty: (productId, qty, variantId) => {
    if (qty <= 0) { get().removeItem(productId, variantId); return }
    const items = get().items.map(i => i.product.id === productId && i.variantId === variantId ? { ...i, qty } : i)
    saveCart(items)
    set({ items })
  },
  clear: () => {
    saveCart([])
    localStorage.removeItem("cs12_coupon")
    set({ items: [], couponCode: null })
  },
  setCoupon: (code) => {
    if (code) localStorage.setItem("cs12_coupon", code)
    else localStorage.removeItem("cs12_coupon")
    set({ couponCode: code })
  }
}))
