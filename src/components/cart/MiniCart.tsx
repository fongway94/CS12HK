import { Link } from "react-router-dom"
import { useCartStore } from "../../stores/useCartStore"
import { useAppStore } from "../../stores/useAppStore"
import { formatPrice } from "../../lib/currency"
import { X, ShoppingBag } from "lucide-react"

interface MiniCartProps {
  isOpen: boolean
  onClose: () => void
}

export function MiniCart({ isOpen, onClose }: MiniCartProps) {
  const { items, removeItem, updateQty } = useCartStore()
  const { currency, lang } = useAppStore()

  if (!isOpen) return null

  const count = items.reduce((a, b) => a + b.qty, 0)
  const subtotalHKD = items.reduce((a, b) => a + b.product.price_hkd * b.qty, 0)

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-[100]" onClick={onClose} />
      
      {/* Mini cart panel */}
      <div className="fixed top-0 right-0 w-[380px] max-w-[calc(100vw-24px)] h-full bg-white z-[101] shadow-2xl flex flex-col slide-down">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ECE6DF]">
          <h3 className="text-[12px] tracking-[0.18em] uppercase font-semibold flex items-center gap-2">
            <ShoppingBag size={16} />
            {lang==="zh"?"購物車":"Cart"} ({count})
          </h3>
          <button onClick={onClose} className="text-[#8F8881] hover:text-[#111] transition"><X size={18}/></button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-8 text-center">
              <ShoppingBag size={40} className="mx-auto text-[#ECE6DF] mb-4"/>
              <p className="text-[13px] text-[#8F8881]">{lang==="zh"?"購物車是空的":"Your cart is empty"}</p>
              <Link to="/shop" onClick={onClose} className="mt-4 inline-flex bg-[#111] text-white px-6 h-9 items-center text-[10px] tracking-[0.18em] uppercase">
                {lang==="zh"?"去選購":"Go Shopping"}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#F2ECE4]">
              {items.map(({ product, qty }) => (
                <div key={product.id} className="px-6 py-4 flex gap-4">
                  <Link to={`/product/${product.slug}`} onClick={onClose} className="w-16 h-16 bg-[#FBF6F0] border border-[#F2ECE4] shrink-0">
                    <img src={product.images[0]} className="w-full h-full object-cover" alt=""/>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/product/${product.slug}`} onClick={onClose} className="text-[12px] leading-tight line-clamp-2 block">
                      {lang==="zh"?product.name_zh:product.name_en}
                    </Link>
                    <p className="text-[10px] text-[#8F8881] mt-1">{product.series} • {formatPrice(product.price_hkd, product.price_usd, currency)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={()=>updateQty(product.id, qty-1)} className="w-6 h-6 border border-[#ECE6DF] text-[11px] flex items-center justify-center">-</button>
                      <span className="text-[11px] w-6 text-center">{qty}</span>
                      <button onClick={()=>updateQty(product.id, qty+1)} className="w-6 h-6 border border-[#ECE6DF] text-[11px] flex items-center justify-center">+</button>
                      <button onClick={()=>removeItem(product.id)} className="ml-auto text-[10px] underline text-[#8F8881]">{lang==="zh"?"移除":"Remove"}</button>
                    </div>
                  </div>
                  <div className="text-[12px] font-medium shrink-0">
                    {formatPrice(product.price_hkd * qty, product.price_usd * qty, currency)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-[#ECE6DF] px-6 py-4 space-y-3">
            <div className="flex justify-between text-[13px]">
              <span>{lang==="zh"?"小計":"Subtotal"}</span>
              <span className="font-medium">{formatPrice(subtotalHKD, subtotalHKD * 0.128, currency)}</span>
            </div>
            <p className="text-[10px] text-[#8F8881]">
              {subtotalHKD >= 800
                ? (lang==="zh"?"✓ 已達免運門檻":"✓ Free shipping unlocked")
                : (lang==="zh"?`再買 HK$${800-subtotalHKD} 即免運費`:`Add HK$${800-subtotalHKD} for free shipping`)
              }
            </p>
            <Link to="/cart" onClick={onClose} className="block w-full bg-[#111] text-white h-[42px] flex items-center justify-center text-[11px] tracking-[0.18em] uppercase">
              {lang==="zh"?"查看購物車":"View Cart"}
            </Link>
            <Link to="/checkout" onClick={onClose} className="block w-full border border-[#111] text-[#111] h-[38px] flex items-center justify-center text-[11px] tracking-[0.18em] uppercase hover:bg-[#111] hover:text-white transition">
              {lang==="zh"?"結帳":"Checkout"}
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
