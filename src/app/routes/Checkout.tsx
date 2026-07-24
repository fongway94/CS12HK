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
  const { user, login } = useAuthStore()
  const nav = useNavigate()
  const [giftTiers, setGiftTiers] = useState<GiftTier[]>([])
  const [couponObj, setCouponObj] = useState<Coupon|null>(null)
  const [address, setAddress] = useState({
    email: user?.email || "",
    firstName: "",
    lastName: "",
    company: "",
    name: "",
    phone: "",
    address: "",
    address2: "",
    district: lang==="zh"?"香港島":"Hong Kong Island",
    region:"HKD"
  })
  const [orderNotes, setOrderNotes] = useState("")
  const [usePoints, setUsePoints] = useState(0)
  const [isPlacing, setIsPlacing] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  // Ship to different address
  const [shipToDifferent, setShipToDifferent] = useState(false)
  const [shippingAddr, setShippingAddr] = useState({
    firstName: "",
    lastName: "",
    company: "",
    phone: "",
    address: "",
    address2: "",
    district: lang==="zh"?"香港島":"Hong Kong Island",
    region: "HKD"
  })

  // Newsletter subscription
  const [newsletter, setNewsletter] = useState(true)

  // Returning customer login state
  const [showLogin, setShowLogin] = useState(false)
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)
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
          if(def) setAddress(prev => ({
            ...prev,
            email: user.email,
            firstName: def.firstName || "",
            lastName: def.lastName || "",
            company: def.company || "",
            name: def.name || "",
            phone: def.phone || "",
            address: def.address || "",
            address2: def.address2 || "",
            district: def.district || prev.district,
            region: "HKD"
          }))
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

  // Keep email, newsletter and address synced with user state
  useEffect(() => {
    if (user) {
      setAddress(prev => ({ ...prev, email: user.email }))
      setNewsletter(user.newsletter)
      try {
        const raw = localStorage.getItem(`cs12_addresses_${user.id}`)
        if(raw) {
          const addrs = JSON.parse(raw)
          const def = addrs.find((a: any) => a.isDefault) || addrs[0]
          if(def) setAddress(prev => ({
            ...prev,
            email: user.email,
            firstName: def.firstName || prev.firstName,
            lastName: def.lastName || prev.lastName,
            company: def.company || prev.company,
            name: def.name || prev.name,
            phone: def.phone || prev.phone,
            address: def.address || prev.address,
            address2: def.address2 || prev.address2,
            district: def.district || prev.district,
            region: "HKD"
          }))
        }
      } catch {}
    }
  }, [user])

  const isBirthday = user ? checkBirthdayMonth(user.birthday) : false
  const birthdayMultiplier = isBirthday ? 2 : 1
  const zh = lang === "zh"

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
    if (!address.email.trim()) errs.push(zh?"請填寫電郵地址":"Please enter email address")
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email.trim())) errs.push(zh?"請填寫有效的電郵地址":"Please enter a valid email address")
    if (!address.firstName.trim()) errs.push(zh?"請填寫名字":"Please enter first name")
    if (!address.lastName.trim()) errs.push(zh?"請填寫姓氏":"Please enter last name")
    if (!address.phone.trim()) errs.push(zh?"請填寫電話號碼":"Please enter phone number")
    if (!address.address.trim()) errs.push(zh?"請填寫地址":"Please enter address")
    if (!user && newPassword.length < 6) errs.push(zh?"帳戶密碼至少需要6個字符":"Account password must be at least 6 characters")
    // Validate shipping address if delivering to different address
    if (shipToDifferent) {
      if (!shippingAddr.firstName.trim()) errs.push(zh?"請填寫送貨收件人名字":"Please enter shipping recipient first name")
      if (!shippingAddr.lastName.trim()) errs.push(zh?"請填寫送貨收件人姓氏":"Please enter shipping recipient last name")
      if (!shippingAddr.phone.trim()) errs.push(zh?"請填寫送貨電話":"Please enter shipping phone number")
      if (!shippingAddr.address.trim()) errs.push(zh?"請填寫送貨地址":"Please enter shipping address")
    }
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

      // If not logged in, always create an account (matching old WooCommerce behaviour)
      if (!user) {
        const existingUser = await db.getUserByEmail(address.email.trim())
        if (existingUser) {
          // Email already registered — ask them to login
          setErrors([zh?"此電郵已註冊，請登入後繼續":"This email is already registered. Please login to continue."])
          showToast("error", zh?"此電郵已註冊，請登入":"This email is already registered. Please login")
          setShowLogin(true)
          setLoginEmail(address.email.trim())
          setIsPlacing(false)
          return
        }

        // Create account inline during checkout
        const newUser: User = {
          id: "u_" + Date.now(),
          email: address.email.trim(),
          username: address.email.trim().split("@")[0],
          firstName: address.firstName.trim(),
          lastName: address.lastName.trim(),
          passwordHash: newPassword,
          role: "customer",
          newsletter: newsletter,
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
      }

      const order: Order = {
        id: "ORD-" + Date.now(),
        userId: orderUser!.id,
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
        pointsEarned,
        pointsUsed: usePoints,
        shippingAddress: shipToDifferent ? {
          email: address.email.trim(),
          firstName: shippingAddr.firstName,
          lastName: shippingAddr.lastName,
          company: shippingAddr.company || undefined,
          name: `${shippingAddr.firstName} ${shippingAddr.lastName}`.trim(),
          phone: shippingAddr.phone,
          address: shippingAddr.address,
          address2: shippingAddr.address2 || undefined,
          district: shippingAddr.district,
          region: shippingAddr.region
        } : {
          email: address.email.trim(),
          firstName: address.firstName,
          lastName: address.lastName,
          company: address.company || undefined,
          name: `${address.firstName} ${address.lastName}`.trim(),
          phone: address.phone,
          address: address.address,
          address2: address.address2 || undefined,
          district: address.district,
          region: address.region
        },
        billingAddress: {
          email: address.email.trim(),
          firstName: address.firstName,
          lastName: address.lastName,
          company: address.company || undefined,
          name: `${address.firstName} ${address.lastName}`.trim(),
          phone: address.phone,
          address: address.address,
          address2: address.address2 || undefined,
          district: address.district,
          region: address.region
        },
        notes: orderNotes.trim() || undefined,
        createdAt: new Date().toISOString()
      }
      await db.createOrder(order)

      // Update stock
      for (const item of items) {
        const currentProduct = await db.getProductById(item.product.id)
        if (currentProduct) await db.updateProduct(item.product.id, { stock: Math.max(0, getItemStock(item) - item.qty) })
      }

      // Update user stats
      if (orderUser) {
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
        // Save billing address to address book
        try {
          const key = `cs12_addresses_${orderUser.id}`
          const existingRaw = localStorage.getItem(key)
          let addrs = []
          if (existingRaw) {
            addrs = JSON.parse(existingRaw)
          }
          const newAddr = {
            id: "addr_" + Date.now(),
            firstName: address.firstName,
            lastName: address.lastName,
            company: address.company,
            name: `${address.firstName} ${address.lastName}`.trim(),
            phone: address.phone,
            address: address.address,
            address2: address.address2,
            district: address.district,
            region: address.region,
            isDefault: addrs.length === 0
          }
          
          const duplicate = addrs.find((a: any) => 
            a.phone === newAddr.phone && 
            a.address === newAddr.address && 
            a.district === newAddr.district
          )
          
          if (!duplicate) {
            addrs.push(newAddr)
            localStorage.setItem(key, JSON.stringify(addrs))
          }
        } catch(e) {}
        
        // Refresh user in auth store
        useAuthStore.getState().fetchMe()
      }

      if (couponObj) await db.updateCoupon(couponObj.code, { usedCount: couponObj.usedCount + 1 })
      clear()

      const bonusMsg = isBirthday ? (zh?` 🎂 生日獎勵 +${200}積分！`:` 🎂 Birthday bonus +${200} pts!`) : ""
      showToast("success", zh?`下單成功！訂單 ${order.id}。獲得 ${pointsEarned} 積分。${bonusMsg}`:`Order ${order.id} placed! Earned ${pointsEarned} points.${bonusMsg}`)
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

            {/* First Name + Last Name (side by side) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{zh?"名字":"First Name"} *</label>
                <input placeholder={zh?"小明":"John"} value={address.firstName} onChange={e=>setAddress({...address,firstName:e.target.value})} className="w-full border border-[#ECE6DF] h-11 px-3 mt-1"/>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{zh?"姓氏":"Last Name"} *</label>
                <input placeholder={zh?"陳":"Smith"} value={address.lastName} onChange={e=>setAddress({...address,lastName:e.target.value})} className="w-full border border-[#ECE6DF] h-11 px-3 mt-1"/>
              </div>
            </div>

            {/* Company (optional) */}
            <div>
              <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{zh?"公司名稱 (選填)":"Company Name (optional)"}</label>
              <input placeholder={zh?"公司/機構名稱":"Company / Organization"} value={address.company} onChange={e=>setAddress({...address,company:e.target.value})} className="w-full border border-[#ECE6DF] h-11 px-3 mt-1"/>
            </div>

            {/* Country/Region */}
            <div>
              <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{zh?"國家/地區":"Country / Region"} *</label>
              <input value={zh?"香港":"Hong Kong"} disabled className="w-full border border-[#ECE6DF] h-11 px-3 mt-1 bg-[#FBF6F0] text-[#5C5651] font-medium"/>
            </div>

            {/* Street Address */}
            <div>
              <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{zh?"街道地址":"Street Address"} *</label>
              <input placeholder={zh?"門牌號碼及街道名稱":"House number and street name"} value={address.address} onChange={e=>setAddress({...address,address:e.target.value})} className="w-full border border-[#ECE6DF] h-11 px-3 mt-1"/>
            </div>

            {/* Address Line 2 (optional) */}
            <div>
              <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{zh?"地址（第二行）(選填)":"Apartment, suite, etc. (optional)"}</label>
              <input placeholder={zh?"樓層、室數等":"Apartment, suite, unit, floor, etc."} value={address.address2} onChange={e=>setAddress({...address,address2:e.target.value})} className="w-full border border-[#ECE6DF] h-11 px-3 mt-1"/>
            </div>

            {/* District + Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{zh?"地區":"District"} *</label>
                <select value={address.district} onChange={e=>setAddress({...address,district:e.target.value})} className="w-full border border-[#ECE6DF] h-11 px-3 mt-1">
                  {districts.map(d=><option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{zh?"電話":"Phone"} *</label>
                <input placeholder="+852 9123 4567" value={address.phone} onChange={e=>setAddress({...address,phone:e.target.value})} className="w-full border border-[#ECE6DF] h-11 px-3 mt-1"/>
              </div>
            </div>

            {/* Ship to a different address? */}
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={shipToDifferent} onChange={e=>setShipToDifferent(e.target.checked)} className="accent-[var(--brand-accent)] w-4 h-4"/>
                <span className="text-[13px]">{zh?"送貨至其他地址？":"Ship to a different address?"}</span>
              </label>
            </div>

            {shipToDifferent && (
              <div className="border border-[#ECE6DF] bg-[#FBF6F0] p-5 space-y-4 text-[13px]">
                <h3 className="font-serif text-[16px] text-[#3A3734]">{zh?"送貨地址":"Shipping Address"}</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{zh?"名字":"First Name"} *</label>
                    <input value={shippingAddr.firstName} onChange={e=>setShippingAddr({...shippingAddr,firstName:e.target.value})} className="w-full border border-[#ECE6DF] h-11 px-3 mt-1 bg-white"/>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{zh?"姓氏":"Last Name"} *</label>
                    <input value={shippingAddr.lastName} onChange={e=>setShippingAddr({...shippingAddr,lastName:e.target.value})} className="w-full border border-[#ECE6DF] h-11 px-3 mt-1 bg-white"/>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{zh?"公司名稱 (選填)":"Company Name (optional)"}</label>
                  <input value={shippingAddr.company} onChange={e=>setShippingAddr({...shippingAddr,company:e.target.value})} className="w-full border border-[#ECE6DF] h-11 px-3 mt-1 bg-white"/>
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{zh?"國家/地區":"Country / Region"} *</label>
                  <input value={zh?"香港":"Hong Kong"} disabled className="w-full border border-[#ECE6DF] h-11 px-3 mt-1 bg-[#F2ECE4] text-[#5C5651] font-medium"/>
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{zh?"街道地址":"Street Address"} *</label>
                  <input placeholder={zh?"門牌號碼及街道名稱":"House number and street name"} value={shippingAddr.address} onChange={e=>setShippingAddr({...shippingAddr,address:e.target.value})} className="w-full border border-[#ECE6DF] h-11 px-3 mt-1 bg-white"/>
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{zh?"地址（第二行）(選填)":"Apartment, suite, etc. (optional)"}</label>
                  <input placeholder={zh?"樓層、室數等":"Apartment, suite, unit, floor, etc."} value={shippingAddr.address2} onChange={e=>setShippingAddr({...shippingAddr,address2:e.target.value})} className="w-full border border-[#ECE6DF] h-11 px-3 mt-1 bg-white"/>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{zh?"地區":"District"} *</label>
                    <select value={shippingAddr.district} onChange={e=>setShippingAddr({...shippingAddr,district:e.target.value})} className="w-full border border-[#ECE6DF] h-11 px-3 mt-1 bg-white">
                      {districts.map(d=><option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{zh?"電話":"Phone"} *</label>
                    <input placeholder="+852 9123 4567" value={shippingAddr.phone} onChange={e=>setShippingAddr({...shippingAddr,phone:e.target.value})} className="w-full border border-[#ECE6DF] h-11 px-3 mt-1 bg-white"/>
                  </div>
                </div>
              </div>
            )}

            {/* Order remarks */}
            <div className="pt-2">
              <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{zh?"訂單備註 (選填)":"Order Notes (optional)"}</label>
              <textarea
                value={orderNotes}
                onChange={e=>setOrderNotes(e.target.value)}
                placeholder={zh?"如有特別要求請在此填寫":"Notes about your order, e.g. special delivery instructions"}
                rows={3}
                className="w-full border border-[#ECE6DF] px-3 py-2 mt-1 text-[13px] resize-none"
              />
            </div>

            {/* Account creation section (only for non-logged-in users) */}
            {!user && (
              <div className="pt-4 border-t border-[#F2ECE4] space-y-4">
                <div>
                  <h3 className="font-serif text-[18px] mb-2">{zh?"帳戶資訊":"Account Information"}</h3>
                  <p className="text-[12px] text-[#8F8881] mb-4">{zh?"建立帳戶以追蹤訂單及賺取積分。您的帳戶將自動建立。":"An account will be created automatically so you can track orders and earn points."}</p>
                  <div>
                    <label className="text-[11px] uppercase tracking-[0.12em] text-[#8F8881]">{zh?"帳戶密碼":"Account Password"} *</label>
                    <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder={zh?"至少6個字符":"At least 6 characters"} className="w-full border border-[#ECE6DF] h-11 px-3 mt-1"/>
                  </div>
                </div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={newsletter} onChange={e=>setNewsletter(e.target.checked)} className="accent-[var(--brand-accent)] w-4 h-4 mt-[2px]"/>
                  <span className="text-[12px] text-[#5C5651]">{zh?"訂閱電子報 — 接收最新優惠及產品資訊":"Subscribe to newsletter — receive latest offers and product updates"}</span>
                </label>
              </div>
            )}

            {/* Newsletter for logged-in users */}
            {user && (
              <label className="flex items-start gap-2 cursor-pointer pt-2">
                <input type="checkbox" checked={newsletter} onChange={async e => {
                  const checked = e.target.checked
                  setNewsletter(checked)
                  // Update user's newsletter preference
                  try {
                    await getDBClient().updateUser(user.id, { newsletter: checked })
                  } catch {}
                }} className="accent-[var(--brand-accent)] w-4 h-4 mt-[2px]"/>
                <span className="text-[12px] text-[#5C5651]">{zh?"訂閱電子報 — 接收最新優惠及產品資訊":"Subscribe to newsletter — receive latest offers and product updates"}</span>
              </label>
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
                {!user && <p className="text-[10px] text-green-700">{zh?"建立帳戶可賺取":"Create an account to earn"} {pointsEarned} {zh?"積分":"points"}</p>}
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
