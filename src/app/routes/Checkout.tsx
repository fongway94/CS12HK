import { useState, useMemo, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useCartStore } from "../../stores/useCartStore"
import { useAppStore } from "../../stores/useAppStore"
import { useAuthStore } from "../../stores/useAuthStore"
import { getDBClient } from "../../lib/db/client"
import { GiftTier, Coupon, Order } from "../../lib/db/types"
import { calcSubtotal, getGiftTier, calcCouponDiscount, calcShipping } from "../../lib/promotions/engine"
import { calcPointsEarned, getTier } from "../../lib/points/engine"
import { formatPrice } from "../../lib/currency"

export function CheckoutPage() {
  const { items, couponCode, clear } = useCartStore()
  const { currency, lang } = useAppStore()
  const { user } = useAuthStore()
  const nav = useNavigate()
  const [giftTiers, setGiftTiers] = useState<GiftTier[]>([])
  const [couponObj, setCouponObj] = useState<Coupon|null>(null)
  const [address, setAddress] = useState({ name:"", phone:"", address:"", district:"香港島", region:"HKD" })
  const [usePoints, setUsePoints] = useState(0)

  useEffect(()=>{
    getDBClient().getGiftTiers().then(setGiftTiers)
    if(couponCode) getDBClient().getCouponByCode(couponCode).then(c=> c && setCouponObj(c))
  },[])

  const subtotal = useMemo(()=> calcSubtotal(items.map(i=>({ priceHKD: i.product.price_hkd, priceUSD: i.product.price_usd, qty: i.qty }))),[items])
  const giftTier = getGiftTier(subtotal.hkd, subtotal.usd, giftTiers, currency)
  const couponCalc = useMemo(()=> calcCouponDiscount(subtotal.hkd, subtotal.usd, couponObj, currency, user?.isFirstOrder ?? true),[subtotal, couponObj, currency, user])
  const shipping = calcShipping(subtotal.hkd - couponCalc.discountHKD, subtotal.usd - couponCalc.discountUSD, currency)
  const pointsDiscountHKD = usePoints / 100
  const totalHKD = subtotal.hkd - couponCalc.discountHKD - pointsDiscountHKD + shipping.shippingHKD
  const totalUSD = subtotal.usd - couponCalc.discountUSD - (pointsDiscountHKD*0.128) + shipping.shippingUSD
  const pointsEarned = calcPointsEarned(totalHKD)

  const placeOrder = async () => {
    if(!user){ nav("/login"); return }
    if(items.length===0) return
    const order: Order = {
      id: "ORD-" + Date.now(),
      userId: user.id,
      items: items.map(i=>({ productId: i.product.id, qty: i.qty, priceHKDAtPurchase: i.product.price_hkd, priceUSDAtPurchase: i.product.price_usd })),
      subtotalHKD: subtotal.hkd,
      subtotalUSD: subtotal.usd,
      discountHKD: couponCalc.discountHKD + pointsDiscountHKD,
      discountUSD: couponCalc.discountUSD + pointsDiscountHKD*0.128,
      shippingHKD: shipping.shippingHKD,
      shippingUSD: shipping.shippingUSD,
      totalHKD,
      totalUSD,
      currency,
      couponCode: couponObj?.code,
      giftTier: giftTier ? (giftTier.thresholdHKD>=3000 ? "tier2_3000":"tier1_2000") : null,
      gifts: giftTier ? giftTier.gifts.map(g=>`${g.name_zh} x${g.qty}`) : [],
      status: "paid",
      pointsEarned,
      pointsUsed: usePoints,
      shippingAddress: address,
      createdAt: new Date().toISOString()
    }
    const db = getDBClient()
    await db.createOrder(order)
    await db.updateUser(user.id, {
      totalSpentHKD: user.totalSpentHKD + totalHKD,
      totalOrders: user.totalOrders + 1,
      points: user.points - usePoints + pointsEarned,
      tier: getTier(user.totalSpentHKD + totalHKD),
      isFirstOrder: false,
      pointsHistory: [...(user.pointsHistory||[]), { id:"tx_"+Date.now(), userId:user.id, amount: pointsEarned, reason:`Order ${order.id}`, orderId: order.id, createdAt: new Date().toISOString() }]
    })
    if(couponObj){
      await db.updateCoupon(couponObj.code, { usedCount: couponObj.usedCount + 1 })
    }
    clear()
    alert(lang==="zh"?`下單成功！訂單 ${order.id} 已付款。獲得 ${pointsEarned} 積分。`: `Order ${order.id} placed! Earned ${pointsEarned} points.`)
    nav("/account")
  }

  if(items.length===0) return <div className="py-20 text-center">購物車空 / Cart empty</div>

  return (
    <main className="w-[min(calc(100%-48px),1440px)] mx-auto py-8 grid md:grid-cols-2 gap-10">
      <section className="bg-white border border-[#ECE6DF] p-6">
        <h2 className="font-serif text-[24px] mb-6">{lang==="zh"?"配送資訊":"Shipping Information"}</h2>
        <div className="space-y-4 text-[13px]">
          <input placeholder="收件人姓名 Name *" value={address.name} onChange={e=>setAddress({...address,name:e.target.value})} className="w-full border border-[#ECE6DF] h-11 px-3"/>
          <input placeholder="電話 Phone *" value={address.phone} onChange={e=>setAddress({...address,phone:e.target.value})} className="w-full border border-[#ECE6DF] h-11 px-3"/>
          <input placeholder="地址 Address *" value={address.address} onChange={e=>setAddress({...address,address:e.target.value})} className="w-full border border-[#ECE6DF] h-11 px-3"/>
          <select value={address.district} onChange={e=>setAddress({...address,district:e.target.value})} className="w-full border border-[#ECE6DF] h-11 px-3">
            <option>香港島</option><option>九龍</option><option>新界</option><option>離島</option>
          </select>
          <div className="pt-4 border-t border-[#F2ECE4]">
            <h3 className="text-[11px] uppercase tracking-[0.14em] font-semibold mb-2">支付方式</h3>
            <p className="text-[11px] text-[#8F8881]">Cloudflare Payments Ready: 信用卡 Credit Card / FPS 轉數快 / PayMe / Apple Pay / Google Pay<br/>正式接通 Stripe / PayPal 後可直接收款 (此為模擬 checkout)</p>
          </div>
          {user && (
            <div className="pt-4 border-t border-[#F2ECE4]">
              <h3 className="text-[11px] uppercase tracking-[0.14em] font-semibold mb-2">積分抵扣 Points ({user.points} 可用)</h3>
              <div className="flex gap-2">
                <input type="number" min={0} max={user.points} value={usePoints} onChange={e=>setUsePoints(Math.min(user.points, parseInt(e.target.value)||0))} className="border border-[#ECE6DF] h-9 px-2 w-32"/>
                <span className="text-[11px] text-[#8F8881] flex items-center">= HK${(usePoints/100).toFixed(0)} 抵扣</span>
              </div>
            </div>
          )}
        </div>
      </section>
      <section className="bg-white border border-[#ECE6DF] p-6 h-fit sticky top-[100px]">
        <h3 className="text-[12px] tracking-[0.18em] uppercase font-semibold mb-4">{lang==="zh"?"訂單摘要":"Order Summary"}</h3>
        <div className="space-y-2 text-[13px]">
          {items.map(i=><div key={i.product.id} className="flex justify-between text-[#5C5651]"><span>{lang==="zh"?i.product.name_zh:i.product.name_en} x{i.qty}</span><span>{formatPrice(i.product.price_hkd*i.qty, i.product.price_usd*i.qty,currency)}</span></div>)}
          <div className="border-t border-[#F2ECE4] pt-3 space-y-2">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal.hkd, subtotal.usd, currency)}</span></div>
            {couponCalc.valid && <div className="flex justify-between text-green-700"><span>Discount {couponObj?.code}</span><span>-{formatPrice(couponCalc.discountHKD, couponCalc.discountUSD,currency)}</span></div>}
            {usePoints>0 && <div className="flex justify-between text-green-700"><span>Points {usePoints}</span><span>-HK${pointsDiscountHKD}</span></div>}
            <div className="flex justify-between"><span>Shipping</span><span>{shipping.free?"Free":formatPrice(shipping.shippingHKD, shipping.shippingUSD,currency)}</span></div>
            {giftTier && <div className="bg-[#111] text-white p-2 text-[11px]">🎁 {giftTier.label_zh} 已符合，獲贈 {giftTier.gifts.reduce((a,b)=>a+b.qty,0)}件</div>}
            <div className="flex justify-between font-semibold text-[18px] pt-2 border-t border-[#ECE6DF]"><span>Total</span><span>{formatPrice(totalHKD, totalUSD,currency)}</span></div>
            <p className="text-[11px] text-[#8F8881]">本次獲得 {pointsEarned} 積分</p>
          </div>
        </div>
        <button onClick={placeOrder} className="mt-6 w-full bg-[#111] text-white h-[52px] text-[12px] tracking-[0.18em] uppercase">確認下單 Place Order</button>
        <p className="text-[10px] text-[#BBB5AD] mt-3 text-center">訂單完成後積分自動入帳 • Cloudflare D1 / KV Ready for real orders</p>
      </section>
    </main>
  )
}
