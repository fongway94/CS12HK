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

  addItem: (product, qty = 1) => {
    const items = [...get().items]
    const existing = items.find(i => i.product.id === product.id)
    if (existing) existing.qty += qty
    else items.push({ product, qty })
    saveCart(items)
    set({ items })
  },
  removeItem: (productId) => {
    const items = get().items.filter(i => i.product.id !== productId)
    saveCart(items)
    set({ items })
  },
  updateQty: (productId, qty) => {
    if (qty <= 0) { get().removeItem(productId); return }
    const items = get().items.map(i => i.product.id === productId ? { ...i, qty } : i)
    saveCart(items)
    set({ items })
  },
  clear: () => { saveCart([]); set({ items: [] }); localStorage.removeItem("cs12_coupon") },
  setCoupon: (code) => {
    if (code) localStorage.setItem("cs12_coupon", code)
    else localStorage.removeItem("cs12_coupon")
    set({ couponCode: code })
  }
}))
