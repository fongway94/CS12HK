import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "../../stores/useAuthStore"
import { useAppStore } from "../../stores/useAppStore"
import { getDBClient } from "../../lib/db/client"
import { Order } from "../../lib/db/types"
import { checkBirthdayMonth } from "../../lib/promotions/engine"
import { formatPrice } from "../../lib/currency"

export function AccountPage() {
  const { user, logout, fetchMe } = useAuthStore()
  const { currency, lang } = useAppStore()
  const [orders, setOrders] = useState<Order[]>([])
  const nav = useNavigate()

  useEffect(()=>{
    fetchMe()
  },[])

  useEffect(()=>{
    if(user) getDBClient().getOrdersByUserId(user.id).then(setOrders)
  },[user])

  useEffect(()=>{
    if(!localStorage.getItem("cs12_token")) nav("/login")
  },[])

  if(!user) return <div className="py-20 text-center">載入中...</div>

  const isBirthdayMonth = checkBirthdayMonth(user.birthday)

  return (
    <main className="w-[min(calc(100%-48px),1440px)] mx-auto py-10 grid md:grid-cols-[260px_1fr] gap-10">
      <aside className="bg-white border border-[#ECE6DF] p-6 h-fit">
        <div className="text-center border-b border-[#F2ECE4] pb-6 mb-6">
          <div className="w-16 h-16 rounded-full bg-[#111] text-white mx-auto flex items-center justify-center font-serif text-[24px]">{user.username[0].toUpperCase()}</div>
          <h3 className="font-serif text-[18px] mt-3">{user.username}</h3>
          <p className="text-[11px] text-[#8F8881]">{user.email}</p>
          <span className="mt-2 inline-block text-[10px] tracking-[0.14em] uppercase bg-[#F7F3EB] px-2 py-1">{user.tier} • {user.points} Points</span>
        </div>
        <ul className="space-y-3 text-[12px]">
          <li className="font-semibold">帳戶總覽</li>
          <li className="text-[#5C5651]">訂單記錄 ({orders.length})</li>
          <li className="text-[#5C5651]">積分記錄</li>
          <li className="text-[#5C5651]">地址管理</li>
          <li className="text-[#5C5651]">生日禮遇 {isBirthdayMonth && "🎂"}</li>
        </ul>
        <button onClick={()=>{logout(); nav("/")}} className="mt-8 w-full border border-[#111] h-9 text-[11px] uppercase">登出 Logout</button>
      </aside>

      <section className="space-y-8">
        {/* Birthday special */}
        <div className={`border p-6 ${isBirthdayMonth ? "bg-[#FFF7ED] border-[#FED7AA]" : "bg-[#FBF6F0] border-[#ECE6DF]"}`}>
          <h3 className="font-serif text-[20px]">🎂 {lang==="zh"?"生日禮遇":"Birthday Special"}</h3>
          {user.birthday ? (
            <div className="mt-2 text-[13px]">
              <p>生日：{user.birthday} {isBirthdayMonth && <span className="bg-[#111] text-white px-2 py-[1px] text-[10px] ml-2">本月生日！BIRTHDAY MONTH</span>}</p>
              {isBirthdayMonth ? <p className="mt-2 text-[#825F59]">生日月份尊享 10% OFF 優惠碼 <b>BIRTHDAY10</b> 已自動激活，購物即可使用！另獲 200 積分獎勵。</p> : <p className="text-[#8F8881] mt-2">生日當月可享 10% OFF 及雙倍積分。</p>}
            </div>
          ) : <p className="text-[12px] text-[#8F8881] mt-2">設定生日日期，享生日禮遇及驚喜。</p>}
        </div>

        {/* CRM summary */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white border border-[#ECE6DF] p-6"><p className="text-[10px] uppercase tracking-[0.14em] text-[#8F8881]">Total Spent</p><p className="font-serif text-[24px] mt-1">{formatPrice(user.totalSpentHKD, user.totalSpentHKD*0.128, currency)}</p><p className="text-[11px] text-[#8F8881] mt-1">{user.totalOrders} 訂單</p></div>
          <div className="bg-white border border-[#ECE6DF] p-6"><p className="text-[10px] uppercase tracking-[0.14em] text-[#8F8881]">Points 積分</p><p className="font-serif text-[24px] mt-1">{user.points}</p><p className="text-[11px] text-[#8F8881] mt-1">= {formatPrice(user.points/100, user.points/100*0.128, currency)} 可抵扣</p></div>
          <div className="bg-white border border-[#ECE6DF] p-6"><p className="text-[10px] uppercase tracking-[0.14em] text-[#8F8881]">Membership</p><p className="font-serif text-[24px] mt-1">{user.tier}</p><p className="text-[11px] text-[#8F8881] mt-1">{user.tier==="Prestige"?"全年9折 + 生日禮盒":"滿$5000升級VIP"}</p></div>
        </div>

        {/* Points history */}
        <div className="bg-white border border-[#ECE6DF] p-6">
          <h4 className="text-[12px] tracking-[0.18em] uppercase font-semibold mb-4">積分記錄 Points History</h4>
          {user.pointsHistory.length===0 ? <p className="text-[12px] text-[#8F8881]">暫無記錄。每消費 HK$1 = 1 積分，100積分=HK$1。</p> :
            <ul className="text-[12px] space-y-2">{user.pointsHistory.map(t=><li key={t.id} className="flex justify-between"><span>{t.reason} - {new Date(t.createdAt).toLocaleDateString()}</span><span className={t.amount>0?"text-green-600":"text-red-600"}>{t.amount>0?"+":""}{t.amount}</span></li>)}</ul>
          }
        </div>

        {/* Orders */}
        <div className="bg-white border border-[#ECE6DF] p-6">
          <h4 className="text-[12px] tracking-[0.18em] uppercase font-semibold mb-4">訂單記錄 Orders</h4>
          {orders.length===0 ? <p className="text-[12px] text-[#8F8881]">暫無訂單。去 <a href="/exclusive" className="underline">官網限定</a> 選購。</p> :
            <div className="space-y-3">
              {orders.map(o=>(
                <div key={o.id} className="border border-[#F2ECE4] p-4 flex justify-between text-[12px]">
                  <div><p className="font-semibold">{o.id} • {new Date(o.createdAt).toLocaleDateString()}</p><p className="text-[#8F8881]">{o.items.length} items • {o.status}</p></div>
                  <div className="text-right"><p>{formatPrice(o.totalHKD, o.totalUSD, currency)}</p><p className="text-[#8F8881] text-[11px]">+{o.pointsEarned} pts {o.giftTier?`• 🎁 ${o.giftTier}`:""}</p></div>
                </div>
              ))}
            </div>
          }
        </div>

        {/* Newsletter CRM status */}
        <div className="border border-[#ECE6DF] p-4 bg-[#FBF6F0] text-[11px] flex justify-between">
          <span>Newsletter: {user.newsletter ? "已訂閱 Subscribed" : "未訂閱"}</span>
          <span>首購優惠: {user.isFirstOrder ? "可用 NEWCS12 15% OFF" : "已使用 Used"}</span>
        </div>
      </section>
    </main>
  )
}
