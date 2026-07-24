import { useState, useMemo, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useCartStore } from "../../stores/useCartStore"
import { useAppStore } from "../../stores/useAppStore"
import { useAuthStore } from "../../stores/useAuthStore"
import { getDBClient } from "../../lib/db/client"
import { GiftTier, Coupon, Order } from "../../lib/db/types"
import { calcSubtotal, getGiftTier, calcCouponDiscount, calcShipping, checkBirthdayMonth } from "../../lib/promotions/engine"
import { calcPointsEarned, getTier } from "../../lib/points/engine"
import { formatPrice } from "../../lib/currency"
import { showToast } from "../../components/ui/Toast"

export function CheckoutPage() {
  const { items, couponCode, clear } = useCartStore()
  const { currency, lang } = useAppStore()
  const { user } = useAuthStore()
  const nav = useNavigate()
  const [giftTiers, setGiftTiers] = useState<GiftTier[]>([])
  const [couponObj, setCouponObj] = useState<Coupon|null>(null)
  const [address, setAddress] = useState({ name:"", phone:"", address:"", district: lang==="zh"?"香港島":"Hong Kong Island", region:"HKD" })
  const [usePoints, setUsePoints] = useState(0)
  const [isPlacing, setIsPlacing] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  useEffect(()=>{
    getDBClient().getGiftTiers().then(setGiftTiers)
    if(couponCode) getDBClient().getCouponByCode(couponCode).then(c=> c && setCouponObj(c))
    if(user) {
      try {
        const raw = localStorage.getItem(`cs12_addresses_${user.id}`)
        if(raw) {
          const addrs = JSON.parse(raw)
          const def = addrs.find((a: any) => a.isDefault) || addrs[0]
          if(def) setAddress({ name: def.name, phone: def.phone, address: def.address, district: def.district, region: "HKD" })
        }
      } catch {}
    }
  },[])

  const isBirthday = user ? checkBirthdayMonth(user.birthday) : false
  const birthdayMultiplier = isBirthday ? 2 : 1

  // Helper to get display price (variant or base product)
  const getItemPrice = (item: any) => {
    const v = item.variant
    return {
      priceHKD: v?.price_hkd ?? item.product.price_hkd,
      priceUSD: v?.price_usd ?? item.product.price_usd,
      qty: item.qty
    }
  }

  const getItemStock = (item: any) => {
    return item.variant?.stock ?? item.product.stock
  }

  const getItemName = (item: any) => {
    const v = item.variant
    return lang==="zh" ? (v?.name_zh ?? item.product.name_zh) : (v?.name_en ?? item.product.name_en)
  }

  const getItemImage = (item: any) => {
    const v = item.variant
    return v?.image ? [v.image, ...item.product.images.slice(1)] : item.product.images
  }

  const subtotal = useMemo(()=> calcSubtotal(items.map(getItemPrice)),[items])
  const giftTier = getGiftTier(subtotal.hkd, subtotal.usd, giftTiers, currency)
  const couponCalc = useMemo(()=> calcCouponDiscount(subtotal.hkd, subtotal.usd, couponObj, currency, user?.isFirstOrder ?? true),[subtotal, couponObj, currency, user])
  const shipping = calcShipping(subtotal.hkd - couponCalc.discountHKD, subtotal.usd - couponCalc.discountUSD, currency)
  const pointsDiscountHKD = usePoints / 100
  const totalHKD = Math.max(0, subtotal.hkd - couponCalc.discountHKD - pointsDiscountHKD + shipping.shippingHKD)
  const totalUSD = Math.max(0, subtotal.usd - couponCalc.discountUSD - (pointsDiscountHKD*0.128) + shipping.shippingUSD)
  const pointsEarned = Math.floor(calcPointsEarned(totalHKD) * birthdayMultiplier)

  const validate = (): string[] => {
    const errs: string[] = []
    if (!address.name.trim()) errs.push(lang==="zh"?"請填寫收件人姓名":"Please enter recipient name")
    if (!address.phone.trim()) errs.push(lang==="zh"?"請填寫電話號碼":"Please enter phone number")
    if (!address.address.trim()) errs.push(lang==="zh"?"請填寫地址":"Please enter address")
    return errs
  }

  const placeOrder = async () => {
    if(!user){ nav("/login"); return }
    if(items.length===0) return
    const validationErrors = validate()
    if (validationErrors.length > 0) { setErrors(validationErrors); showToast("error", validationErrors[0]); return }
    setErrors([])
    setIsPlacing(true)
    try {
      const db = getDBClient()
      for (const item of items) {
        const currentProduct = await db.getProductById(item.product.id)
        const stock = getItemStock(item)
        if (!currentProduct || stock < item.qty) {
          showToast("error", lang==="zh"?`${getItemName(item)} 庫存不足`:`Insufficient stock for ${getItemName(item)}`)
          setIsPlacing(false)
          return
        }
      }
      const order: Order = {
        id: "ORD-" + Date.now(),
        userId: user.id,
        items: items.map(i=>({ 
          productId: i.product.id, 
          qty: i.qty, 
          priceHKDAtPurchase: getItemPrice(i).priceHKD, 
          priceUSDAtPurchase: getItemPrice(i).priceUSD,
          variantId: i.variantId
        })),
        subtotalHKD: subtotal.hkd, subtotalUSD: subtotal.usd,
        discountHKD: couponCalc.discountHKD + pointsDiscountHKD,
        discountUSD: couponCalc.discountUSD + pointsDiscountHKD*0.128,
        shippingHKD: shipping.shippingHKD, shippingUSD: shipping.shippingUSD,
        totalHKD, totalUSD, currency,
        couponCode: couponObj?.code,
        giftTier: giftTier ? (giftTier.thresholdHKD>=3000 ? "tier2_3000":"tier1_2000") : null,
        gifts: giftTier ? giftTier.gifts.map(g=>`${g.name_zh} x${g.qty}`) : [],
        status: "paid",
        pointsEarned, pointsUsed: usePoints,
        shippingAddress: address,
        createdAt: new Date().toISOString()
      }
      await db.createOrder(order)
      for (const item of items) {
        const currentProduct = await db.getProductById(item.product.id)
        if (currentProduct) await db.updateProduct(item.product.id, { stock: Math.max(0, getItemStock(item) - item.qty) })
      }
      let bonusPoints = 0
      if (isBirthday) {
        bonusPoints = 200
        const existing = await db.getBirthdayRewards(user.id)
        const thisYear = new Date().getFullYear()
        if (!existing.find(r => r.year === thisYear)) {
          await db.createBirthdayReward({ userId: user.id, year: thisYear, rewarded: true, couponCode: "BIRTHDAY10", discountPercent: 10, validFrom: new Date().toISOString(), validTo: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString() })
        }
      }
      const pointsHistoryEntries = [{ id: "tx_" + Date.now(), userId: user.id, amount: pointsEarned, reason: `Order ${order.id}`, orderId: order.id, createdAt: new Date().toISOString() }]
      if (bonusPoints > 0) pointsHistoryEntries.push({ id: "tx_" + (Date.now() + 1), userId: user.id, amount: bonusPoints, reason: "Birthday Bonus 🎂", orderId: order.id, createdAt: new Date().toISOString() })
      await db.updateUser(user.id, { totalSpentHKD: user.totalSpentHKD + totalHKD, totalOrders: user.totalOrders + 1, points: user.points - usePoints + pointsEarned + bonusPoints, tier: getTier(user.totalSpentHKD + totalHKD), isFirstOrder: false, pointsHistory: [...(user.pointsHistory||[]), ...pointsHistoryEntries] })
      if(couponObj) await db.updateCoupon(couponObj.code, { usedCount: couponObj.usedCount + 1 })
      clear()
      const bonusMsg = bonusPoints > 0 ? (lang==="zh"?` 🎂 生日獎勵 +${bonusPoints}積分！`:` 🎂 Birthday bonus +${bonusPoints} pts!`) : ""
      showToast("success", lang==="zh"?`下單成功！訂單 ${order.id}。獲得 ${pointsEarned} 積分。${bonusMsg}`:`Order ${order.id} placed! Earned ${pointsEarned} points.${bonusMsg}`)
      nav("/account")
    } catch (e: any) {
      showToast("error", lang==="zh"?"下單失敗，請重試":"Order failed, please try again")
    } finally {
      setIsPlacing(false)
    }
  }

  if(items.length===0) return (
    <main className="w-[min(calc(100%-24px),1440px)] mx-auto py-20 text-center">
      <h1 className="font-serif text-[32px] mb-4">{lang==="zh"?"購物車為空":"Cart is empty"}</h1>
      <Link to="/exclusive" className="inline-flex bg-[var(--brand-accent)] text-white px-8 h-[44px] items-center text-[11px] tracking-[0.18em] uppercase">{lang==="zh"?"回到商店":"Go Shopping"}</Link>
    </main>
  )

  const districts = lang==="zh" 
    ? ["香港島","九龍","新界","離島"] 
    : ["Hong Kong Island","Kowloon","New Territories","Outlying Islands"]

  return (
    <main className="w-[min(calc(100%-24px),1440px)] mx-auto py-6 md:py-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
      <section className="bg-white border border-[#ECE6DF] p-6">
        <h2 className="font-serif text-[24px] mb-6">{lang==="zh"?"配送資訊":"Shipping Information"}</h2>
        {errors.length > 0 && (
          <div className="mb-4 bg-red-50 border border-red-200 p-3 text-[12px] text-red-700">
            {errors.map((e, i) => <p key={i}>⚠ {e}</p>)}
          </div>
        )}
        <div className="space-y-4 text-[13px]">
          <div>
            <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{lang==="zh"?"收件人姓名":"Recipient Name"} *</label>
            <input placeholder={lang==="zh"?"陳小明":"John Smith"} value={address.name} onChange={e=>setAddress({...address,name:e.target.value})} className="w-full border border-[#ECE6DF] h-11 px-3 mt-1"/>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{lang==="zh"?"電話":"Phone"} *</label>
            <input placeholder="+852 9123 4567" value={address.phone} onChange={e=>setAddress({...address,phone:e.target.value})} className="w-full border border-[#ECE6DF] h-11 px-3 mt-1"/>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{lang==="zh"?"地址":"Address"} *</label>
            <input placeholder={lang==="zh"?"街道名稱及門牌號碼":"Street address"} value={address.address} onChange={e=>setAddress({...address,address:e.target.value})} className="w-full border border-[#ECE6DF] h-11 px-3 mt-1"/>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{lang==="zh"?"地區":"District"} *</label>
            <select value={address.district} onChange={e=>setAddress({...address,district:e.target.value})} className="w-full border border-[#ECE6DF] h-11 px-3 mt-1">
              {districts.map(d=><option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="pt-4 border-t border-[#F2ECE4]">
            <h3 className="text-[11px] uppercase tracking-[0.14em] font-semibold mb-2">{lang==="zh"?"支付方式":"Payment Method"}</h3>
            <div className="grid grid-cols-2 gap-2">
              {(lang==="zh"
                ? ["信用卡","FPS 轉數快","PayMe","Apple Pay"]
                : ["Credit Card","FPS","PayMe","Apple Pay"]
              ).map(m => (
                <label key={m} className="flex items-center gap-2 border border-[#ECE6DF] p-3 text-[11px] cursor-pointer hover:border-[var(--brand-accent)] transition">
                  <input type="radio" name="payment" defaultChecked={m===(lang==="zh"?"信用卡":"Credit Card")} className="accent-[var(--brand-accent)]"/>
                  <span>{m}</span>
                </label>
              ))}
            </div>
            <p className="text-[10px] text-[#BBB5AD] mt-2">{lang==="zh"?"正式接通 Stripe / PayPal 後可直接收款 (此為模擬 checkout)":"Stripe / PayPal integration coming soon (demo checkout)"}</p>
          </div>
          {user && user.points > 0 && (
            <div className="pt-4 border-t border-[#F2ECE4]">
              <h3 className="text-[11px] uppercase tracking-[0.14em] font-semibold mb-2">
                {lang==="zh"?`積分抵扣 (${user.points} 可用)`:`Redeem Points (${user.points} available)`}
              </h3>
              <div className="flex gap-2 items-center">
                <input type="number" min={0} max={user.points} value={usePoints} onChange={e=>setUsePoints(Math.min(user.points, Math.max(0, parseInt(e.target.value)||0)))} className="border border-[#ECE6DF] h-9 px-2 w-32"/>
                <span className="text-[11px] text-[#8F8881]">= HK${(usePoints/100).toFixed(0)} {lang==="zh"?"抵扣":"off"}</span>
                <button onClick={()=>setUsePoints(user.points)} className="text-[10px] underline text-[#8F8881]">{lang==="zh"?"全部使用":"Use All"}</button>
              </div>
            </div>
          )}
          {isBirthday && (
            <div className="pt-4 border-t border-[#F2ECE4]">
              <div className="bg-[#FFF7ED] border border-[#FED7AA] p-3 text-[12px]">
                🎂 <strong>{lang==="zh"?"生日月份！":"Birthday Month!"}</strong> {lang==="zh"?"本次購物享雙倍積分 + 200 積分獎勵":"Enjoy double points + 200 bonus points on this order"}
              </div>
            </div>
          )}
        </div>
      </section>
      <section className="bg-white border border-[#ECE6DF] p-6 h-fit md:sticky md:top-[100px]">
        <h3 className="text-[12px] tracking-[0.18em] uppercase font-semibold mb-4">{lang==="zh"?"訂單摘要":"Order Summary"}</h3>
        <div className="space-y-2 text-[13px]">
          {items.map((i, idx) => {
            const images = getItemImage(i)
            const name = getItemName(i)
            const priceHKD = getItemPrice(i).priceHKD
            const priceUSD = getItemPrice(i).priceUSD
            const variant = i.variant
            return (
              <div key={`${i.product.id}-${i.variantId || "base"}-${idx}`} className="flex justify-between text-[#5C5651] py-2 border-b border-[#F2ECE4]">
                <div className="flex gap-3">
                  <div className="w-14 h-14 bg-[#FBF6F0] border border-[#F2ECE4] shrink-0">
                    <img src={images[0]} className="w-full h-full object-cover" alt=""/>
                  </div>
                  <div>
                    <p className="text-[12px] leading-tight">{name}</p>
                    {variant && <p className="text-[10px] text-[#8F8881]">{lang==="zh"?"規格":"Variant"}: {lang==="zh"?variant.name_zh:variant.name_en}</p>}
                    <p className="text-[10px] text-[#8F8881]">x{i.qty}</p>
                  </div>
                </div>
                <span className="text-[12px] font-medium shrink-0">{formatPrice(priceHKD*i.qty, priceUSD*i.qty,currency)}</span>
              </div>
            )
          })}
          <div className="pt-3 space-y-2">
            <div className="flex justify-between"><span>{lang==="zh"?"小計":"Subtotal"}</span><span>{formatPrice(subtotal.hkd, subtotal.usd, currency)}</span></div>
            {couponCalc.valid && <div className="flex justify-between text-green-700"><span>{lang==="zh"?"折扣":"Discount"} {couponObj?.code}</span><span>-{formatPrice(couponCalc.discountHKD, couponCalc.discountUSD,currency)}</span></div>}
            {usePoints>0 && <div className="flex justify-between text-green-700"><span>{lang==="zh"?"積分抵扣":"Points Redeemed"} {usePoints}</span><span>-HK${pointsDiscountHKD}</span></div>}
            <div className="flex justify-between"><span>{lang==="zh"?"運費":"Shipping"}</span><span>{shipping.free?(lang==="zh"?"免費":"Free"):formatPrice(shipping.shippingHKD, shipping.shippingUSD,currency)}</span></div>
            {giftTier && <div className="bg-[var(--brand-accent)] text-white p-3 text-[11px]">🎁 {lang==="zh"?giftTier.label_zh:giftTier.label_en} {lang==="zh"?"已符合，獲贈":"Unlocked — get"} {giftTier.gifts.reduce((a,b)=>a+b.qty,0)} {lang==="zh"?"件":"items"}</div>}
            <div className="flex justify-between font-semibold text-[18px] pt-3 border-t border-[#ECE6DF]"><span>{lang==="zh"?"合計":"Total"}</span><span>{formatPrice(totalHKD, totalUSD,currency)}</span></div>
            <div className="text-[11px] text-[#8F8881] space-y-1">
              <p>{lang==="zh"?"本次獲得":"Earn"} {pointsEarned} {lang==="zh"?"積分":"points"} {isBirthday && (lang==="zh"?"(x2 生日雙倍)":"(x2 birthday double)")}</p>
              {couponObj && <p>{lang==="zh"?"優惠碼":"Coupon"} {couponObj.code} {couponCalc.valid ? "✓" : `(${couponCalc.reason})`}</p>}
            </div>
          </div>
        </div>
        <button
          onClick={placeOrder}
          disabled={isPlacing}
          className="mt-6 w-full bg-[var(--brand-accent)] text-white h-[52px] text-[12px] tracking-[0.18em] uppercase disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPlacing ? (lang==="zh"?"處理中...":"Processing...") : (lang==="zh"?"確認下單":"Place Order")}
        </button>
        <p className="text-[10px] text-[#BBB5AD] mt-3 text-center">{lang==="zh"?"訂單完成後積分自動入帳":"Points are credited automatically after order completion"}</p>
      </section>
    </main>
  )
}
