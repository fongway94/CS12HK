import { useEffect, useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { useCartStore } from "../../stores/useCartStore"
import { useAppStore } from "../../stores/useAppStore"
import { useAuthStore } from "../../stores/useAuthStore"
import { getDBClient } from "../../lib/db/client"
import { GiftTier, Coupon } from "../../lib/db/types"
import { calcSubtotal, getGiftTier, calcCouponDiscount, calcShipping } from "../../lib/promotions/engine"
import { formatPrice } from "../../lib/currency"
import { showToast } from "../../components/ui/Toast"

export function CartPage() {
  const { items, updateQty, removeItem, couponCode, setCoupon, clear } = useCartStore()
  const { currency, lang } = useAppStore()
  const { user } = useAuthStore()
  const [giftTiers, setGiftTiers] = useState<GiftTier[]>([])
  const [couponInput, setCouponInput] = useState(couponCode||"")
  const [couponObj, setCouponObj] = useState<Coupon|null>(null)
  const [couponMsg, setCouponMsg] = useState("")

  useEffect(()=>{ getDBClient().getGiftTiers().then(setGiftTiers)
    if(couponCode){ getDBClient().getCouponByCode(couponCode).then(c=>{ if(c) setCouponObj(c) }) }
  },[])

  const subtotal = useMemo(()=>{
    return calcSubtotal(items.map(i=>({ priceHKD: i.product.price_hkd, priceUSD: i.product.price_usd, qty: i.qty })))
  },[items])

  const giftTier = getGiftTier(subtotal.hkd, subtotal.usd, giftTiers, currency)

  const couponCalc = useMemo(()=>{
    return calcCouponDiscount(subtotal.hkd, subtotal.usd, couponObj, currency, user?.isFirstOrder ?? true)
  },[subtotal, couponObj, currency, user])

  const shipping = calcShipping(subtotal.hkd - couponCalc.discountHKD, subtotal.usd - couponCalc.discountUSD, currency)

  const totalHKD = subtotal.hkd - couponCalc.discountHKD + shipping.shippingHKD
  const totalUSD = subtotal.usd - couponCalc.discountUSD + shipping.shippingUSD

  const applyCoupon = async () => {
    const db = getDBClient()
    const c = await db.getCouponByCode(couponInput)
    if(!c){
      setCouponMsg(lang==="zh"?"優惠碼無效":"Invalid code")
      showToast("error", lang==="zh"?"優惠碼無效":"Invalid coupon code")
      return
    }
    setCouponObj(c)
    setCoupon(c.code)
    setCouponMsg(lang==="zh"?`已套用 ${c.code}`:`Applied ${c.code}`)
    showToast("success", lang==="zh"?`優惠碼 ${c.code} 已套用！`:`Coupon ${c.code} applied!`)
  }

  if(items.length===0) return (
    <main className="w-[min(calc(100%-24px),1440px)] mx-auto py-20 text-center">
      <div className="max-w-md mx-auto">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#FBF6F0] flex items-center justify-center">
          <span className="text-[32px]">🛒</span>
        </div>
        <h1 className="font-serif text-[32px] mb-3">{lang==="zh"?"您的購物車裡還沒有任何商品":"Your cart is empty"}</h1>
        <p className="text-[13px] text-[#8F8881] mb-8">{lang==="zh"?"開始探索我們的敏感肌修護產品":"Explore our sensitive skin care products"}</p>
        <div className="flex gap-3 justify-center">
          <Link to="/exclusive" className="inline-flex bg-[var(--brand-accent)] text-white px-8 h-[44px] items-center text-[11px] tracking-[0.18em] uppercase">{lang==="zh"?"官網限定":"Exclusive"}</Link>
          <Link to="/shop" className="inline-flex border border-[var(--brand-accent)] text-[var(--brand-accent)] px-8 h-[44px] items-center text-[11px] tracking-[0.18em] uppercase">{lang==="zh"?"全部產品":"All Products"}</Link>
        </div>
      </div>
    </main>
  )

  return (
    <main className="w-[min(calc(100%-24px),1440px)] mx-auto py-6 md:py-8 grid grid-cols-1 md:grid-cols-[1fr_360px] gap-6 md:gap-10">
      <section>
        <h1 className="font-serif text-[32px] mb-6">{lang==="zh"?"購物車":"Cart"} ({items.length})</h1>
        <div className="border-t border-[#ECE6DF]">
          {items.map((item, idx) => {
            const { product, qty, variant, variantId } = item
            const displayProduct = variant || product
            const displayName = lang==="zh"?displayProduct.name_zh:displayProduct.name_en
            const displayPriceHKD = displayProduct.price_hkd
            const displayPriceUSD = displayProduct.price_usd
            const displayImages = variant?.image ? [variant.image, ...product.images.slice(1)] : product.images
            const displaySKU = variant?.sku || product.sku
            const uniqueKey = `${product.id}-${variantId || "base"}`
            return (
              <div key={uniqueKey} className="py-6 border-b border-[#F2ECE4] flex gap-4">
                <Link to={`/product/${product.slug}`} className="w-24 h-24 bg-[#FBF6F0] border border-[#F2ECE4]"><img src={displayImages[0]} className="w-full h-full object-cover" alt=""/></Link>
                <div className="flex-1">
                  <Link to={`/product/${product.slug}`} className="font-serif text-[18px] leading-tight block">{displayName}</Link>
                  {variant && (
                    <p className="text-[10px] text-[#8F8881] mt-0.5">{lang==="zh"?"規格":"Variant"}: {lang==="zh"?variant.name_zh:variant.name_en}</p>
                  )}
                  <p className="text-[11px] text-[#8F8881] mt-1">{product.series} • {formatPrice(displayPriceHKD, displayPriceUSD, currency)}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <button onClick={()=>updateQty(product.id, qty-1, variantId)} className="w-7 h-7 border border-[#ECE6DF]">-</button>
                    <span className="w-8 text-center text-[13px]">{qty}</span>
                    <button onClick={()=>updateQty(product.id, qty+1, variantId)} className="w-7 h-7 border border-[#ECE6DF]">+</button>
                    <button onClick={()=>{removeItem(product.id, variantId); showToast("info", lang==="zh"?`已移除：${displayName}`:`Removed: ${displayName}`)}} className="ml-4 text-[11px] underline text-[#8F8881]">{lang==="zh"?"移除":"Remove"}</button>
                  </div>
                </div>
                <div className="text-right"><span className="text-[14px] font-medium">{formatPrice(displayPriceHKD*qty, displayPriceUSD*qty, currency)}</span></div>
              </div>
            )
          })}
        </div>

        {giftTier ? (
          <div className="mt-6 bg-[var(--brand-accent)] text-white p-4 text-[12px]">
            {lang==="zh"
              ? `🎉 已符合 ${giftTier.label_zh} 禮遇！將獲贈 ${giftTier.gifts.reduce((a,b)=>a+b.qty,0)} 件禮品 (價值 HK$${giftTier.giftValueHKD})`
              : `🎉 You've unlocked ${giftTier.label_en}! Receive ${giftTier.gifts.reduce((a,b)=>a+b.qty,0)} complimentary gifts (value HK$${giftTier.giftValueHKD})`
            }
          </div>
        ) : (
          <div className="mt-6 border border-dashed border-[#ECE6DF] p-4 text-[12px] text-[#8F8881]">
            {subtotal.hkd >= 2000
              ? (lang==="zh"?`再買 HK$${3000-subtotal.hkd} 即享10件贈品禮遇`:`Add HK$${3000-subtotal.hkd} for 10-gift tier`)
              : (lang==="zh"?`再買 HK$${2000-subtotal.hkd} 即享6件贈品禮遇`:`Add HK$${2000-subtotal.hkd} for 6-gift tier`)
            }
            <div className="mt-2 h-2 bg-[#F2ECE4] rounded overflow-hidden"><div className="h-2 bg-[var(--brand-accent)] rounded transition-all duration-500" style={{width: `${Math.min(100, subtotal.hkd/3000*100)}%`}}></div></div>
          </div>
        )}
      </section>

      <aside className="bg-white border border-[#ECE6DF] p-6 h-fit md:sticky md:top-[100px]">
        <h3 className="text-[12px] tracking-[0.18em] uppercase font-semibold mb-4">{lang==="zh"?"訂單摘要":"Order Summary"}</h3>
        <div className="space-y-3 text-[13px]">
          <div className="flex justify-between"><span>{lang==="zh"?"小計":"Subtotal"}</span><span>{formatPrice(subtotal.hkd, subtotal.usd, currency)}</span></div>
          {couponCalc.valid && couponCalc.discountHKD>0 && <div className="flex justify-between text-green-700"><span>{lang==="zh"?"折扣":"Discount"} {couponObj?.code}</span><span>-{formatPrice(couponCalc.discountHKD, couponCalc.discountUSD, currency)}</span></div>}
          <div className="flex justify-between"><span>{lang==="zh"?"運費":"Shipping"}</span><span>{shipping.free ? (lang==="zh"?"免費":"Free") : formatPrice(shipping.shippingHKD, shipping.shippingUSD, currency)}</span></div>
          {!shipping.free && <p className="text-[11px] text-[#8F8881]">{lang==="zh"?`滿 HK$800 免費送貨，還差 HK$${800-subtotal.hkd}`:`Free shipping over HK$800, add HK$${800-subtotal.hkd} more`}</p>}
          <div className="border-t border-[#ECE6DF] pt-3 flex justify-between font-semibold text-[16px]"><span>{lang==="zh"?"合計":"Total"}</span><span>{formatPrice(totalHKD, totalUSD, currency)}</span></div>
        </div>

        <div className="mt-6">
          <label className="text-[10px] tracking-[0.18em] uppercase font-semibold">{lang==="zh"?"優惠碼":"Coupon Code"}</label>
          <div className="flex mt-2">
            <input value={couponInput} onChange={e=>setCouponInput(e.target.value.toUpperCase())} placeholder="NEWCS12" className="flex-1 border border-[#ECE6DF] px-3 h-9 text-[12px] uppercase"/>
            <button onClick={applyCoupon} className="bg-[var(--brand-accent)] text-white px-4 text-[11px] uppercase">{lang==="zh"?"套用":"Apply"}</button>
          </div>
          {couponMsg && <p className="text-[11px] mt-2 text-[#8F8881]">{couponMsg} {!couponCalc.valid && `(${couponCalc.reason})`}</p>}
        </div>

        <Link to="/checkout" className="mt-6 w-full bg-[var(--brand-accent)] text-white h-[48px] flex items-center justify-center text-[12px] tracking-[0.18em] uppercase">{lang==="zh"?"去結帳":"Checkout"}</Link>
        <button onClick={()=>{clear(); setCoupon(null); setCouponObj(null); showToast("info", lang==="zh"?"購物車已清空":"Cart cleared")}} className="mt-2 w-full border border-[var(--brand-accent)] text-[var(--brand-accent)] h-[42px] text-[11px] uppercase">{lang==="zh"?"清空購物車":"Clear Cart"}</button>

        <div className="mt-6 border-t border-[#F2ECE4] pt-4 text-[11px] text-[#8F8881] leading-relaxed">
          <p>{lang==="zh"?`• 積分回贈：本次可獲 ${Math.floor(subtotal.hkd)} 積分`:`• Points earned: ${Math.floor(subtotal.hkd)} points this order`}</p>
          <p>{lang==="zh"?"• 信用卡 / FPS / PayMe / Apple Pay 支援":"• Credit Card / FPS / PayMe / Apple Pay supported"}</p>
        </div>
      </aside>
    </main>
  )
}
