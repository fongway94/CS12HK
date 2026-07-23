import { useEffect, useState } from "react"
import { useAuthStore } from "../../stores/useAuthStore"
import { getDBClient } from "../../lib/db/client"
import { Product, User, Order, Coupon } from "../../lib/db/types"
import { useNavigate } from "react-router-dom"

export function AdminPage() {
  const { user } = useAuthStore()
  const nav = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [tab, setTab] = useState<"crm"|"products"|"orders"|"coupons"|"bundles">("crm")

  useEffect(()=>{
    if(!user || user.role!=="admin"){ nav("/login"); return }
    refresh()
  },[user])

  const refresh = async()=>{
    const db = getDBClient()
    setProducts(await db.getProducts())
    setUsers(await db.getUsers())
    setOrders(await db.getOrders())
    setCoupons(await db.getCoupons())
  }

  const totalRevenue = orders.reduce((a,b)=>a+b.totalHKD,0)
  const newUsersThisMonth = users.filter(u=> new Date(u.createdAt).getMonth()===new Date().getMonth()).length

  return (
    <main className="w-[min(calc(100%-48px),1600px)] mx-auto py-8">
      <h1 className="font-serif text-[32px] mb-2">Admin Panel • CRM</h1>
      <p className="text-[12px] text-[#8F8881] mb-6">Cloudflare D1 Ready • Local adapter now, switch to D1Adapter for production • Full CRUD for products, bundles, promotions, birthday, points</p>

      <div className="flex gap-2 mb-8 text-[11px] uppercase tracking-[0.14em]">
        {(["crm","products","orders","coupons","bundles"] as const).map(t=><button key={t} onClick={()=>setTab(t)} className={`border px-4 h-8 ${tab===t?"bg-black text-white border-black":"bg-white border-[#ECE6DF]"}`}>{t}</button>)}
      </div>

      {tab==="crm" && (
        <>
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border border-[#ECE6DF] p-5"><p className="text-[10px] uppercase text-[#8F8881]">Revenue</p><p className="font-serif text-[24px]">HK${totalRevenue.toLocaleString()}</p></div>
            <div className="bg-white border border-[#ECE6DF] p-5"><p className="text-[10px] uppercase text-[#8F8881]">Orders</p><p className="font-serif text-[24px]">{orders.length}</p></div>
            <div className="bg-white border border-[#ECE6DF] p-5"><p className="text-[10px] uppercase text-[#8F8881]">Users CRM</p><p className="font-serif text-[24px]">{users.length}</p><p className="text-[11px] text-[#8F8881]">New this month: {newUsersThisMonth}</p></div>
            <div className="bg-white border border-[#ECE6DF] p-5"><p className="text-[10px] uppercase text-[#8F8881]">Avg Order Value</p><p className="font-serif text-[24px]">HK${orders.length?Math.round(totalRevenue/orders.length):0}</p></div>
          </div>
          <div className="bg-white border border-[#ECE6DF] overflow-auto">
            <table className="w-full text-[12px] text-left">
              <thead className="bg-[#FBF6F0] text-[10px] uppercase tracking-[0.14em]"><tr><th className="p-3">User</th><th className="p-3">Email</th><th className="p-3">Tier</th><th className="p-3">Points</th><th className="p-3">Spent</th><th className="p-3">Orders</th><th className="p-3">Birthday</th><th className="p-3">Newsletter</th><th className="p-3">Created</th></tr></thead>
              <tbody>{users.map(u=><tr key={u.id} className="border-t border-[#F2ECE4]"><td className="p-3">{u.username}</td><td className="p-3">{u.email}</td><td className="p-3"><span className="bg-[#111] text-white px-2 py-[1px] text-[10px]">{u.tier}</span></td><td className="p-3">{u.points}</td><td className="p-3">HK${u.totalSpentHKD}</td><td className="p-3">{u.totalOrders}</td><td className="p-3">{u.birthday||"-"} {u.birthday && new Date(u.birthday).getMonth()===new Date().getMonth() && "🎂"}</td><td className="p-3">{u.newsletter?"✓":"-"}</td><td className="p-3">{new Date(u.createdAt).toLocaleDateString()}</td></tr>)}</tbody>
            </table>
          </div>
        </>
      )}

      {tab==="products" && (
        <div className="bg-white border border-[#ECE6DF] overflow-auto">
          <div className="p-4 flex justify-between items-center border-b border-[#F2ECE4]"><h3 className="text-[12px] uppercase font-semibold">Products & Inventory ({products.length})</h3><button className="bg-[#111] text-white px-4 h-8 text-[11px] uppercase">+ Add Product (plug D1)</button></div>
          <table className="w-full text-[12px] text-left">
            <thead className="bg-[#FBF6F0] text-[10px] uppercase"><tr><th className="p-3">SKU</th><th className="p-3">Name</th><th className="p-3">Series</th><th className="p-3">Price HKD</th><th className="p-3">Stock</th><th className="p-3">Points</th><th className="p-3">Bundle?</th><th className="p-3">Actions</th></tr></thead>
            <tbody>{products.map(p=><tr key={p.id} className="border-t border-[#F2ECE4]"><td className="p-3">{p.sku}</td><td className="p-3">{p.name_zh}</td><td className="p-3">{p.series}</td><td className="p-3">HK${p.price_hkd}</td><td className="p-3">{p.stock}</td><td className="p-3">{p.points}</td><td className="p-3">{p.isBundle?"✔":"-"}</td><td className="p-3"><button className="underline text-[#8F8881]">Edit</button></td></tr>)}</tbody>
          </table>
        </div>
      )}

      {tab==="orders" && (
        <div className="bg-white border border-[#ECE6DF] overflow-auto">
          <table className="w-full text-[12px] text-left">
            <thead className="bg-[#FBF6F0] text-[10px] uppercase"><tr><th className="p-3">Order ID</th><th className="p-3">User</th><th className="p-3">Items</th><th className="p-3">Total HKD</th><th className="p-3">Coupon</th><th className="p-3">Gifts</th><th className="p-3">Points</th><th className="p-3">Status</th><th className="p-3">Date</th></tr></thead>
            <tbody>{orders.map(o=><tr key={o.id} className="border-t border-[#F2ECE4]"><td className="p-3">{o.id}</td><td className="p-3">{o.userId}</td><td className="p-3">{o.items.length}</td><td className="p-3">HK${o.totalHKD}</td><td className="p-3">{o.couponCode||"-"}</td><td className="p-3">{o.gifts.length}</td><td className="p-3">+{o.pointsEarned} -{o.pointsUsed}</td><td className="p-3">{o.status}</td><td className="p-3">{new Date(o.createdAt).toLocaleDateString()}</td></tr>)}</tbody>
          </table>
        </div>
      )}

      {tab==="coupons" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h3 className="text-[12px] uppercase font-semibold mb-4">Promotion Coupons / Promotion Bundles Setup</h3>
            <table className="w-full text-[12px]">
              <thead><tr className="text-[10px] uppercase text-[#8F8881]"><th className="text-left p-2">Code</th><th className="text-left p-2">Type</th><th className="text-left p-2">Value</th><th className="text-left p-2">Min HKD</th><th className="text-left p-2">First Only</th><th className="text-left p-2">Active</th><th className="text-left p-2">Used</th></tr></thead>
              <tbody>{coupons.map(c=><tr key={c.code} className="border-t border-[#F2ECE4]"><td className="p-2 font-mono">{c.code}</td><td className="p-2">{c.type}</td><td className="p-2">{c.value}{c.type==="percent"?"%":""}</td><td className="p-2">{c.minAmountHKD||"-"}</td><td className="p-2">{c.onlyFirstOrder?"✔":"-"}</td><td className="p-2">{c.isActive?"✔":"✖"}</td><td className="p-2">{c.usedCount}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="bg-[#FBF6F0] border border-[#ECE6DF] p-6 text-[12px] leading-relaxed">
            <h4 className="font-semibold mb-2">How promotion engine works (current implementation)</h4>
            <ul className="list-disc pl-5 space-y-1 text-[#5C5651]">
              <li>Coupon NEWCS12: 15% off first order over HK$1500 – validated in <code>lib/promotions/engine.ts</code></li>
              <li>Gift tiers: HK$2000 → 6 gifts (value 975), HK$3000 → 10 gifts (value 1741) – auto detected in cart</li>
              <li>Free shipping threshold: HK$800 / USD100 – <code>FREE_SHIPPING_THRESHOLD</code></li>
              <li>Birthday special: If birthday month = current month, show banner in account and auto unlock BIRTHDAY10 coupon</li>
              <li>Bundles: Products with isBundle=true have buy-get label (買2送3 etc) and special pricing (original vs sale)</li>
              <li>Points: 1 HKD = 1 point, 100 points = HK$1 discount. Points earned on checkout, deducted on redeem. Tier: Member/VIP/Prestige based on total spent</li>
              <li>All logic abstracted to allow D1/KV plug – see <code>src/lib/db/d1Adapter.ts</code></li>
            </ul>
          </div>
        </div>
      )}

      {tab==="bundles" && (
        <div className="grid md:grid-cols-2 gap-4">
          {products.filter(p=>p.isBundle).map(b=>(
            <div key={b.id} className="bg-white border border-[#ECE6DF] p-5">
              <h4 className="font-serif text-[18px]">{b.name_zh}</h4>
              <p className="text-[11px] text-[#8F8881]">{b.bundleGiftLabel} • HK${b.price_hkd} (原 HK${b.original_price_hkd})</p>
              <p className="text-[12px] mt-2">{b.description_zh}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
