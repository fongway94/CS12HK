import { useState, useMemo, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useCartStore } from "../../stores/useCartStore"
import { useAppStore } from "../../stores/useAppStore"
import { useAuthStore } from "../../stores/useAuthStore"
import { getDBClient } from "../../lib/db/client"
import { GiftTier, Coupon, Order, User } from "../../lib/db/types"
import { calcSubtotal, getGiftTier, calcCouponDiscount, calcShipping, checkBirthdayMonth } from "../../lib/promotions/engine"
import { calcPointsEarned, getTier } from "../../lib/points/engine"
import { formatPrice } from "../../lib/currency"
import { showToast } from "../../components/ui/Toast"

export function CheckoutPage() {
  const { items, couponCode, clear } = useCartStore()
  const { currency, lang } = useAppStore()
  const { user, login, register } = useAuthStore()
  const nav = useNavigate()
  const [giftTiers, setGiftTiers] = useState<GiftTier[]>([])
  const [couponObj, setCouponObj] = useState<Coupon|null>(null)
  const [address, setAddress] = useState({ email: user?.email || "", name:"", phone:"", address:"", district: lang==="zh"?"香港島":"Hong Kong Island", region:"HKD" })
  const [orderNotes, setOrderNotes] = useState("")
  const [usePoints, setUsePoints] = useState(0)
  const [isPlacing, setIsPlacing] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  // Guest checkout state
  const [showLogin, setShowLogin] = useState(false)
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)
  const [createAccount, setCreateAccount] = useState(true)
  const [newPassword, setNewPassword] = useState("")

  useEffect(()=>{
    getDBClient().getGiftTiers().then(setGiftTiers)
    if(couponCode) getDBClient().getCouponByCode(couponCode).then(c=> c && setCouponObj(c))
    if(user) {
      setAddress(prev => ({ ...prev, email: user.email }))
      try {
        const raw = localStorage.getItem(`cs12_addresses_${user.id}`)
        if(raw) {
          const addrs = JSON.parse(raw)
          const def = addrs.find((a: any) => a.isDefault) || addrs[0]
          if(def) setAddress(prev => ({ ...prev, name: def.name, phone: def.phone, address: def.address, district: def.district, region: "HKD" }))
        }
      } catch {}
    }
    // Restore draft from previous session
    try {
      const draft = localStorage.getItem("cs12_checkout_address_draft")
      if (draft) {
        const parsed = JSON.parse(draft)
        setAddress(parsed)
        localStorage.removeItem("cs12_checkout_address_draft")
      }
    } catch {}
  },[])

  // Keep email synced with user state
  useEffect(() => {
    if (user) setAddress(prev => ({ ...prev, email: user.email }))
  }, [user])

  const isBirthday = user ? checkBirthdayMonth(user.birthday) : false
  const birthdayMultiplier = isBirthday ? 2 : 1

  const getItemPrice = (item: any) => {
    const v = item.variant
    return { priceHKD: v?.price_hkd ?? item.product.price_hkd, priceUSD: v?.price_usd ?? item.product.price_usd, qty: item.qty }
  }
  const getItemStock = (item: any) => item.variant?.stock ?? item.product.stock
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

  const handleLogin = async () => {
    setLoginError("")
    setLoginLoading(true)
    const res = await login(loginEmail, loginPassword)
    if (res.success) {
      setShowLogin(false)
      setLoginEmail("")
      setLoginPassword("")
      showToast("success", lang==="zh"?"登入成功！":"Login successful!")
    } else {
      setLoginError(res.error || "Login failed")
    }
    setLoginLoading(false)
  }

  const validate = (): string[] => {
    const errs: string[] = []
    if (!address.email.trim()) errs.push(lang==="zh"?"請填寫電郵地址":"Please enter email address")
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email.trim())) errs.push(lang==="zh"?"請填寫有效的電郵地址":"Please enter a valid email address")
    if (!address.name.trim()) errs.push(lang==="zh"?"請填寫收件人姓名":"Please enter recipient name")
    if (!address.phone.trim()) errs.push(lang==="zh"?"請填寫電話號碼":"Please enter phone number")
    if (!address.address.trim()) errs.push(lang==="zh"?"請填寫地址":"Please enter address")
    if (!user && createAccount && newPassword.length < 6) errs.push(lang==="zh"?"密碼至少需要6個字符":"Password must be at least 6 characters")
    return errs
  }

  const placeOrder = async () => {
    if (items.length === 0) return
    const validationErrors = validate()
    if (validationErrors.length > 0) { setErrors(validationErrors); showToast("error", validationErrors[0]); return }
    setErrors([])
    setIsPlacing(true)
    try {
      const db = getDBClient()

      // Check stock
      for (const item of items) {
        const currentProduct = await db.getProductById(item.product.id)
        const stock = getItemStock(item)
        if (!currentProduct || stock < item.qty) {
          showToast("error", lang==="zh"?`${getItemName(item)} 庫存不足`:`Insufficient stock for ${getItemName(item)}`)
          setIsPlacing(false)
          return
        }
      }

      let orderUser = user
      let isGuest = false

      // If not logged in, handle account creation or guest checkout
      if (!user) {
        const existingUser = await db.getUserByEmail(address.email.trim())
        if (existingUser) {
          // Email already registered — ask them to login
          setErrors([lang==="zh"?"此電郵已註冊，請登入後繼續":"This email is already registered. Please login to continue."])
          showToast("error", lang==="zh"?"此電郵已註冊，請登入":"This email is already registered. Please login")
          setShowLogin(true)
          setLoginEmail(address.email.trim())
          setIsPlacing(false)
          return
        }

        if (createAccount) {
          // Create account inline during checkout
          const newUser: User = {
            id: "u_" + Date.now(),
            email: address.email.trim(),
            username: address.email.trim().split("@")[0],
            passwordHash: newPassword,
            role: "customer",
            newsletter: true,
            points: 0,
            pointsHistory: [],
            createdAt: new Date().toISOString(),
            totalSpentHKD: 0,
            totalOrders: 0,
            tier: "Member",
            isFirstOrder: true
          }
          await db.createUser(newUser)
          localStorage.setItem("cs12_token", newUser.id)
          orderUser = newUser
        } else {
          // Guest checkout
          isGuest = true
        }
      }

      const order: Order = {
        id: "ORD-" + Date.now(),
        userId: isGuest ? "guest" : orderUser!.id,
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
        pointsEarned: isGuest ? 0 : pointsEarned,
        pointsUsed: isGuest ? 0 : usePoints,
        shippingAddress: {
          email: address.email.trim(),
          name: address.name,
          phone: address.phone,
          address: address.address,
          district: address.district,
          region: address.region
        },
        createdAt: new Date().toISOString()
      }
      await db.createOrder(order)

      // Update stock
      for (const item of items) {
        const currentProduct = await db.getProductById(item.product.id)
        if (currentProduct) await db.updateProduct(item.product.id, { stock: Math.max(0, getItemStock(item) - item.qty) })
      }

      // Update user stats (only if registered user)
      if (!isGuest && orderUser) {
        let bonusPoints = 0
        if (isBirthday) {
          bonusPoints = 200
          const existing = await db.getBirthdayRewards(orderUser.id)
          const thisYear = new Date().getFullYear()
          if (!existing.find(r => r.year === thisYear)) {
            await db.createBirthdayReward({ userId: orderUser.id, year: thisYear, rewarded: true, couponCode: "BIRTHDAY10", discountPercent: 10, validFrom: new Date().toISOString(), validTo: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString() })
          }
        }
        const pointsHistoryEntries = [{ id: "tx_" + Date.now(), userId: orderUser.id, amount: pointsEarned, reason: `Order ${order.id}`, orderId: order.id, createdAt: new Date().toISOString() }]
        if (bonusPoints > 0) pointsHistoryEntries.push({ id: "tx_" + (Date.now() + 1), userId: orderUser.id, amount: bonusPoints, reason: "Birthday Bonus 🎂", orderId: order.id, createdAt: new Date().toISOString() })
        await db.updateUser(orderUser.id, {
          totalSpentHKD: orderUser.totalSpentHKD + totalHKD,
          totalOrders: orderUser.totalOrders + 1,
          points: orderUser.points - usePoints + pointsEarned + bonusPoints,
          tier: getTier(orderUser.totalSpentHKD + totalHKD),
          isFirstOrder: false,
          pointsHistory: [...(orderUser.pointsHistory||[]), ...pointsHistoryEntries]
        })
        // Refresh user in auth store
        useAuthStore.getState().fetchMe()
      }

      if (couponObj) await db.updateCoupon(couponObj.code, { usedCount: couponObj.usedCount + 1 })
      clear()

      const bonusMsg = isBirthday && !isGuest ? (lang==="zh"?` 🎂 生日獎勵 +${200}積分！`:` 🎂 Birthday bonus +${200} pts!`) : ""
      const guestMsg = isGuest ? (lang==="zh"?"（訪客結帳 — 註冊帳戶可賺取積分）":"(Guest checkout — register to earn points)") : ""
      const ptsMsg = !isGuest ? (lang==="zh"?`獲得 ${pointsEarned} 積分。`:`Earned ${pointsEarned} points.`) : ""
      showToast("success", lang==="zh"?`下單成功！訂單 ${order.id}。${ptsMsg}${bonusMsg}${guestMsg}`:`Order ${order.id} placed! ${ptsMsg}${bonusMsg}${guestMsg}`)
      nav(isGuest ? "/" : "/account")
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

  const zh = lang === "zh"

  return (
    <main className="w-[min(calc(100%-24px),1200px)] mx-auto py-6 md:py-8">
      <h1 className="font-serif text-[28px] md:text-[32px] mb-6">{zh?"結帳":"Checkout"}</h1>

      {/* Returning customer login banner */}
      {!user && (
        <div className="mb-6 border border-[#ECE6DF] bg-[#FBF6F0]">
          <button
            onClick={() => setShowLogin(!showLogin)}
            className="w-full text-left px-5 py-3 text-[13px] hover:bg-[#F5EDE3] transition flex items-center gap-2"
          >
            <span className="text-[10px]">▶</span>
            <span>{zh?"已有帳號？":"Returning customer?"} <strong className="underline text-[var(--brand-accent)]">{zh?"按此登入":"Click here to login"}</strong></span>
          </button>
          {showLogin && (
            <div className="px-5 pb-5 pt-2 border-t border-[#ECE6DF]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{zh?"電郵":"Email"} *</label>
                  <input type="email" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} className="w-full border border-[#ECE6DF] h-11 px-3 mt-1 text-[13px]" placeholder="email@example.com"/>
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{zh?"密碼":"Password"} *</label>
                  <input type="password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} className="w-full border border-[#ECE6DF] h-11 px-3 mt-1 text-[13px]"/>
                </div>
              </div>
              {loginError && <p className="text-red-600 text-[12px] mt-2">⚠ {loginError}</p>}
              <div className="flex items-center gap-3 mt-3">
                <button onClick={handleLogin} disabled={loginLoading} className="bg-[var(--brand-accent)] text-white px-8 h-[40px] text-[11px] tracking-[0.18em] uppercase disabled:opacity-50">{loginLoading?"...":(zh?"登入":"Login")}</button>
                <Link to="/login?next=checkout" className="text-[11px] underline text-[#8F8881]">{zh?"忘記密碼？":"Forgot password?"}</Link>
              </div>
            </div>
          )}
        </div>
      )}

      {errors.length > 0 && (
        <div className="mb-4 bg-red-50 border border-red-200 p-4 text-[12px] text-red-700">
          {errors.map((e, i) => <p key={i}>⚠ {e}</p>)}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_420px] gap-6 md:gap-10">
        {/* Left: Billing details */}
        <section>
          <h2 className="font-serif text-[22px] mb-5 pb-3 border-b border-[#ECE6DF]">{zh?"帳單及配送資訊":"Billing & Shipping Details"}</h2>
          <div className="space-y-4 text-[13px]">
            {/* Email */}
            <div>
              <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{zh?"電郵地址":"Email Address"} *</label>
              <input
                type="email"
                value={address.email}
                onChange={e=>setAddress({...address, email:e.target.value})}
                disabled={!!user}
                placeholder="email@example.com"
                className="w-full border border-[#ECE6DF] h-11 px-3 mt-1 disabled:bg-[#FBF6F0] disabled:text-[#8F8881]"
              />
              {user && <p className="text-[10px] text-[#BBB5AD] mt-1">{zh?"已登入帳戶的電郵":"Logged in account email"}</p>}
            </div>

            {/* Name + Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{zh?"收件人姓名":"Recipient Name"} *</label>
                <input placeholder={zh?"陳小明":"John Smith"} value={address.name} onChange={e=>setAddress({...address,name:e.target.value})} className="w-full border border-[#ECE6DF] h-11 px-3 mt-1"/>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{zh?"電話":"Phone"} *</label>
                <input placeholder="+852 9123 4567" value={address.phone} onChange={e=>setAddress({...address,phone:e.target.value})} className="w-full border border-[#ECE6DF] h-11 px-3 mt-1"/>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{zh?"地址":"Address"} *</label>
              <input placeholder={zh?"街道名稱及門牌號碼":"Street address, building, floor"} value={address.address} onChange={e=>setAddress({...address,address:e.target.value})} className="w-full border border-[#ECE6DF] h-11 px-3 mt-1"/>
            </div>

            {/* District */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{zh?"地區":"District"} *</label>
                <select value={address.district} onChange={e=>setAddress({...address,district:e.target.value})} className="w-full border border-[#ECE6DF] h-11 px-3 mt-1">
                  {districts.map(d=><option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{zh?"國家/地區":"Country/Region"}</label>
                <input value={zh?"香港":"Hong Kong"} disabled className="w-full border border-[#ECE6DF] h-11 px-3 mt-1 bg-[#FBF6F0] text-[#8F8881]"/>
              </div>
            </div>

            {/* Order notes */}
            <div>
              <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{zh?"訂單備註 (選填)":"Order Notes (optional)"}</label>
              <textarea
                value={orderNotes}
                onChange={e=>setOrderNotes(e.target.value)}
                placeholder={zh?"如有特別要求請在此填寫":"Any special delivery instructions?"}
                rows={3}
                className="w-full border border-[#ECE6DF] px-3 py-2 mt-1 text-[13px] resize-none"
              />
            </div>

            {/* Account creation section (only for non-logged-in users) */}
            {!user && (
              <div className="pt-4 border-t border-[#F2ECE4]">
                <h3 className="font-serif text-[18px] mb-4">{zh?"帳戶資訊":"Account Information"}</h3>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input type="checkbox" checked={createAccount} onChange={e=>setCreateAccount(e.target.checked)} className="accent-[var(--brand-accent)] w-4 h-4"/>
                  <span className="text-[13px]">{zh?"建立帳戶以賺取積分及追蹤訂單":"Create an account to earn points and track orders"}</span>
                </label>
                {createAccount && (
                  <div className="ml-6 space-y-3">
                    <div>
                      <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{zh?"帳戶密碼":"Account Password"} *</label>
                      <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder={zh?"至少6個字符":"At least 6 characters"} className="w-full border border-[#ECE6DF] h-11 px-3 mt-1"/>
                      <p className="text-[10px] text-[#BBB5AD] mt-1">{zh?"您的帳戶將自動建立，此訂單會直接連結到您的帳戶":"Your account will be created automatically and this order will be linked to it"}</p>
                    </div>
                  </div>
                )}
                {!createAccount && (
                  <p className="ml-6 text-[11px] text-[#8F8881] bg-[#FBF6F0] p-3 border border-[#ECE6DF]">
                    {zh?"您將以訪客身份結帳。訪客結帳不會累積積分。":"You are checking out as a guest. Guest orders do not earn points."}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right: Order summary + payment */}
        <section>
          <div className="bg-white border border-[#ECE6DF] p-6 md:sticky md:top-[100px]">
            <h2 className="font-serif text-[22px] mb-5 pb-3 border-b border-[#ECE6DF]">{zh?"您的訂單":"Your Order"}</h2>

            {/* Product list */}
            <div className="space-y-2 text-[13px]">
              {/* Table header */}
              <div className="flex justify-between text-[11px] uppercase tracking-[0.14em] font-semibold text-[#8F8881] pb-2 border-b border-[#ECE6DF]">
                <span>{zh?"產品":"Product"}</span>
                <span>{zh?"小計":"Subtotal"}</span>
              </div>
              {items.map((i, idx) => {
                const images = getItemImage(i)
                const name = getItemName(i)
                const priceHKD = getItemPrice(i).priceHKD
                const priceUSD = getItemPrice(i).priceUSD
                const variant = i.variant
                return (
                  <div key={`${i.product.id}-${i.variantId || "base"}-${idx}`} className="flex justify-between text-[#5C5651] py-3 border-b border-[#F2ECE4]">
                    <div className="flex gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-[#FBF6F0] border border-[#F2ECE4] shrink-0">
                        <img src={images[0]} className="w-full h-full object-cover" alt=""/>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] leading-tight truncate">{name}</p>
                        {variant && <p className="text-[10px] text-[#8F8881]">{zh?"規格":"Variant"}: {zh?variant.name_zh:variant.name_en}</p>}
                        <p className="text-[10px] text-[#8F8881]">×{i.qty}</p>
                      </div>
                    </div>
                    <span className="text-[12px] font-medium shrink-0 ml-3">{formatPrice(priceHKD*i.qty, priceUSD*i.qty,currency)}</span>
                  </div>
                )
              })}

              {/* Totals */}
              <div className="pt-3 space-y-2">
                <div className="flex justify-between"><span>{zh?"小計":"Subtotal"}</span><span>{formatPrice(subtotal.hkd, subtotal.usd, currency)}</span></div>
                {couponCalc.valid && <div className="flex justify-between text-green-700"><span>{zh?"折扣":"Discount"} {couponObj?.code}</span><span>-{formatPrice(couponCalc.discountHKD, couponCalc.discountUSD,currency)}</span></div>}
                {usePoints>0 && <div className="flex justify-between text-green-700"><span>{zh?"積分抵扣":"Points Redeemed"} {usePoints}</span><span>-HK${pointsDiscountHKD}</span></div>}
                <div className="flex justify-between"><span>{zh?"運費":"Shipping"}</span><span>{shipping.free?(zh?"免費":"Free"):formatPrice(shipping.shippingHKD, shipping.shippingUSD,currency)}</span></div>
                {giftTier && <div className="bg-[var(--brand-accent)] text-white p-3 text-[11px]">🎁 {zh?giftTier.label_zh:giftTier.label_en} {zh?"已符合，獲贈":"Unlocked — get"} {giftTier.gifts.reduce((a,b)=>a+b.qty,0)} {zh?"件":"items"}</div>}
                <div className="flex justify-between font-semibold text-[18px] pt-3 border-t border-[#ECE6DF]"><span>{zh?"合計":"Total"}</span><span>{formatPrice(totalHKD, totalUSD,currency)}</span></div>
                {!user && !createAccount && <p className="text-[10px] text-[#8F8881]">{zh?"訪客結帳 — 不賺取積分":"Guest checkout — no points earned"}</p>}
                {!user && createAccount && <p className="text-[10px] text-green-700">{zh?"建立帳戶可賺取":"Create an account to earn"} {pointsEarned} {zh?"積分":"points"}</p>}
                {user && <p className="text-[10px] text-[#8F8881]">{zh?"本次獲得":"Earn"} {pointsEarned} {zh?"積分":"points"} {isBirthday && (zh?"(x2 生日雙倍)":"(x2 birthday double)")}</p>}
                {couponObj && <p className="text-[10px] text-[#8F8881]">{zh?"優惠碼":"Coupon"} {couponObj.code} {couponCalc.valid ? "✓" : `(${couponCalc.reason})`}</p>}
              </div>
            </div>

            {/* Points redemption (logged in only) */}
            {user && user.points > 0 && (
              <div className="pt-4 mt-4 border-t border-[#F2ECE4]">
                <h3 className="text-[11px] uppercase tracking-[0.14em] font-semibold mb-2">
                  {zh?`積分抵扣 (${user.points} 可用)`:`Redeem Points (${user.points} available)`}
                </h3>
                <div className="flex gap-2 items-center">
                  <input type="number" min={0} max={user.points} value={usePoints} onChange={e=>setUsePoints(Math.min(user.points, Math.max(0, parseInt(e.target.value)||0)))} className="border border-[#ECE6DF] h-9 px-2 w-32 text-[13px]"/>
                  <span className="text-[11px] text-[#8F8881]">= HK${(usePoints/100).toFixed(0)} {zh?"抵扣":"off"}</span>
                  <button onClick={()=>setUsePoints(user.points)} className="text-[10px] underline text-[#8F8881]">{zh?"全部使用":"Use All"}</button>
                </div>
              </div>
            )}

            {/* Payment method */}
            <div className="pt-4 mt-4 border-t border-[#F2ECE4]">
              <h3 className="text-[11px] uppercase tracking-[0.14em] font-semibold mb-3">{zh?"支付方式":"Payment Method"}</h3>
              <div className="space-y-2">
                {(zh
                  ? ["信用卡","FPS 轉數快","PayMe","Apple Pay"]
                  : ["Credit Card","FPS","PayMe","Apple Pay"]
                ).map(m => (
                  <label key={m} className="flex items-center gap-2 border border-[#ECE6DF] p-3 text-[12px] cursor-pointer hover:border-[var(--brand-accent)] transition">
                    <input type="radio" name="payment" defaultChecked={m===(zh?"信用卡":"Credit Card")} className="accent-[var(--brand-accent)]"/>
                    <span>{m}</span>
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-[#BBB5AD] mt-2">{zh?"正式接通 Stripe / PayPal 後可直接收款 (此為模擬 checkout)":"Stripe / PayPal integration coming soon (demo checkout)"}</p>
            </div>

            {/* Birthday banner */}
            {isBirthday && (
              <div className="mt-4 bg-[#FFF7ED] border border-[#FED7AA] p-3 text-[12px]">
                🎂 <strong>{zh?"生日月份！":"Birthday Month!"}</strong> {zh?"本次購物享雙倍積分 + 200 積分獎勵":"Enjoy double points + 200 bonus points on this order"}
              </div>
            )}

            {/* Place order */}
            <button
              onClick={placeOrder}
              disabled={isPlacing}
              className="mt-6 w-full bg-[var(--brand-accent)] text-white h-[52px] text-[12px] tracking-[0.18em] uppercase disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition"
            >
              {isPlacing ? (zh?"處理中...":"Processing...") : (zh?"確認下單":"Place Order")}
            </button>
            <p className="text-[10px] text-[#BBB5AD] mt-3 text-center">{zh?"訂單完成後積分自動入帳":"Points are credited automatically after order completion"}</p>
          </div>
        </section>
      </div>
    </main>
  )
}
