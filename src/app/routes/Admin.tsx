import { useEffect, useRef, useState } from "react"
import { useAuthStore } from "../../stores/useAuthStore"
import { getDBClient } from "../../lib/db/client"
import { Product, User, Order, Coupon, GiftTier } from "../../lib/db/types"
import { useNavigate } from "react-router-dom"
import { showToast } from "../../components/ui/Toast"

export function AdminPage() {
  const { user, hasCheckedSession, fetchMe } = useAuthStore()
  const nav = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [giftTiers, setGiftTiers] = useState<GiftTier[]>([])
  const [tab, setTab] = useState<"crm"|"products"|"orders"|"coupons"|"bundles">("crm")
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null)
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon> | null>(null)
  const [editingGiftTier, setEditingGiftTier] = useState<Partial<GiftTier> | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isAddingCoupon, setIsAddingCoupon] = useState(false)
  const [isAddingGiftTier, setIsAddingGiftTier] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [orderFilter, setOrderFilter] = useState<string>("all")
  const productEditorRef = useRef<HTMLDivElement | null>(null)

  useEffect(()=>{
    fetchMe()
  },[])

  useEffect(()=>{
    if(!hasCheckedSession) return
    if(!user || user.role!=="admin"){ nav("/login"); return }
    refresh()
  },[user, hasCheckedSession, nav])

  const refresh = async()=>{
    const db = getDBClient()
    setProducts(await db.getProducts())
    setUsers(await db.getUsers())
    setOrders(await db.getOrders())
    setCoupons(await db.getCoupons())
    setGiftTiers(await db.getGiftTiers())
  }

  const totalRevenue = orders.reduce((a,b)=>a+b.totalHKD,0)
  const paidOrders = orders.filter(o=>o.status==="paid"||o.status==="shipped"||o.status==="delivered")
  const newUsersThisMonth = users.filter(u=> new Date(u.createdAt).getMonth()===new Date().getMonth()).length

  const filteredOrders = orderFilter === "all" ? orders : orders.filter(o => o.status === orderFilter)

  const filteredProducts = searchTerm
    ? products.filter(p => (p.name_zh+p.name_en+p.sku+p.id).toLowerCase().includes(searchTerm.toLowerCase()))
    : products

  const cloneProductForEdit = (p: Product): Partial<Product> => ({
    ...p,
    images: [...p.images],
    category: [...p.category],
    skinType: [...p.skinType],
    tags: [...p.tags],
    bundleItems: p.bundleItems ? p.bundleItems.map(i => ({ ...i })) : undefined
  })

  const openProductEditor = (p: Partial<Product>, adding: boolean) => {
    setEditingProduct(p)
    setIsAdding(adding)
    window.setTimeout(() => productEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0)
  }

  const parseBundleItems = (value: string) => value
    .split(",")
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const [productId, qtyRaw] = part.split(":").map(s => s.trim())
      return { productId, qty: Math.max(1, Number(qtyRaw) || 1) }
    })
    .filter(item => item.productId)

  const serializeBundleItems = (items?: { productId: string; qty: number }[]) => (items || []).map(i => `${i.productId}:${i.qty}`).join(",")

  const parseGiftList = (value: string): GiftTier["gifts"] => value
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [zh = "", en = zh, qtyRaw = "1"] = line.split("|").map(s => s.trim())
      return { name_zh: zh, name_en: en || zh, qty: Math.max(1, Number(qtyRaw) || 1) }
    })

  const serializeGiftList = (gifts?: GiftTier["gifts"]) => (gifts || []).map(g => `${g.name_zh}|${g.name_en}|${g.qty}`).join("\n")

  const cloneGiftTierForEdit = (tier: GiftTier): Partial<GiftTier> => ({ ...tier, gifts: tier.gifts.map(g => ({ ...g })) })

  const makeUniqueSlug = (base: string, excludeId?: string) => {
    const fallback = "product-" + Date.now()
    const source = base.trim() || fallback
    const initial = source.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || fallback
    let slug = initial
    let i = 2
    while (products.some(p => p.slug === slug && p.id !== excludeId)) slug = `${initial}-${i++}`
    return slug
  }

  // Product CRUD
  const handleSaveProduct = async () => {
    if (!editingProduct) return
    const db = getDBClient()
    if (isAdding) {
      if (!editingProduct.name_zh || !editingProduct.sku || !editingProduct.price_hkd) {
        showToast("error", "請填寫必填欄位 (名稱、SKU、價格)")
        return
      }
      const newProduct: Product = {
        id: "p_" + Date.now(),
        slug: makeUniqueSlug(editingProduct.slug || editingProduct.name_en || editingProduct.sku || editingProduct.name_zh || ""),
        name_zh: editingProduct.name_zh || "",
        name_en: editingProduct.name_en || "",
        description_zh: editingProduct.description_zh || "",
        description_en: editingProduct.description_en || "",
        price_hkd: editingProduct.price_hkd || 0,
        price_usd: editingProduct.price_usd || Math.round((editingProduct.price_hkd || 0) * 0.128 * 100) / 100,
        original_price_hkd: editingProduct.original_price_hkd,
        original_price_usd: editingProduct.original_price_usd,
        sku: editingProduct.sku || "",
        stock: editingProduct.stock || 0,
        weight_kg: editingProduct.weight_kg || 0.2,
        images: editingProduct.images && editingProduct.images.length > 0 ? editingProduct.images : ["https://placehold.co/500x500/FBF6F0/8F8881?text=CS12"],
        series: editingProduct.series || "Other",
        category: editingProduct.category && editingProduct.category.length > 0 ? editingProduct.category : ["面部護理"],
        skinType: editingProduct.skinType && editingProduct.skinType.length > 0 ? editingProduct.skinType : ["敏感肌"],
        tags: editingProduct.tags || [],
        points: editingProduct.points || (editingProduct.price_hkd || 0),
        isBundle: editingProduct.isBundle || false,
        bundleItems: editingProduct.bundleItems,
        bundleGiftLabel: editingProduct.bundleGiftLabel,
        rating: editingProduct.rating || 5.0,
        reviewsCount: 0,
        createdAt: new Date().toISOString()
      }
      await db.createProduct(newProduct)
      showToast("success", `產品已新增: ${newProduct.name_zh}`)
    } else {
      const patch = {
        ...editingProduct,
        slug: makeUniqueSlug(editingProduct.slug || editingProduct.name_en || editingProduct.sku || editingProduct.name_zh || "", editingProduct.id),
        price_usd: editingProduct.price_usd || Math.round((editingProduct.price_hkd || 0) * 0.128 * 100) / 100,
        original_price_usd: editingProduct.original_price_usd || (editingProduct.original_price_hkd ? Math.round(editingProduct.original_price_hkd * 0.128 * 100) / 100 : undefined),
      }
      await db.updateProduct(editingProduct.id!, patch)
      showToast("success", `產品已更新: ${editingProduct.name_zh}`)
    }
    setEditingProduct(null)
    setIsAdding(false)
    refresh()
  }

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`確定刪除產品「${name}」？`)) return
    const db = getDBClient()
    await db.deleteProduct(id)
    showToast("success", `已刪除: ${name}`)
    refresh()
  }

  // Order status update
  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order["status"]) => {
    const db = getDBClient()
    await db.updateOrder(orderId, { status: newStatus })
    showToast("success", `訂單 ${orderId} 狀態已更新為 ${newStatus}`)
    refresh()
  }

  // Coupon CRUD
  const handleSaveCoupon = async () => {
    if (!editingCoupon?.code) {
      showToast("error", "請填寫優惠碼")
      return
    }
    const db = getDBClient()
    const coupon: Coupon = {
      code: editingCoupon.code.toUpperCase().trim(),
      type: editingCoupon.type || "percent",
      value: Number(editingCoupon.value) || 0,
      currency: editingCoupon.currency,
      minAmountHKD: editingCoupon.minAmountHKD || undefined,
      minAmountUSD: editingCoupon.minAmountUSD || undefined,
      maxUses: editingCoupon.maxUses || undefined,
      usedCount: editingCoupon.usedCount || 0,
      validFrom: editingCoupon.validFrom || new Date().toISOString().slice(0,10),
      validTo: editingCoupon.validTo || "2026-12-31",
      onlyFirstOrder: !!editingCoupon.onlyFirstOrder,
      description_zh: editingCoupon.description_zh || "",
      description_en: editingCoupon.description_en || "",
      isActive: editingCoupon.isActive ?? true
    }
    if (isAddingCoupon) await db.createCoupon(coupon)
    else await db.updateCoupon(coupon.code, coupon)
    showToast("success", `優惠碼已${isAddingCoupon ? "新增" : "更新"}: ${coupon.code}`)
    setEditingCoupon(null)
    setIsAddingCoupon(false)
    refresh()
  }

  const handleToggleCoupon = async (code: string, isActive: boolean) => {
    const db = getDBClient()
    await db.updateCoupon(code, { isActive })
    showToast("success", `優惠碼 ${code} 已${isActive ? "啟用" : "停用"}`)
    refresh()
  }

  const handleDeleteCoupon = async (code: string) => {
    if (!confirm(`確定刪除優惠碼 ${code}？`)) return
    const db = getDBClient()
    await db.deleteCoupon(code)
    showToast("success", `已刪除優惠碼: ${code}`)
    refresh()
  }

  const handleSaveGiftTier = async () => {
    if (!editingGiftTier?.id) {
      showToast("error", "請填寫 Gift Tier ID")
      return
    }
    const db = getDBClient()
    const tier: GiftTier = {
      id: editingGiftTier.id,
      thresholdHKD: Number(editingGiftTier.thresholdHKD) || 0,
      thresholdUSD: Number(editingGiftTier.thresholdUSD) || Math.round((Number(editingGiftTier.thresholdHKD) || 0) * 0.128),
      label_zh: editingGiftTier.label_zh || "",
      label_en: editingGiftTier.label_en || "",
      giftValueHKD: Number(editingGiftTier.giftValueHKD) || 0,
      gifts: editingGiftTier.gifts || []
    }
    if (isAddingGiftTier) await db.createGiftTier(tier)
    else await db.updateGiftTier(tier.id, tier)
    showToast("success", `贈品門檻已${isAddingGiftTier ? "新增" : "更新"}: ${tier.label_zh}`)
    setEditingGiftTier(null)
    setIsAddingGiftTier(false)
    refresh()
  }

  const handleDeleteGiftTier = async (id: string) => {
    if (!confirm(`確定刪除贈品門檻 ${id}？`)) return
    const db = getDBClient()
    await db.deleteGiftTier(id)
    showToast("success", `已刪除贈品門檻: ${id}`)
    refresh()
  }

  // User role update
  const handleToggleUserRole = async (userId: string, newRole: "customer" | "admin") => {
    if (userId === user?.id && newRole !== "admin" && !confirm("你正在移除自己的管理員權限，確定嗎？")) return
    const db = getDBClient()
    await db.updateUser(userId, { role: newRole })
    showToast("success", `用戶角色已更新為 ${newRole}`)
    refresh()
    if (userId === user?.id) fetchMe()
  }

  if (!hasCheckedSession || !user || user.role !== "admin") {
    return <main className="w-[min(calc(100%-48px),1440px)] mx-auto py-20 text-center text-[13px] text-[#8F8881]">Loading admin panel...</main>
  }

  return (
    <main className="w-[min(calc(100%-48px),1600px)] mx-auto py-8">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h1 className="font-serif text-[32px]">Admin Panel • CRM</h1>
          <p className="text-[12px] text-[#8F8881] mt-1">管理產品、訂單、優惠碼、用戶及營運數據</p>
        </div>
        <button onClick={refresh} className="border border-[#ECE6DF] px-4 h-8 text-[11px] uppercase hover:bg-[#FBF6F0]">↻ Refresh</button>
      </div>

      <div className="flex gap-2 mb-8 text-[11px] uppercase tracking-[0.14em] flex-wrap">
        {(["crm","products","orders","coupons","bundles"] as const).map(t=>
          <button key={t} onClick={()=>setTab(t)} className={`border px-4 h-8 ${tab===t?"bg-black text-white border-black":"bg-white border-[#ECE6DF] hover:border-[#111]"}`}>{t}</button>
        )}
      </div>

      {/* CRM Tab */}
      {tab==="crm" && (
        <>
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border border-[#ECE6DF] p-5">
              <p className="text-[10px] uppercase text-[#8F8881]">Revenue</p>
              <p className="font-serif text-[24px]">HK${totalRevenue.toLocaleString()}</p>
              <p className="text-[11px] text-green-600 mt-1">{paidOrders.length} paid orders</p>
            </div>
            <div className="bg-white border border-[#ECE6DF] p-5">
              <p className="text-[10px] uppercase text-[#8F8881]">Orders</p>
              <p className="font-serif text-[24px]">{orders.length}</p>
              <p className="text-[11px] text-[#8F8881] mt-1">Avg: HK${orders.length?Math.round(totalRevenue/orders.length):0}</p>
            </div>
            <div className="bg-white border border-[#ECE6DF] p-5">
              <p className="text-[10px] uppercase text-[#8F8881]">Users CRM</p>
              <p className="font-serif text-[24px]">{users.length}</p>
              <p className="text-[11px] text-[#8F8881] mt-1">New this month: {newUsersThisMonth}</p>
            </div>
            <div className="bg-white border border-[#ECE6DF] p-5">
              <p className="text-[10px] uppercase text-[#8F8881]">Products</p>
              <p className="font-serif text-[24px]">{products.length}</p>
              <p className="text-[11px] text-[#8F8881] mt-1">{products.filter(p=>p.isBundle).length} bundles</p>
            </div>
          </div>

          {/* Tier breakdown */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {(["Member","VIP","Prestige"] as const).map(tier => {
              const tierUsers = users.filter(u=>u.tier===tier)
              return (
                <div key={tier} className="bg-white border border-[#ECE6DF] p-4">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#8F8881]">{tier} Members</p>
                  <p className="font-serif text-[20px]">{tierUsers.length}</p>
                </div>
              )
            })}
          </div>

          <div className="bg-white border border-[#ECE6DF] overflow-auto">
            <div className="p-4 border-b border-[#F2ECE4] flex justify-between items-center">
              <h3 className="text-[12px] uppercase font-semibold">Users CRM ({users.length})</h3>
              <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Search users..." className="border border-[#ECE6DF] h-8 px-3 text-[11px] w-48"/>
            </div>
            <table className="w-full text-[12px] text-left">
              <thead className="bg-[#FBF6F0] text-[10px] uppercase tracking-[0.14em]">
                <tr><th className="p-3">User</th><th className="p-3">Email</th><th className="p-3">Tier</th><th className="p-3">Points</th><th className="p-3">Spent</th><th className="p-3">Orders</th><th className="p-3">Birthday</th><th className="p-3">Newsletter</th><th className="p-3">Role</th><th className="p-3">Actions</th></tr>
              </thead>
              <tbody>{users.filter(u=> {
                if (!searchTerm) return true
                return (u.username+u.email).toLowerCase().includes(searchTerm.toLowerCase())
              }).map(u=>(
                <tr key={u.id} className="border-t border-[#F2ECE4] hover:bg-[#FBF6F0]">
                  <td className="p-3 font-medium">{u.username}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3"><span className="bg-[#111] text-white px-2 py-[1px] text-[10px]">{u.tier}</span></td>
                  <td className="p-3">{u.points}</td>
                  <td className="p-3">HK${u.totalSpentHKD}</td>
                  <td className="p-3">{u.totalOrders}</td>
                  <td className="p-3">{u.birthday||"-"} {u.birthday && new Date(u.birthday).getMonth()===new Date().getMonth() && "🎂"}</td>
                  <td className="p-3">{u.newsletter?"✓":"-"}</td>
                  <td className="p-3">
                    <select value={u.role} onChange={e=>handleToggleUserRole(u.id, e.target.value as any)} className="border border-[#ECE6DF] text-[10px] h-6 px-1">
                      <option value="customer">customer</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="p-3 text-[10px] text-[#8F8881]">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}

      {/* Products Tab */}
      {tab==="products" && (
        <div className="bg-white border border-[#ECE6DF] overflow-auto">
          <div className="p-4 flex justify-between items-center border-b border-[#F2ECE4]">
            <h3 className="text-[12px] uppercase font-semibold">Products & Inventory ({products.length})</h3>
            <div className="flex gap-2">
              <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Search SKU, name..." className="border border-[#ECE6DF] h-8 px-3 text-[11px] w-48"/>
              <button onClick={()=>openProductEditor({}, true)} className="bg-[#111] text-white px-4 h-8 text-[11px] uppercase">+ Add Product</button>
            </div>
          </div>

          {/* Product Edit/Add Form */}
          {editingProduct && (
            <div ref={productEditorRef} className="p-6 bg-[#FBF6F0] border-b border-[#ECE6DF]">
              <h4 className="text-[12px] uppercase font-semibold mb-4">{isAdding ? "+ Add New Product" : `Edit: ${editingProduct.name_zh}`}</h4>
              <div className="grid md:grid-cols-3 gap-4 text-[12px]">
                <div><label className="text-[10px] uppercase text-[#8F8881]">名稱 (中) *</label><input value={editingProduct.name_zh||""} onChange={e=>setEditingProduct({...editingProduct, name_zh: e.target.value})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1"/></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">Name (EN)</label><input value={editingProduct.name_en||""} onChange={e=>setEditingProduct({...editingProduct, name_en: e.target.value})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1"/></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">SKU *</label><input value={editingProduct.sku||""} onChange={e=>setEditingProduct({...editingProduct, sku: e.target.value})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1"/></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">Slug</label><input value={editingProduct.slug||""} onChange={e=>setEditingProduct({...editingProduct, slug: e.target.value})} placeholder="auto-generated" className="w-full border border-[#ECE6DF] h-9 px-2 mt-1"/></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">Price HKD *</label><input type="number" value={editingProduct.price_hkd||""} onChange={e=>setEditingProduct({...editingProduct, price_hkd: Number(e.target.value)})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1"/></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">Price USD</label><input type="number" step="0.01" value={editingProduct.price_usd||""} onChange={e=>setEditingProduct({...editingProduct, price_usd: Number(e.target.value)||undefined})} placeholder="auto" className="w-full border border-[#ECE6DF] h-9 px-2 mt-1"/></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">Original Price HKD</label><input type="number" value={editingProduct.original_price_hkd||""} onChange={e=>setEditingProduct({...editingProduct, original_price_hkd: Number(e.target.value)||undefined})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1"/></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">Stock</label><input type="number" value={editingProduct.stock||0} onChange={e=>setEditingProduct({...editingProduct, stock: Number(e.target.value)})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1"/></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">Series</label>
                  <select value={editingProduct.series||"Other"} onChange={e=>setEditingProduct({...editingProduct, series: e.target.value as any})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1">
                    <option value="CalmEX">CalmEX</option><option value="SoCalm">SoCalm</option><option value="CellRevEX">CellRevEX</option><option value="Other">Other</option>
                  </select>
                </div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">Points</label><input type="number" value={editingProduct.points||0} onChange={e=>setEditingProduct({...editingProduct, points: Number(e.target.value)})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1"/></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">Weight (kg)</label><input type="number" step="0.01" value={editingProduct.weight_kg||0} onChange={e=>setEditingProduct({...editingProduct, weight_kg: Number(e.target.value)})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1"/></div>
                <div className="md:col-span-2"><label className="text-[10px] uppercase text-[#8F8881]">描述 (中)</label><textarea value={editingProduct.description_zh||""} onChange={e=>setEditingProduct({...editingProduct, description_zh: e.target.value})} className="w-full border border-[#ECE6DF] h-16 px-2 mt-1 text-[11px]"/></div>
                <div className="md:col-span-2"><label className="text-[10px] uppercase text-[#8F8881]">Description (EN)</label><textarea value={editingProduct.description_en||""} onChange={e=>setEditingProduct({...editingProduct, description_en: e.target.value})} className="w-full border border-[#ECE6DF] h-16 px-2 mt-1 text-[11px]"/></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">Images (comma URLs)</label><input value={(editingProduct.images||[]).join(",")} onChange={e=>setEditingProduct({...editingProduct, images: e.target.value.split(",").map(s=>s.trim()).filter(Boolean)})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 text-[10px]"/></div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 text-[11px]">
                    <input type="checkbox" checked={editingProduct.isBundle||false} onChange={e=>setEditingProduct({...editingProduct, isBundle: e.target.checked})}/>
                    Bundle?
                  </label>
                  {editingProduct.isBundle && (
                    <div><label className="text-[10px] uppercase text-[#8F8881]">Bundle Label</label><input value={editingProduct.bundleGiftLabel||""} onChange={e=>setEditingProduct({...editingProduct, bundleGiftLabel: e.target.value})} className="border border-[#ECE6DF] h-9 px-2 ml-2 text-[11px] w-28"/></div>
                  )}
                </div>
                {editingProduct.isBundle && <div className="md:col-span-2"><label className="text-[10px] uppercase text-[#8F8881]">Bundle Items (productId:qty, comma)</label><input value={serializeBundleItems(editingProduct.bundleItems)} onChange={e=>setEditingProduct({...editingProduct, bundleItems: parseBundleItems(e.target.value)})} placeholder="p_001_miracle_mask:1,p_002_calming_ampoule:1" className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 text-[10px]"/></div>}
                <div><label className="text-[10px] uppercase text-[#8F8881]">Category (comma)</label><input value={(editingProduct.category||[]).join(",")} onChange={e=>setEditingProduct({...editingProduct, category: e.target.value.split(",").map(s=>s.trim()).filter(Boolean)})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 text-[10px]"/></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">Skin Type (comma)</label><input value={(editingProduct.skinType||[]).join(",")} onChange={e=>setEditingProduct({...editingProduct, skinType: e.target.value.split(",").map(s=>s.trim()).filter(Boolean)})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 text-[10px]"/></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">Tags (comma)</label><input value={(editingProduct.tags||[]).join(",")} onChange={e=>setEditingProduct({...editingProduct, tags: e.target.value.split(",").map(s=>s.trim()).filter(Boolean)})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 text-[10px]"/></div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveProduct} className="bg-[#111] text-white px-6 h-9 text-[11px] uppercase">{isAdding?"Create Product":"Save Changes"}</button>
                <button onClick={()=>{setEditingProduct(null); setIsAdding(false)}} className="border border-[#ECE6DF] px-6 h-9 text-[11px] uppercase">Cancel</button>
              </div>
            </div>
          )}

          <table className="w-full text-[12px] text-left">
            <thead className="bg-[#FBF6F0] text-[10px] uppercase">
              <tr><th className="p-3">SKU</th><th className="p-3">Name</th><th className="p-3">Series</th><th className="p-3">Price HKD</th><th className="p-3">Stock</th><th className="p-3">Points</th><th className="p-3">Bundle?</th><th className="p-3">Actions</th></tr>
            </thead>
            <tbody>{filteredProducts.map(p=>(
              <tr key={p.id} className="border-t border-[#F2ECE4] hover:bg-[#FBF6F0]">
                <td className="p-3 font-mono text-[11px]">{p.sku}</td>
                <td className="p-3">{p.name_zh}<br/><span className="text-[10px] text-[#8F8881]">{p.name_en}</span></td>
                <td className="p-3">{p.series}</td>
                <td className="p-3">HK${p.price_hkd} {p.original_price_hkd ? <span className="text-[10px] text-[#BBB5AD] line-through ml-1">HK${p.original_price_hkd}</span> : ""}</td>
                <td className="p-3"><span className={p.stock<=5?"text-red-500 font-semibold":""}>{p.stock}</span></td>
                <td className="p-3">{p.points}</td>
                <td className="p-3">{p.isBundle?<span className="bg-[#111] text-white px-1 text-[10px]">✔</span>:"-"}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button onClick={()=>openProductEditor(cloneProductForEdit(p), false)} className="underline text-[#8F8881] hover:text-[#111]">Edit</button>
                    <button onClick={()=>handleDeleteProduct(p.id, p.name_zh)} className="underline text-red-400 hover:text-red-600">Delete</button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {/* Orders Tab */}
      {tab==="orders" && (
        <div className="space-y-4">
          {/* Order stats */}
          <div className="grid md:grid-cols-5 gap-3">
            {(["all","pending","paid","shipped","delivered"] as const).map(s => (
              <button key={s} onClick={()=>setOrderFilter(s)} className={`border px-4 py-3 text-center text-[11px] ${orderFilter===s?"bg-[#111] text-white border-[#111]":"bg-white border-[#ECE6DF]"}`}>
                <p className="uppercase tracking-[0.12em]">{s}</p>
                <p className="font-serif text-[18px] mt-1">{s==="all"?orders.length:orders.filter(o=>o.status===s).length}</p>
              </button>
            ))}
          </div>

          <div className="bg-white border border-[#ECE6DF] overflow-auto">
            <table className="w-full text-[12px] text-left">
              <thead className="bg-[#FBF6F0] text-[10px] uppercase">
                <tr><th className="p-3">Order ID</th><th className="p-3">User</th><th className="p-3">Items</th><th className="p-3">Total HKD</th><th className="p-3">Coupon</th><th className="p-3">Gifts</th><th className="p-3">Points</th><th className="p-3">Status</th><th className="p-3">Date</th><th className="p-3">Actions</th></tr>
              </thead>
              <tbody>{filteredOrders.map(o=>{
                const orderUser = users.find(u=>u.id===o.userId)
                return (
                  <tr key={o.id} className="border-t border-[#F2ECE4] hover:bg-[#FBF6F0]">
                    <td className="p-3 font-mono text-[11px]">{o.id}</td>
                    <td className="p-3">{orderUser?.username || o.userId}<br/><span className="text-[10px] text-[#8F8881]">{orderUser?.email}</span></td>
                    <td className="p-3">{o.items.length}</td>
                    <td className="p-3 font-medium">HK${o.totalHKD}</td>
                    <td className="p-3">{o.couponCode||"-"}</td>
                    <td className="p-3">{o.gifts.length>0 ? `🎁 ${o.gifts.length} items` : "-"}</td>
                    <td className="p-3 text-[11px]">+{o.pointsEarned} {o.pointsUsed > 0 ? `(-${o.pointsUsed})` : ""}</td>
                    <td className="p-3">
                      <select value={o.status} onChange={e=>handleUpdateOrderStatus(o.id, e.target.value as any)} className={`border text-[10px] h-6 px-1 ${
                        o.status==="paid"?"bg-green-50 border-green-200":
                        o.status==="shipped"?"bg-blue-50 border-blue-200":
                        o.status==="delivered"?"bg-[#111] text-white border-[#111]":
                        o.status==="cancelled"?"bg-red-50 border-red-200":""
                      }`}>
                        <option value="pending">pending</option><option value="paid">paid</option><option value="shipped">shipped</option><option value="delivered">delivered</option><option value="cancelled">cancelled</option>
                      </select>
                    </td>
                    <td className="p-3 text-[11px]">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">
                      <button onClick={()=>{
                        alert(`Order Details:\n${o.items.map(i=>`  ${i.productId} x${i.qty}`).join("\n")}\nAddress: ${o.shippingAddress?.name}, ${o.shippingAddress?.address}, ${o.shippingAddress?.district}`)
                      }} className="underline text-[#8F8881] text-[10px]">View</button>
                    </td>
                  </tr>
                )
              })}</tbody>
            </table>
            {filteredOrders.length===0 && <p className="p-8 text-center text-[12px] text-[#8F8881]">No orders found.</p>}
          </div>
        </div>
      )}

      {/* Coupons Tab */}
      {tab==="coupons" && (
        <div className="space-y-4">
          <div className="grid lg:grid-cols-[1fr_380px] gap-4">
            <div className="bg-white border border-[#ECE6DF] p-6 overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[12px] uppercase font-semibold">Promotion Coupons ({coupons.length})</h3>
                <button
                  onClick={()=>{
                    setEditingCoupon({ type: "percent", value: 10, isActive: true, usedCount: 0, validFrom: new Date().toISOString().slice(0,10), validTo: "2026-12-31" })
                    setIsAddingCoupon(true)
                  }}
                  className="bg-[#111] text-white px-4 h-8 text-[11px] uppercase"
                >+ Add Coupon</button>
              </div>
              {editingCoupon && (
                <div className="mb-5 bg-[#FBF6F0] border border-[#ECE6DF] p-4">
                  <h4 className="text-[11px] uppercase font-semibold mb-3">{isAddingCoupon ? "Create Coupon" : `Edit Coupon: ${editingCoupon.code}`}</h4>
                  <div className="grid md:grid-cols-4 gap-3 text-[11px]">
                    <div><label className="text-[10px] uppercase text-[#8F8881]">Code *</label><input value={editingCoupon.code||""} disabled={!isAddingCoupon} onChange={e=>setEditingCoupon({...editingCoupon, code: e.target.value.toUpperCase()})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 uppercase disabled:bg-[#F2ECE4]"/></div>
                    <div><label className="text-[10px] uppercase text-[#8F8881]">Type</label><select value={editingCoupon.type||"percent"} onChange={e=>setEditingCoupon({...editingCoupon, type: e.target.value as any})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1"><option value="percent">percent</option><option value="fixed">fixed</option></select></div>
                    <div><label className="text-[10px] uppercase text-[#8F8881]">Value</label><input type="number" value={editingCoupon.value||0} onChange={e=>setEditingCoupon({...editingCoupon, value: Number(e.target.value)})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1"/></div>
                    <div><label className="text-[10px] uppercase text-[#8F8881]">Currency</label><select value={editingCoupon.currency||"HKD"} onChange={e=>setEditingCoupon({...editingCoupon, currency: e.target.value as any})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1"><option value="HKD">HKD</option><option value="USD">USD</option></select></div>
                    <div><label className="text-[10px] uppercase text-[#8F8881]">Min HKD</label><input type="number" value={editingCoupon.minAmountHKD||""} onChange={e=>setEditingCoupon({...editingCoupon, minAmountHKD: Number(e.target.value)||undefined})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1"/></div>
                    <div><label className="text-[10px] uppercase text-[#8F8881]">Min USD</label><input type="number" value={editingCoupon.minAmountUSD||""} onChange={e=>setEditingCoupon({...editingCoupon, minAmountUSD: Number(e.target.value)||undefined})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1"/></div>
                    <div><label className="text-[10px] uppercase text-[#8F8881]">Max Uses</label><input type="number" value={editingCoupon.maxUses||""} onChange={e=>setEditingCoupon({...editingCoupon, maxUses: Number(e.target.value)||undefined})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1"/></div>
                    <div><label className="text-[10px] uppercase text-[#8F8881]">Used</label><input type="number" value={editingCoupon.usedCount||0} onChange={e=>setEditingCoupon({...editingCoupon, usedCount: Number(e.target.value)})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1"/></div>
                    <div><label className="text-[10px] uppercase text-[#8F8881]">Valid From</label><input type="date" value={editingCoupon.validFrom||""} onChange={e=>setEditingCoupon({...editingCoupon, validFrom: e.target.value})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1"/></div>
                    <div><label className="text-[10px] uppercase text-[#8F8881]">Valid To</label><input type="date" value={editingCoupon.validTo||""} onChange={e=>setEditingCoupon({...editingCoupon, validTo: e.target.value})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1"/></div>
                    <label className="flex items-end gap-2 pb-2"><input type="checkbox" checked={!!editingCoupon.onlyFirstOrder} onChange={e=>setEditingCoupon({...editingCoupon, onlyFirstOrder: e.target.checked})}/> First order only</label>
                    <label className="flex items-end gap-2 pb-2"><input type="checkbox" checked={editingCoupon.isActive ?? true} onChange={e=>setEditingCoupon({...editingCoupon, isActive: e.target.checked})}/> Active</label>
                    <div className="md:col-span-2"><label className="text-[10px] uppercase text-[#8F8881]">Description ZH</label><input value={editingCoupon.description_zh||""} onChange={e=>setEditingCoupon({...editingCoupon, description_zh: e.target.value})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1"/></div>
                    <div className="md:col-span-2"><label className="text-[10px] uppercase text-[#8F8881]">Description EN</label><input value={editingCoupon.description_en||""} onChange={e=>setEditingCoupon({...editingCoupon, description_en: e.target.value})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1"/></div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={handleSaveCoupon} className="bg-[#111] text-white px-5 h-9 text-[11px] uppercase">{isAddingCoupon?"Create":"Save"}</button>
                    <button onClick={()=>{setEditingCoupon(null); setIsAddingCoupon(false)}} className="border border-[#ECE6DF] px-5 h-9 text-[11px] uppercase">Cancel</button>
                  </div>
                </div>
              )}
              <table className="w-full text-[12px]">
                <thead><tr className="text-[10px] uppercase text-[#8F8881]"><th className="text-left p-2">Code</th><th className="text-left p-2">Type</th><th className="text-left p-2">Value</th><th className="text-left p-2">Min HKD</th><th className="text-left p-2">First Only</th><th className="text-left p-2">Active</th><th className="text-left p-2">Used</th><th className="text-left p-2">Validity</th><th className="text-left p-2">Actions</th></tr></thead>
                <tbody>{coupons.map(c=>(
                  <tr key={c.code} className="border-t border-[#F2ECE4]">
                    <td className="p-2 font-mono font-semibold">{c.code}</td>
                    <td className="p-2">{c.type}</td>
                    <td className="p-2">{c.value}{c.type==="percent"?"%":` ${c.currency||"HKD"}`}</td>
                    <td className="p-2">{c.minAmountHKD||"-"}</td>
                    <td className="p-2">{c.onlyFirstOrder?"✔":"-"}</td>
                    <td className="p-2"><button onClick={()=>handleToggleCoupon(c.code, !c.isActive)} className={`px-2 py-[1px] text-[10px] ${c.isActive?"bg-green-100 text-green-700":"bg-gray-100 text-gray-500"}`}>{c.isActive?"Active":"Inactive"}</button></td>
                    <td className="p-2">{c.usedCount}{c.maxUses?`/${c.maxUses}`:""}</td>
                    <td className="p-2 text-[10px] text-[#8F8881]">{c.validFrom} → {c.validTo}</td>
                    <td className="p-2"><div className="flex gap-2"><button onClick={()=>{setEditingCoupon({...c}); setIsAddingCoupon(false)}} className="underline text-[#8F8881]">Edit</button><button onClick={()=>handleDeleteCoupon(c.code)} className="underline text-red-400">Delete</button></div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>

            <div className="bg-white border border-[#ECE6DF] p-6 h-fit">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[12px] uppercase font-semibold">Gift Tiers ({giftTiers.length})</h3>
                <button onClick={()=>{setEditingGiftTier({ id: "gift_tier_" + Date.now(), thresholdHKD: 2000, thresholdUSD: 255, giftValueHKD: 0, gifts: [] }); setIsAddingGiftTier(true)}} className="bg-[#111] text-white px-3 h-8 text-[10px] uppercase">+ Add</button>
              </div>
              {editingGiftTier && (
                <div className="bg-[#FBF6F0] border border-[#ECE6DF] p-4 mb-4 text-[11px]">
                  <h4 className="uppercase font-semibold mb-3">{isAddingGiftTier ? "Create Gift Tier" : `Edit: ${editingGiftTier.id}`}</h4>
                  <div className="space-y-3">
                    <input value={editingGiftTier.id||""} disabled={!isAddingGiftTier} onChange={e=>setEditingGiftTier({...editingGiftTier, id: e.target.value})} placeholder="ID" className="w-full border border-[#ECE6DF] h-9 px-2 disabled:bg-[#F2ECE4]"/>
                    <div className="grid grid-cols-2 gap-2"><input type="number" value={editingGiftTier.thresholdHKD||0} onChange={e=>setEditingGiftTier({...editingGiftTier, thresholdHKD: Number(e.target.value)})} placeholder="Threshold HKD" className="border border-[#ECE6DF] h-9 px-2"/><input type="number" value={editingGiftTier.thresholdUSD||0} onChange={e=>setEditingGiftTier({...editingGiftTier, thresholdUSD: Number(e.target.value)})} placeholder="Threshold USD" className="border border-[#ECE6DF] h-9 px-2"/></div>
                    <input value={editingGiftTier.label_zh||""} onChange={e=>setEditingGiftTier({...editingGiftTier, label_zh: e.target.value})} placeholder="中文標籤" className="w-full border border-[#ECE6DF] h-9 px-2"/>
                    <input value={editingGiftTier.label_en||""} onChange={e=>setEditingGiftTier({...editingGiftTier, label_en: e.target.value})} placeholder="English label" className="w-full border border-[#ECE6DF] h-9 px-2"/>
                    <input type="number" value={editingGiftTier.giftValueHKD||0} onChange={e=>setEditingGiftTier({...editingGiftTier, giftValueHKD: Number(e.target.value)})} placeholder="Gift value HKD" className="w-full border border-[#ECE6DF] h-9 px-2"/>
                    <textarea value={serializeGiftList(editingGiftTier.gifts)} onChange={e=>setEditingGiftTier({...editingGiftTier, gifts: parseGiftList(e.target.value)})} rows={5} placeholder="每行：中文名稱|English name|qty" className="w-full border border-[#ECE6DF] px-2 py-2 text-[10px]"/>
                  </div>
                  <div className="flex gap-2 mt-3"><button onClick={handleSaveGiftTier} className="bg-[#111] text-white px-4 h-8 text-[10px] uppercase">Save</button><button onClick={()=>{setEditingGiftTier(null); setIsAddingGiftTier(false)}} className="border border-[#ECE6DF] px-4 h-8 text-[10px] uppercase">Cancel</button></div>
                </div>
              )}
              <div className="space-y-3">
                {giftTiers.map(t=>(
                  <div key={t.id} className="border border-[#F2ECE4] p-3 text-[11px]">
                    <div className="flex justify-between gap-3"><p className="font-semibold">{t.label_zh}</p><p>HK${t.thresholdHKD}</p></div>
                    <p className="text-[#8F8881]">{t.gifts.reduce((a,b)=>a+b.qty,0)} gifts • value HK${t.giftValueHKD}</p>
                    <div className="mt-2 flex gap-2"><button onClick={()=>{setEditingGiftTier(cloneGiftTierForEdit(t)); setIsAddingGiftTier(false)}} className="underline text-[#8F8881]">Edit</button><button onClick={()=>handleDeleteGiftTier(t.id)} className="underline text-red-400">Delete</button></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-[#FBF6F0] border border-[#ECE6DF] p-6 text-[12px] leading-relaxed">
            <h4 className="font-semibold mb-2">Promotion Engine Status</h4>
            <ul className="list-disc pl-5 space-y-1 text-[#5C5651]">
              <li>Coupons support percentage/fixed discount, first-order rule, min spend, max usage and date range.</li>
              <li>BIRTHDAY10 is restricted to the customer birthday month in cart/checkout.</li>
              <li>Gift tiers are editable and automatically selected by highest eligible threshold.</li>
              <li>Free shipping: over HK$800 / USD$100. Points: 1 HKD = 1 point, 100 pts = HK$1.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Bundles Tab */}
      {tab==="bundles" && (
        <div className="grid md:grid-cols-2 gap-4">
          {products.filter(p=>p.isBundle).map(b=>(
            <div key={b.id} className="bg-white border border-[#ECE6DF] p-5">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-serif text-[18px]">{b.name_zh}</h4>
                  <p className="text-[12px] text-[#5C5651]">{b.name_en}</p>
                </div>
                <button onClick={()=>{setTab("products"); openProductEditor(cloneProductForEdit(b), false)}} className="underline text-[11px] text-[#8F8881]">Edit</button>
              </div>
              <p className="text-[11px] text-[#8F8881] mt-2">{b.bundleGiftLabel} • HK${b.price_hkd} (原 HK${b.original_price_hkd}) • Stock: {b.stock}</p>
              <p className="text-[12px] mt-2">{b.description_zh}</p>
              {b.bundleItems && (
                <div className="mt-3 pt-3 border-t border-[#F2ECE4] text-[11px] text-[#8F8881]">
                  <p className="font-semibold text-[10px] uppercase mb-1">Bundle Contents:</p>
                  {b.bundleItems.map((bi, i) => {
                    const bp = products.find(p=>p.id===bi.productId)
                    return <p key={i}>• {bp?.name_zh || bi.productId} x{bi.qty}</p>
                  })}
                </div>
              )}
            </div>
          ))}
          <button onClick={()=>{setTab("products"); openProductEditor({ isBundle: true, bundleGiftLabel: "買2送3", category: ["套裝"], skinType: ["敏感肌"], tags: ["官網限定"] }, true)}} className="border-2 border-dashed border-[#ECE6DF] p-5 text-center text-[12px] text-[#8F8881] hover:border-[#111] hover:text-[#111] transition cursor-pointer">
            + Create New Bundle
          </button>
        </div>
      )}
    </main>
  )
}
