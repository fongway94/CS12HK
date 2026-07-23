import { useEffect, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuthStore } from "../../stores/useAuthStore"
import { useAppStore } from "../../stores/useAppStore"
import { getDBClient } from "../../lib/db/client"
import { Order } from "../../lib/db/types"
import { checkBirthdayMonth } from "../../lib/promotions/engine"
import { formatPrice } from "../../lib/currency"
import { showToast } from "../../components/ui/Toast"

type AccountTab = "overview" | "orders" | "points" | "birthday" | "addresses" | "settings"

export function AccountPage() {
  const { user, logout, fetchMe } = useAuthStore()
  const { currency, lang } = useAppStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [tab, setTab] = useState<AccountTab>("overview")
  const [editingBirthday, setEditingBirthday] = useState("")
  const [addresses, setAddresses] = useState<{ id: string; name: string; phone: string; address: string; district: string; isDefault: boolean }[]>([])
  const [editingAddress, setEditingAddress] = useState<{ name: string; phone: string; address: string; district: string } | null>(null)
  const [editEmail, setEditEmail] = useState("")
  const [editUsername, setEditUsername] = useState("")
  const nav = useNavigate()

  useEffect(()=>{ fetchMe() },[])

  useEffect(()=>{
    if(user) {
      getDBClient().getOrdersByUserId(user.id).then(setOrders)
      setEditEmail(user.email)
      setEditUsername(user.username)
      try { const raw = localStorage.getItem(`cs12_addresses_${user.id}`); if(raw) setAddresses(JSON.parse(raw)) } catch {}
    }
  },[user])

  useEffect(()=>{ if(!localStorage.getItem("cs12_token")) nav("/login") },[])

  if(!user) return <div className="py-20 text-center">{lang==="zh"?"載入中...":"Loading..."}</div>

  const isBirthdayMonth = checkBirthdayMonth(user.birthday)

  useEffect(() => {
    if (user && isBirthdayMonth) {
      const db = getDBClient()
      db.getCouponByCode("BIRTHDAY10").then(c => { if (c && !c.isActive) db.updateCoupon("BIRTHDAY10", { isActive: true }) })
    }
  }, [user, isBirthdayMonth])

  const handleSaveBirthday = async () => {
    if (!editingBirthday) return
    const db = getDBClient()
    await db.updateUser(user.id, { birthday: editingBirthday })
    await fetchMe()
    setEditingBirthday("")
    showToast("success", lang==="zh"?"生日日期已更新":"Birthday updated")
  }

  const handleSaveProfile = async () => {
    const db = getDBClient()
    await db.updateUser(user.id, { email: editEmail, username: editUsername })
    await fetchMe()
    showToast("success", lang==="zh"?"個人資料已更新":"Profile updated")
  }

  const saveAddresses = (addrs: typeof addresses) => { setAddresses(addrs); localStorage.setItem(`cs12_addresses_${user.id}`, JSON.stringify(addrs)) }
  const addAddress = () => {
    if (!editingAddress) return
    const newAddr = { id: "addr_" + Date.now(), ...editingAddress, isDefault: addresses.length === 0 }
    saveAddresses([...addresses, newAddr])
    setEditingAddress(null)
    showToast("success", lang==="zh"?"地址已新增":"Address added")
  }
  const deleteAddress = (id: string) => { saveAddresses(addresses.filter(a => a.id !== id)) }

  const sidebarItems: { key: AccountTab; label_zh: string; label_en: string; badge?: number | string }[] = [
    { key: "overview", label_zh: "帳戶總覽", label_en: "Overview" },
    { key: "orders", label_zh: "訂單記錄", label_en: "Orders", badge: orders.length },
    { key: "points", label_zh: "積分記錄", label_en: "Points" },
    { key: "birthday", label_zh: "生日禮遇", label_en: "Birthday", badge: isBirthdayMonth ? "🎂" : undefined },
    { key: "addresses", label_zh: "地址管理", label_en: "Addresses" },
    { key: "settings", label_zh: "帳戶設定", label_en: "Settings" },
  ]

  const renderBirthdaySection = () => {
    if (!user.birthday) {
      return (
        <p className="text-[12px] text-[#8F8881] mt-2">
          <button onClick={()=>setTab("birthday")} className="underline">{lang==="zh"?"設定生日日期":"Set your birthday"}</button>
          {lang==="zh"?"，享生日禮遇及驚喜。":" to unlock birthday rewards."}
        </p>
      )
    }
    return (
      <div className="mt-2 text-[13px]">
        <p>{lang==="zh"?"生日":"Birthday"}: {user.birthday} {isBirthdayMonth && <span className="bg-[#9E7428] text-white px-2 py-[1px] text-[10px] ml-2">{lang==="zh"?"本月生日！":"BIRTHDAY MONTH"}</span>}</p>
        {isBirthdayMonth ? (
          <p className="mt-2 text-[#825F59]">{lang==="zh"?"生日月份尊享 10% OFF 優惠碼 BIRTHDAY10 已自動激活，購物即可使用！另獲 200 積分獎勵。":"Your birthday 10% OFF code BIRTHDAY10 is active! Plus 200 bonus points on your birthday month order."}</p>
        ) : (
          <p className="text-[#8F8881] mt-2">{lang==="zh"?"生日當月可享 10% OFF 及雙倍積分。":"Enjoy 10% OFF and double points during your birthday month."}</p>
        )}
      </div>
    )
  }

  return (
    <main className="w-[min(calc(100%-24px),1440px)] mx-auto py-6 md:py-10 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 md:gap-10">
      <aside className="bg-white border border-[#ECE6DF] p-6 h-fit">
        <div className="text-center border-b border-[#F2ECE4] pb-6 mb-6">
          <div className="w-16 h-16 rounded-full bg-[#9E7428] text-white mx-auto flex items-center justify-center font-serif text-[24px]">{user.username[0].toUpperCase()}</div>
          <h3 className="font-serif text-[18px] mt-3">{user.username}</h3>
          <p className="text-[11px] text-[#8F8881]">{user.email}</p>
          <span className="mt-2 inline-block text-[10px] tracking-[0.14em] uppercase bg-[#F7F3EB] px-2 py-1">{user.tier} • {user.points} {lang==="zh"?"積分":"Points"}</span>
        </div>
        <ul className="space-y-1 text-[12px]">
          {sidebarItems.map(item => (
            <li key={item.key}>
              <button onClick={()=>setTab(item.key)} className={`w-full text-left px-3 py-2 flex justify-between items-center rounded transition ${tab===item.key ? "bg-[#9E7428] text-white font-semibold" : "text-[#5C5651] hover:bg-[#FBF6F0]"}`}>
                <span>{lang==="zh"?item.label_zh:item.label_en}</span>
                {item.badge !== undefined && <span className="text-[10px]">{item.badge}</span>}
              </button>
            </li>
          ))}
        </ul>
        {user.role==="admin" && <button onClick={()=>nav("/admin")} className="mt-4 w-full bg-[#825F59] text-white h-8 text-[11px] tracking-[0.14em] uppercase">Admin Panel</button>}
        <button onClick={()=>{logout(); nav("/")}} className="mt-4 w-full border border-[#9E7428] h-9 text-[11px] uppercase">{lang==="zh"?"登出":"Logout"}</button>
      </aside>

      <section className="space-y-6 md:space-y-8">
        {/* ===== Overview ===== */}
        {tab==="overview" && (<>
          <div className={`border p-6 ${isBirthdayMonth ? "bg-[#FFF7ED] border-[#FED7AA]" : "bg-[#FBF6F0] border-[#ECE6DF]"}`}>
            <h3 className="font-serif text-[20px]">🎂 {lang==="zh"?"生日禮遇":"Birthday Special"}</h3>
            {renderBirthdaySection()}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-[#ECE6DF] p-6"><p className="text-[10px] uppercase tracking-[0.14em] text-[#8F8881]">{lang==="zh"?"累計消費":"Total Spent"}</p><p className="font-serif text-[24px] mt-1">{formatPrice(user.totalSpentHKD, user.totalSpentHKD*0.128, currency)}</p><p className="text-[11px] text-[#8F8881] mt-1">{user.totalOrders} {lang==="zh"?"訂單":"orders"}</p></div>
            <div className="bg-white border border-[#ECE6DF] p-6"><p className="text-[10px] uppercase tracking-[0.14em] text-[#8F8881]">{lang==="zh"?"積分":"Points"}</p><p className="font-serif text-[24px] mt-1">{user.points}</p><p className="text-[11px] text-[#8F8881] mt-1">= {formatPrice(user.points/100, user.points/100*0.128, currency)} {lang==="zh"?"可抵扣":"redeemable"}</p></div>
            <div className="bg-white border border-[#ECE6DF] p-6"><p className="text-[10px] uppercase tracking-[0.14em] text-[#8F8881]">{lang==="zh"?"會員等級":"Tier"}</p><p className="font-serif text-[24px] mt-1">{user.tier}</p><p className="text-[11px] text-[#8F8881] mt-1">{user.tier==="Prestige"?(lang==="zh"?"全年9折 + 生日禮盒":"10% off all year + birthday gift"):user.tier==="VIP"?(lang==="zh"?"享VIP專屬優惠":"VIP exclusive offers"):(lang==="zh"?"滿$5000升級VIP":"Spend $5000 to upgrade to VIP")}</p></div>
          </div>

          <div className="border border-[#ECE6DF] p-4 bg-[#FBF6F0] text-[11px] flex justify-between">
            <span>{lang==="zh"?"電子報":"Newsletter"}: {user.newsletter ? (lang==="zh"?"已訂閱":"Subscribed") : (lang==="zh"?"未訂閱":"Unsubscribed")}</span>
            <span>{lang==="zh"?"首購優惠":"First Order"}: {user.isFirstOrder ? "NEWCS12 15% OFF ✓" : (lang==="zh"?"已使用":"Used")}</span>
          </div>

          <div className="bg-white border border-[#ECE6DF] p-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-[12px] tracking-[0.18em] uppercase font-semibold">{lang==="zh"?"最近訂單":"Recent Orders"}</h4>
              <button onClick={()=>setTab("orders")} className="text-[11px] underline text-[#8F8881]">{lang==="zh"?"查看全部":"View All"}</button>
            </div>
            {orders.length===0
              ? <p className="text-[12px] text-[#8F8881]">{lang==="zh"?"暫無訂單。去 ":"No orders yet. Visit "}<Link to="/exclusive" className="underline">{lang==="zh"?"官網限定":"Exclusive"}</Link>{lang==="zh"?" 選購。":" to shop."}</p>
              : <div className="space-y-3">{orders.slice(0,3).map(o=>(
                  <Link to={`/order/${o.id}`} key={o.id} className="border border-[#F2ECE4] p-4 flex justify-between text-[12px] hover:bg-[#FBF6F0] transition">
                    <div><p className="font-semibold">{o.id} • {new Date(o.createdAt).toLocaleDateString()}</p><p className="text-[#8F8881]">{o.items.length} items • <span className={o.status==="paid"?"text-green-600":o.status==="shipped"?"text-blue-600":""}>{o.status}</span></p></div>
                    <div className="text-right"><p>{formatPrice(o.totalHKD, o.totalUSD, currency)}</p><p className="text-[#8F8881] text-[11px]">+{o.pointsEarned} pts {o.giftTier?`• 🎁 ${o.giftTier}`:""}</p></div>
                  </Link>
                ))}</div>}
          </div>
        </>)}

        {/* ===== Orders ===== */}
        {tab==="orders" && (
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h4 className="text-[12px] tracking-[0.18em] uppercase font-semibold mb-4">{lang==="zh"?"訂單記錄":"Orders"} ({orders.length})</h4>
            {orders.length===0
              ? <p className="text-[12px] text-[#8F8881]">{lang==="zh"?"暫無訂單。去 ":"No orders yet. Visit "}<Link to="/exclusive" className="underline">{lang==="zh"?"官網限定":"Exclusive"}</Link>{lang==="zh"?" 選購。":" to shop."}</p>
              : <div className="space-y-4">{orders.map(o=>(
                  <Link to={`/order/${o.id}`} key={o.id} className="border border-[#F2ECE4] p-5 hover:bg-[#FBF6F0] transition block">
                    <div className="flex justify-between items-start">
                      <div><p className="font-semibold text-[13px]">{o.id}</p><p className="text-[11px] text-[#8F8881]">{new Date(o.createdAt).toLocaleDateString()} • {o.items.length} items</p></div>
                      <div className="text-right">
                        <p className="text-[14px] font-medium">{formatPrice(o.totalHKD, o.totalUSD, currency)}</p>
                        <span className={`text-[10px] tracking-[0.12em] uppercase px-2 py-[1px] ${o.status==="paid"?"bg-green-100 text-green-700":o.status==="shipped"?"bg-blue-100 text-blue-700":o.status==="delivered"?"bg-[#9E7428] text-white":o.status==="cancelled"?"bg-red-100 text-red-700":"bg-[#F2ECE4] text-[#8F8881]"}`}>{o.status}</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-[#F2ECE4] text-[11px] text-[#5C5651]">
                      {o.couponCode && <p>{lang==="zh"?"優惠碼":"Coupon"}: {o.couponCode}</p>}
                      {o.gifts.length > 0 && <p>🎁 {lang==="zh"?"贈品":"Gifts"}: {o.gifts.join(", ")}</p>}
                      <p>{lang==="zh"?"積分":"Points"}: +{o.pointsEarned} {o.pointsUsed > 0 ? `(-${o.pointsUsed} used)` : ""}</p>
                      {o.shippingAddress && <p>{lang==="zh"?"送貨":"Ship to"}: {o.shippingAddress.name} - {o.shippingAddress.address}, {o.shippingAddress.district}</p>}
                    </div>
                  </Link>
                ))}</div>}
          </div>
        )}

        {/* ===== Points ===== */}
        {tab==="points" && (
          <div className="space-y-6">
            <div className="bg-white border border-[#ECE6DF] p-6">
              <h4 className="text-[12px] tracking-[0.18em] uppercase font-semibold mb-4">{lang==="zh"?"積分總覽":"Points Summary"}</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-[#FBF6F0] p-4"><p className="text-[10px] uppercase text-[#8F8881]">{lang==="zh"?"可用積分":"Available"}</p><p className="font-serif text-[28px]">{user.points}</p></div>
                <div className="bg-[#FBF6F0] p-4"><p className="text-[10px] uppercase text-[#8F8881]">{lang==="zh"?"可抵扣":"Redeemable"}</p><p className="font-serif text-[28px]">{formatPrice(user.points/100, user.points/100*0.128, currency)}</p></div>
                <div className="bg-[#FBF6F0] p-4"><p className="text-[10px] uppercase text-[#8F8881]">{lang==="zh"?"會員等級":"Tier"}</p><p className="font-serif text-[28px]">{user.tier}</p></div>
              </div>
              <p className="mt-4 text-[11px] text-[#8F8881]">{lang==="zh"?"每消費 HK$1 = 1 積分 • 100積分 = HK$1 抵扣 • 生日月雙倍積分":"Spend HK$1 = 1 point • 100 points = HK$1 off • Double points on birthday month"}</p>
            </div>
            <div className="bg-white border border-[#ECE6DF] p-6">
              <h4 className="text-[12px] tracking-[0.18em] uppercase font-semibold mb-4">{lang==="zh"?"積分記錄":"Points History"}</h4>
              {(!user.pointsHistory || user.pointsHistory.length===0)
                ? <p className="text-[12px] text-[#8F8881]">{lang==="zh"?"暫無記錄。":"No history yet."}</p>
                : <ul className="text-[12px] space-y-2">{[...user.pointsHistory].reverse().map(t=>(
                    <li key={t.id} className="flex justify-between py-2 border-b border-[#F2ECE4]">
                      <div><p>{t.reason}</p><p className="text-[10px] text-[#8F8881]">{new Date(t.createdAt).toLocaleDateString()}</p></div>
                      <span className={`font-medium ${t.amount>0?"text-green-600":"text-red-600"}`}>{t.amount>0?"+":""}{t.amount}</span>
                    </li>
                  ))}</ul>}
            </div>
          </div>
        )}

        {/* ===== Birthday ===== */}
        {tab==="birthday" && (
          <div className="space-y-6">
            <div className={`border p-6 ${isBirthdayMonth ? "bg-[#FFF7ED] border-[#FED7AA]" : "bg-[#FBF6F0] border-[#ECE6DF]"}`}>
              <h3 className="font-serif text-[24px]">🎂 {lang==="zh"?"生日禮遇":"Birthday Special"}</h3>
              {isBirthdayMonth && (
                <div className="mt-4 bg-[#9E7428] text-white p-4 text-[12px]">
                  <p className="font-semibold">{lang==="zh"?"🎉 生日快樂！本月尊享以下禮遇：":"🎉 Happy Birthday! This month you enjoy:"}</p>
                  <ul className="mt-2 space-y-1 text-[#BBB5AD]">
                    <li>{lang==="zh"?"• BIRTHDAY10 優惠碼 10% OFF（已自動激活）":"• BIRTHDAY10 code — 10% OFF (auto-activated)"}</li>
                    <li>{lang==="zh"?"• 200 積分獎勵（將於下次購物時自動發放）":"• 200 bonus points (credited on your next order)"}</li>
                    <li>{lang==="zh"?"• 生日月份雙倍積分":"• Double points all birthday month"}</li>
                  </ul>
                </div>
              )}
              <div className="mt-4 text-[13px]">
                {user.birthday ? (
                  <div>
                    <p>{lang==="zh"?"您的生日":"Your birthday"}: {user.birthday}</p>
                    {!isBirthdayMonth && <p className="text-[#8F8881] mt-2">{lang==="zh"?"生日當月可享 10% OFF 優惠碼及雙倍積分。":"Enjoy 10% OFF and double points during your birthday month."}</p>}
                  </div>
                ) : (
                  <p className="text-[#8F8881]">{lang==="zh"?"尚未設定生日日期。設定後，每年生日月份可享專屬禮遇。":"Birthday not set. Set it to unlock annual birthday rewards."}</p>
                )}
              </div>
              <div className="mt-4 flex gap-3">
                <input type="date" value={editingBirthday} onChange={e=>setEditingBirthday(e.target.value)} className="border border-[#ECE6DF] h-10 px-3 text-[13px]"/>
                <button onClick={handleSaveBirthday} className="bg-[#9E7428] text-white px-6 h-10 text-[11px] tracking-[0.14em] uppercase">{lang==="zh"?"儲存":"Save"}</button>
              </div>
            </div>
            <div className="bg-white border border-[#ECE6DF] p-6 text-[12px] leading-relaxed text-[#5C5651]">
              <h4 className="font-semibold text-[13px] text-[#9E7428] mb-3">{lang==="zh"?"生日禮遇條款":"Birthday Rewards Terms"}</h4>
              <ul className="list-disc pl-5 space-y-1">
                {lang==="zh" ? (
                  <>
                    <li>需提前設定生日日期方可享生日禮遇</li>
                    <li>BIRTHDAY10 優惠碼僅限生日月份使用，不可與其他優惠碼同時使用</li>
                    <li>200 積分獎勵將於生日月份首筆訂單完成後發放</li>
                    <li>生日月份購物享雙倍積分 (每 HK$1 = 2 積分)</li>
                  </>
                ) : (
                  <>
                    <li>Birthday must be set in advance to qualify for birthday rewards</li>
                    <li>BIRTHDAY10 code is valid only during birthday month and cannot be combined with other codes</li>
                    <li>200 bonus points are credited after the first order in your birthday month</li>
                    <li>Double points on all birthday month purchases (HK$1 = 2 points)</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* ===== Addresses ===== */}
        {tab==="addresses" && (
          <div className="space-y-4">
            <div className="bg-white border border-[#ECE6DF] p-6">
              <h4 className="text-[12px] tracking-[0.18em] uppercase font-semibold mb-4">{lang==="zh"?"地址管理":"Addresses"} ({addresses.length})</h4>
              {addresses.length === 0
                ? <p className="text-[12px] text-[#8F8881]">{lang==="zh"?"尚未新增地址。":"No addresses saved yet."}</p>
                : <div className="space-y-3">{addresses.map(a => (
                    <div key={a.id} className="border border-[#F2ECE4] p-4 flex justify-between">
                      <div className="text-[12px]">
                        <p className="font-semibold">{a.name} {a.isDefault && <span className="text-[10px] bg-[#9E7428] text-white px-1 ml-1">{lang==="zh"?"預設":"Default"}</span>}</p>
                        <p className="text-[#5C5651]">{a.phone}</p>
                        <p className="text-[#5C5651]">{a.address}, {a.district}</p>
                      </div>
                      <button onClick={()=>deleteAddress(a.id)} className="text-[11px] underline text-[#8F8881] self-start">{lang==="zh"?"刪除":"Delete"}</button>
                    </div>
                  ))}</div>}
            </div>
            {!editingAddress ? (
              <button onClick={()=>setEditingAddress({ name: user.username, phone: "", address: "", district: lang==="zh"?"香港島":"Hong Kong Island" })} className="bg-[#9E7428] text-white px-6 h-10 text-[11px] tracking-[0.14em] uppercase">+ {lang==="zh"?"新增地址":"Add Address"}</button>
            ) : (
              <div className="bg-white border border-[#ECE6DF] p-6 space-y-3">
                <h4 className="text-[12px] tracking-[0.18em] uppercase font-semibold">{lang==="zh"?"新增地址":"Add Address"}</h4>
                <input placeholder={lang==="zh"?"收件人姓名":"Recipient name"} value={editingAddress.name} onChange={e=>setEditingAddress({...editingAddress, name: e.target.value})} className="w-full border border-[#ECE6DF] h-10 px-3 text-[13px]"/>
                <input placeholder={lang==="zh"?"電話":"Phone"} value={editingAddress.phone} onChange={e=>setEditingAddress({...editingAddress, phone: e.target.value})} className="w-full border border-[#ECE6DF] h-10 px-3 text-[13px]"/>
                <input placeholder={lang==="zh"?"地址":"Address"} value={editingAddress.address} onChange={e=>setEditingAddress({...editingAddress, address: e.target.value})} className="w-full border border-[#ECE6DF] h-10 px-3 text-[13px]"/>
                <select value={editingAddress.district} onChange={e=>setEditingAddress({...editingAddress, district: e.target.value})} className="w-full border border-[#ECE6DF] h-10 px-3 text-[13px]">
                  {(lang==="zh"?["香港島","九龍","新界","離島"]:["Hong Kong Island","Kowloon","New Territories","Outlying Islands"]).map(d=><option key={d}>{d}</option>)}
                </select>
                <div className="flex gap-2">
                  <button onClick={addAddress} className="bg-[#9E7428] text-white px-6 h-10 text-[11px] uppercase">{lang==="zh"?"儲存":"Save"}</button>
                  <button onClick={()=>setEditingAddress(null)} className="border border-[#ECE6DF] px-6 h-10 text-[11px] uppercase">{lang==="zh"?"取消":"Cancel"}</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== Settings ===== */}
        {tab==="settings" && (
          <div className="space-y-6">
            <div className="bg-white border border-[#ECE6DF] p-6">
              <h4 className="text-[12px] tracking-[0.18em] uppercase font-semibold mb-4">{lang==="zh"?"個人資料":"Profile"}</h4>
              <div className="space-y-3">
                <div><label className="text-[11px] uppercase text-[#8F8881]">{lang==="zh"?"用戶名":"Username"}</label><input value={editUsername} onChange={e=>setEditUsername(e.target.value)} className="w-full border border-[#ECE6DF] h-10 px-3 text-[13px] mt-1"/></div>
                <div><label className="text-[11px] uppercase text-[#8F8881]">{lang==="zh"?"電子郵件":"Email"}</label><input value={editEmail} onChange={e=>setEditEmail(e.target.value)} className="w-full border border-[#ECE6DF] h-10 px-3 text-[13px] mt-1"/></div>
                <button onClick={handleSaveProfile} className="bg-[#9E7428] text-white px-6 h-10 text-[11px] tracking-[0.14em] uppercase">{lang==="zh"?"儲存更改":"Save Changes"}</button>
              </div>
            </div>
            <div className="bg-white border border-[#ECE6DF] p-6">
              <h4 className="text-[12px] tracking-[0.18em] uppercase font-semibold mb-4">{lang==="zh"?"電子報":"Newsletter"}</h4>
              <p className="text-[12px] text-[#5C5651]">{lang==="zh"?"訂閱狀態":"Status"}: {user.newsletter ? (lang==="zh"?"已訂閱 ✓":"Subscribed ✓") : (lang==="zh"?"未訂閱":"Unsubscribed")}</p>
              <p className="text-[11px] text-[#8F8881] mt-2">{lang==="zh"?"如需取消訂閱，請聯繫客戶服務。":"To unsubscribe, please contact customer service."}</p>
            </div>
            <div className="bg-white border border-[#ECE6DF] p-6">
              <h4 className="text-[12px] tracking-[0.18em] uppercase font-semibold mb-4">{lang==="zh"?"更改密碼":"Change Password"}</h4>
              <div className="space-y-3">
                <input type="password" placeholder={lang==="zh"?"目前密碼":"Current password"} className="w-full border border-[#ECE6DF] h-10 px-3 text-[13px]"/>
                <input type="password" placeholder={lang==="zh"?"新密碼":"New password"} className="w-full border border-[#ECE6DF] h-10 px-3 text-[13px]"/>
                <input type="password" placeholder={lang==="zh"?"確認新密碼":"Confirm new password"} className="w-full border border-[#ECE6DF] h-10 px-3 text-[13px]"/>
                <button onClick={()=>showToast("info", lang==="zh"?"密碼更改功能即將推出":"Password change coming soon")} className="bg-[#9E7428] text-white px-6 h-10 text-[11px] tracking-[0.14em] uppercase">{lang==="zh"?"更改密碼":"Change Password"}</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}