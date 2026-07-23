import { useEffect, useState, useMemo } from "react"
import { useAuthStore } from "../../stores/useAuthStore"
import { getDBClient } from "../../lib/db/client"
import { Product, User, Order, Coupon, GiftTier, SiteSettings } from "../../lib/db/types"
import { useNavigate } from "react-router-dom"
import { showToast } from "../../components/ui/Toast"
import { useAppStore } from "../../stores/useAppStore"
import { useThemeStore } from "../../stores/useThemeStore"

type AdminTab = "dashboard" | "crm" | "products" | "orders" | "coupons" | "bundles" | "gifts" | "settings"

export function AdminPage() {
  const { user } = useAuthStore()
  const { lang } = useAppStore()
  const { loadSettings: reloadTheme } = useThemeStore()
  const nav = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [giftTiers, setGiftTiers] = useState<GiftTier[]>([])
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [tab, setTab] = useState<AdminTab>("dashboard")
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [orderFilter, setOrderFilter] = useState<string>("all")

  // Coupon editing
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon> | null>(null)
  const [isAddingCoupon, setIsAddingCoupon] = useState(false)

  useEffect(() => {
    if (!user || user.role !== "admin") { nav("/login"); return }
    refresh()
  }, [user])

  const refresh = async () => {
    const db = getDBClient()
    setProducts(await db.getProducts())
    setUsers(await db.getUsers())
    setOrders(await db.getOrders())
    setCoupons(await db.getCoupons())
    setGiftTiers(await db.getGiftTiers())
    setSettings(await db.getSiteSettings())
  }

  // Analytics calculations
  const totalRevenue = orders.reduce((a, b) => a + b.totalHKD, 0)
  const paidOrders = orders.filter(o => o.status === "paid" || o.status === "shipped" || o.status === "delivered")
  const newUsersThisMonth = users.filter(u => new Date(u.createdAt).getMonth() === new Date().getMonth()).length
  const thisMonthRevenue = orders.filter(o => new Date(o.createdAt).getMonth() === new Date().getMonth()).reduce((a, b) => a + b.totalHKD, 0)

  // Top products by orders
  const topProducts = useMemo(() => {
    const productSales: Record<string, { qty: number; revenue: number; name: string }> = {}
    orders.forEach(o => {
      o.items.forEach(item => {
        if (!productSales[item.productId]) {
          const p = products.find(pr => pr.id === item.productId)
          productSales[item.productId] = { qty: 0, revenue: 0, name: p?.name_zh || item.productId }
        }
        productSales[item.productId].qty += item.qty
        productSales[item.productId].revenue += item.priceHKDAtPurchase * item.qty
      })
    })
    return Object.entries(productSales)
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 10)
      .map(([id, data]) => ({ id, ...data }))
  }, [orders, products])

  // Revenue by month (last 6 months)
  const revenueByMonth = useMemo(() => {
    const months: { label: string; revenue: number; orders: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const label = d.toLocaleDateString("en", { month: "short", year: "2-digit" })
      const monthOrders = orders.filter(o => {
        const od = new Date(o.createdAt)
        return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear()
      })
      months.push({
        label,
        revenue: monthOrders.reduce((a, b) => a + b.totalHKD, 0),
        orders: monthOrders.length
      })
    }
    return months
  }, [orders])

  const filteredOrders = orderFilter === "all" ? orders : orders.filter(o => o.status === orderFilter)
  const filteredProducts = searchTerm
    ? products.filter(p => (p.name_zh + p.name_en + p.sku + p.id).toLowerCase().includes(searchTerm.toLowerCase()))
    : products

  // ========== Product CRUD ==========
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
        slug: (editingProduct.name_en || editingProduct.name_zh || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "product-" + Date.now(),
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
      await db.updateProduct(editingProduct.id!, editingProduct)
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

  // ========== Order status update ==========
  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order["status"]) => {
    const db = getDBClient()
    await db.updateOrder(orderId, { status: newStatus })
    showToast("success", `訂單 ${orderId} 狀態已更新為 ${newStatus}`)
    refresh()
  }

  // ========== Coupon CRUD ==========
  const handleSaveCoupon = async () => {
    if (!editingCoupon) return
    const db = getDBClient()
    if (isAddingCoupon) {
      if (!editingCoupon.code || !editingCoupon.type || editingCoupon.value === undefined) {
        showToast("error", "請填寫代碼、類型和數值")
        return
      }
      const newCoupon: Coupon = {
        code: editingCoupon.code.toUpperCase(),
        type: editingCoupon.type || "percent",
        value: editingCoupon.value || 0,
        minAmountHKD: editingCoupon.minAmountHKD,
        minAmountUSD: editingCoupon.minAmountUSD,
        validFrom: editingCoupon.validFrom || new Date().toISOString().split("T")[0],
        validTo: editingCoupon.validTo || "2027-12-31",
        onlyFirstOrder: editingCoupon.onlyFirstOrder || false,
        description_zh: editingCoupon.description_zh || "",
        description_en: editingCoupon.description_en || "",
        isActive: editingCoupon.isActive !== false,
        usedCount: 0,
        maxUses: editingCoupon.maxUses
      }
      await db.createCoupon(newCoupon)
      showToast("success", `優惠碼 ${newCoupon.code} 已新增`)
    } else {
      await db.updateCoupon(editingCoupon.code!, editingCoupon)
      showToast("success", `優惠碼 ${editingCoupon.code} 已更新`)
    }
    setEditingCoupon(null)
    setIsAddingCoupon(false)
    refresh()
  }

  const handleDeleteCoupon = async (code: string) => {
    if (!confirm(`確定刪除優惠碼「${code}」？`)) return
    const db = getDBClient()
    await db.deleteCoupon(code)
    showToast("success", `已刪除: ${code}`)
    refresh()
  }

  const handleToggleCoupon = async (code: string, isActive: boolean) => {
    const db = getDBClient()
    await db.updateCoupon(code, { isActive })
    showToast("success", `優惠碼 ${code} 已${isActive ? "啟用" : "停用"}`)
    refresh()
  }

  // ========== Gift Tier Management ==========
  const handleSaveGiftTiers = async () => {
    const db = getDBClient()
    await db.updateGiftTiers(giftTiers)
    showToast("success", "Gift tiers updated")
    refresh()
  }

  // ========== User role update ==========
  const handleToggleUserRole = async (userId: string, newRole: "customer" | "admin") => {
    const db = getDBClient()
    await db.updateUser(userId, { role: newRole })
    showToast("success", `用戶角色已更新為 ${newRole}`)
    refresh()
  }

  // ========== Settings ==========
  const handleSaveSettings = async () => {
    if (!settings) return
    const db = getDBClient()
    await db.updateSiteSettings(settings)
    await reloadTheme()
    showToast("success", "設定已儲存 Settings saved")
    refresh()
  }

  const tabLabels: Record<AdminTab, string> = {
    dashboard: "📊 Dashboard",
    crm: "👥 CRM",
    products: "📦 Products",
    orders: "🛒 Orders",
    coupons: "🏷️ Coupons",
    bundles: "🎁 Bundles",
    gifts: "🎀 Gift Tiers",
    settings: "⚙️ Settings"
  }

  return (
    <main className="w-[min(calc(100%-24px),1600px)] mx-auto py-6 md:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-2">
        <div>
          <h1 className="font-serif text-[28px] md:text-[32px]">Admin Panel</h1>
          <p className="text-[12px] text-[#8F8881] mt-1">管理產品、訂單、優惠碼、用戶及營運數據</p>
        </div>
        <button onClick={refresh} className="border border-[#ECE6DF] px-4 h-8 text-[11px] uppercase hover:bg-[#FBF6F0]">↻ Refresh</button>
      </div>

      <div className="flex gap-1.5 mb-8 text-[10px] md:text-[11px] uppercase tracking-[0.12em] flex-wrap overflow-x-auto pb-2">
        {(Object.keys(tabLabels) as AdminTab[]).map(t =>
          <button key={t} onClick={() => setTab(t)} className={`border px-3 md:px-4 h-8 whitespace-nowrap ${tab === t ? "bg-black text-white border-black" : "bg-white border-[#ECE6DF] hover:border-[#111]"}`}>{tabLabels[t]}</button>
        )}
      </div>

      {/* ==================== DASHBOARD TAB ==================== */}
      {tab === "dashboard" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-[#ECE6DF] p-5">
              <p className="text-[10px] uppercase text-[#8F8881]">Total Revenue</p>
              <p className="font-serif text-[22px] md:text-[28px]">HK${totalRevenue.toLocaleString()}</p>
              <p className="text-[11px] text-green-600 mt-1">{paidOrders.length} paid orders</p>
            </div>
            <div className="bg-white border border-[#ECE6DF] p-5">
              <p className="text-[10px] uppercase text-[#8F8881]">This Month</p>
              <p className="font-serif text-[22px] md:text-[28px]">HK${thisMonthRevenue.toLocaleString()}</p>
              <p className="text-[11px] text-[#8F8881] mt-1">{orders.filter(o => new Date(o.createdAt).getMonth() === new Date().getMonth()).length} orders</p>
            </div>
            <div className="bg-white border border-[#ECE6DF] p-5">
              <p className="text-[10px] uppercase text-[#8F8881]">Users</p>
              <p className="font-serif text-[22px] md:text-[28px]">{users.length}</p>
              <p className="text-[11px] text-[#8F8881] mt-1">New this month: {newUsersThisMonth}</p>
            </div>
            <div className="bg-white border border-[#ECE6DF] p-5">
              <p className="text-[10px] uppercase text-[#8F8881]">Products</p>
              <p className="font-serif text-[22px] md:text-[28px]">{products.length}</p>
              <p className="text-[11px] text-[#8F8881] mt-1">{products.filter(p => p.isBundle).length} bundles • {products.filter(p => p.stock <= 5).length} low stock</p>
            </div>
          </div>

          {/* Revenue Chart (CSS-based bar chart) */}
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h3 className="text-[12px] uppercase font-semibold mb-4">Revenue Trend (Last 6 Months)</h3>
            <div className="flex items-end gap-3 h-[160px] border-b border-[#ECE6DF] pb-2">
              {revenueByMonth.map((m, i) => {
                const maxRev = Math.max(...revenueByMonth.map(x => x.revenue), 1)
                const height = (m.revenue / maxRev) * 100
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                    <p className="text-[10px] text-[#8F8881] mb-1">HK${(m.revenue / 1000).toFixed(0)}k</p>
                    <div className="w-full bg-[#111] rounded-t transition-all duration-500" style={{ height: `${Math.max(height, 4)}%` }}></div>
                    <p className="text-[9px] text-[#8F8881] mt-2">{m.label}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top Products */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white border border-[#ECE6DF] p-6">
              <h3 className="text-[12px] uppercase font-semibold mb-4">Top Products by Sales</h3>
              {topProducts.length === 0 ? <p className="text-[12px] text-[#8F8881]">No sales data yet.</p> :
                <div className="space-y-3">
                  {topProducts.slice(0, 5).map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 text-[12px]">
                      <span className="font-serif text-[16px] text-[#8F8881] w-5">#{i + 1}</span>
                      <div className="flex-1">
                        <p className="font-medium">{p.name}</p>
                        <p className="text-[10px] text-[#8F8881]">{p.qty} sold • HK${p.revenue.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              }
            </div>

            <div className="bg-white border border-[#ECE6DF] p-6">
              <h3 className="text-[12px] uppercase font-semibold mb-4">Membership Tiers</h3>
              <div className="grid grid-cols-3 gap-3">
                {(["Member", "VIP", "Prestige"] as const).map(tier => (
                  <div key={tier} className="bg-[#FBF6F0] p-4 text-center">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[#8F8881]">{tier}</p>
                    <p className="font-serif text-[24px]">{users.filter(u => u.tier === tier).length}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-[11px] text-[#8F8881] space-y-1">
                <p>• Average order value: HK${orders.length ? Math.round(totalRevenue / orders.length) : 0}</p>
                <p>• Points issued total: {users.reduce((a, b) => a + b.points, 0)}</p>
                <p>• Active coupons: {coupons.filter(c => c.isActive).length} / {coupons.length}</p>
              </div>
            </div>
          </div>

          {/* Low Stock Alert */}
          {products.filter(p => p.stock <= 5).length > 0 && (
            <div className="bg-red-50 border border-red-200 p-4">
              <h3 className="text-[12px] uppercase font-semibold mb-2 text-red-700">⚠ Low Stock Alert</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {products.filter(p => p.stock <= 5).map(p => (
                  <div key={p.id} className="text-[11px] text-red-600">
                    <p className="font-medium">{p.name_zh}</p>
                    <p>Stock: {p.stock} • SKU: {p.sku}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== CRM TAB ==================== */}
      {tab === "crm" && (
        <>
          <div className="bg-white border border-[#ECE6DF] overflow-auto">
            <div className="p-4 border-b border-[#F2ECE4] flex flex-wrap justify-between items-center gap-2">
              <h3 className="text-[12px] uppercase font-semibold">Users CRM ({users.length})</h3>
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search users..." className="border border-[#ECE6DF] h-8 px-3 text-[11px] w-48" />
            </div>
            <table className="w-full text-[12px] text-left">
              <thead className="bg-[#FBF6F0] text-[10px] uppercase tracking-[0.14em]">
                <tr><th className="p-3">User</th><th className="p-3">Email</th><th className="p-3">Tier</th><th className="p-3">Points</th><th className="p-3">Spent</th><th className="p-3">Orders</th><th className="p-3">Birthday</th><th className="p-3">Newsletter</th><th className="p-3">Role</th><th className="p-3">Joined</th></tr>
              </thead>
              <tbody>{users.filter(u => {
                if (!searchTerm) return true
                return (u.username + u.email).toLowerCase().includes(searchTerm.toLowerCase())
              }).map(u => (
                <tr key={u.id} className="border-t border-[#F2ECE4] hover:bg-[#FBF6F0]">
                  <td className="p-3 font-medium">{u.username}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3"><span className="bg-[#111] text-white px-2 py-[1px] text-[10px]">{u.tier}</span></td>
                  <td className="p-3">{u.points}</td>
                  <td className="p-3">HK${u.totalSpentHKD}</td>
                  <td className="p-3">{u.totalOrders}</td>
                  <td className="p-3">{u.birthday || "-"} {u.birthday && new Date(u.birthday).getMonth() === new Date().getMonth() && "🎂"}</td>
                  <td className="p-3">{u.newsletter ? "✓" : "-"}</td>
                  <td className="p-3">
                    <select value={u.role} onChange={e => handleToggleUserRole(u.id, e.target.value as any)} className="border border-[#ECE6DF] text-[10px] h-6 px-1">
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

      {/* ==================== PRODUCTS TAB ==================== */}
      {tab === "products" && (
        <div className="bg-white border border-[#ECE6DF] overflow-auto">
          <div className="p-4 flex flex-wrap justify-between items-center gap-2 border-b border-[#F2ECE4]">
            <h3 className="text-[12px] uppercase font-semibold">Products & Inventory ({products.length})</h3>
            <div className="flex gap-2">
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search SKU, name..." className="border border-[#ECE6DF] h-8 px-3 text-[11px] w-40 md:w-48" />
              <button onClick={() => { setEditingProduct({}); setIsAdding(true) }} className="bg-[#111] text-white px-4 h-8 text-[11px] uppercase whitespace-nowrap">+ Add Product</button>
            </div>
          </div>

          {editingProduct && (
            <div className="p-6 bg-[#FBF6F0] border-b border-[#ECE6DF]">
              <h4 className="text-[12px] uppercase font-semibold mb-4">{isAdding ? "+ Add New Product" : `Edit: ${editingProduct.name_zh}`}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[12px]">
                <div><label className="text-[10px] uppercase text-[#8F8881]">名稱 (中) *</label><input value={editingProduct.name_zh || ""} onChange={e => setEditingProduct({ ...editingProduct, name_zh: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">Name (EN)</label><input value={editingProduct.name_en || ""} onChange={e => setEditingProduct({ ...editingProduct, name_en: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">SKU *</label><input value={editingProduct.sku || ""} onChange={e => setEditingProduct({ ...editingProduct, sku: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">Price HKD *</label><input type="number" value={editingProduct.price_hkd || ""} onChange={e => setEditingProduct({ ...editingProduct, price_hkd: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">Original Price HKD</label><input type="number" value={editingProduct.original_price_hkd || ""} onChange={e => setEditingProduct({ ...editingProduct, original_price_hkd: Number(e.target.value) || undefined })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">Stock</label><input type="number" value={editingProduct.stock || 0} onChange={e => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">Series</label>
                  <select value={editingProduct.series || "Other"} onChange={e => setEditingProduct({ ...editingProduct, series: e.target.value as any })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1">
                    <option value="CalmEX">CalmEX</option><option value="SoCalm">SoCalm</option><option value="CellRevEX">CellRevEX</option><option value="Other">Other</option>
                  </select>
                </div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">Points</label><input type="number" value={editingProduct.points || 0} onChange={e => setEditingProduct({ ...editingProduct, points: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">Weight (kg)</label><input type="number" step="0.01" value={editingProduct.weight_kg || 0} onChange={e => setEditingProduct({ ...editingProduct, weight_kg: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                <div className="md:col-span-2"><label className="text-[10px] uppercase text-[#8F8881]">描述 (中)</label><textarea value={editingProduct.description_zh || ""} onChange={e => setEditingProduct({ ...editingProduct, description_zh: e.target.value })} className="w-full border border-[#ECE6DF] h-16 px-2 mt-1 text-[11px]" /></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">Images (comma URLs)</label><input value={(editingProduct.images || []).join(",")} onChange={e => setEditingProduct({ ...editingProduct, images: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 text-[10px]" /></div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 text-[11px]"><input type="checkbox" checked={editingProduct.isBundle || false} onChange={e => setEditingProduct({ ...editingProduct, isBundle: e.target.checked })} />Bundle?</label>
                  {editingProduct.isBundle && <div><label className="text-[10px] uppercase text-[#8F8881]">Bundle Label</label><input value={editingProduct.bundleGiftLabel || ""} onChange={e => setEditingProduct({ ...editingProduct, bundleGiftLabel: e.target.value })} className="border border-[#ECE6DF] h-9 px-2 ml-2 text-[11px] w-28" /></div>}
                </div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">Category (comma)</label><input value={(editingProduct.category || []).join(",")} onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 text-[10px]" /></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">Skin Type (comma)</label><input value={(editingProduct.skinType || []).join(",")} onChange={e => setEditingProduct({ ...editingProduct, skinType: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 text-[10px]" /></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">Tags (comma)</label><input value={(editingProduct.tags || []).join(",")} onChange={e => setEditingProduct({ ...editingProduct, tags: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 text-[10px]" /></div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveProduct} className="bg-[#111] text-white px-6 h-9 text-[11px] uppercase">{isAdding ? "Create Product" : "Save Changes"}</button>
                <button onClick={() => { setEditingProduct(null); setIsAdding(false) }} className="border border-[#ECE6DF] px-6 h-9 text-[11px] uppercase">Cancel</button>
              </div>
            </div>
          )}

          <table className="w-full text-[12px] text-left">
            <thead className="bg-[#FBF6F0] text-[10px] uppercase">
              <tr><th className="p-3">SKU</th><th className="p-3">Name</th><th className="p-3">Series</th><th className="p-3">Price HKD</th><th className="p-3">Stock</th><th className="p-3">Points</th><th className="p-3">Bundle?</th><th className="p-3">Actions</th></tr>
            </thead>
            <tbody>{filteredProducts.map(p => (
              <tr key={p.id} className="border-t border-[#F2ECE4] hover:bg-[#FBF6F0]">
                <td className="p-3 font-mono text-[11px]">{p.sku}</td>
                <td className="p-3">{p.name_zh}<br /><span className="text-[10px] text-[#8F8881]">{p.name_en}</span></td>
                <td className="p-3">{p.series}</td>
                <td className="p-3">HK${p.price_hkd} {p.original_price_hkd ? <span className="text-[10px] text-[#BBB5AD] line-through ml-1">HK${p.original_price_hkd}</span> : ""}</td>
                <td className="p-3"><span className={p.stock <= 5 ? "text-red-500 font-semibold" : ""}>{p.stock}</span></td>
                <td className="p-3">{p.points}</td>
                <td className="p-3">{p.isBundle ? <span className="bg-[#111] text-white px-1 text-[10px]">✔</span> : "-"}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingProduct(p); setIsAdding(false) }} className="underline text-[#8F8881] hover:text-[#111]">Edit</button>
                    <button onClick={() => handleDeleteProduct(p.id, p.name_zh)} className="underline text-red-400 hover:text-red-600">Delete</button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {/* ==================== ORDERS TAB ==================== */}
      {tab === "orders" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-3">
            {(["all", "pending", "paid", "shipped", "delivered"] as const).map(s => (
              <button key={s} onClick={() => setOrderFilter(s)} className={`border px-3 py-3 text-center text-[11px] ${orderFilter === s ? "bg-[#111] text-white border-[#111]" : "bg-white border-[#ECE6DF]"}`}>
                <p className="uppercase tracking-[0.12em]">{s}</p>
                <p className="font-serif text-[16px] md:text-[18px] mt-1">{s === "all" ? orders.length : orders.filter(o => o.status === s).length}</p>
              </button>
            ))}
          </div>

          <div className="bg-white border border-[#ECE6DF] overflow-auto">
            <table className="w-full text-[12px] text-left">
              <thead className="bg-[#FBF6F0] text-[10px] uppercase">
                <tr><th className="p-3">Order ID</th><th className="p-3">User</th><th className="p-3">Items</th><th className="p-3">Total HKD</th><th className="p-3">Coupon</th><th className="p-3">Gifts</th><th className="p-3">Points</th><th className="p-3">Status</th><th className="p-3">Date</th><th className="p-3">Actions</th></tr>
              </thead>
              <tbody>{filteredOrders.map(o => {
                const orderUser = users.find(u => u.id === o.userId)
                return (
                  <tr key={o.id} className="border-t border-[#F2ECE4] hover:bg-[#FBF6F0]">
                    <td className="p-3 font-mono text-[11px]">{o.id}</td>
                    <td className="p-3">{orderUser?.username || o.userId}<br /><span className="text-[10px] text-[#8F8881]">{orderUser?.email}</span></td>
                    <td className="p-3">{o.items.length}</td>
                    <td className="p-3 font-medium">HK${o.totalHKD}</td>
                    <td className="p-3">{o.couponCode || "-"}</td>
                    <td className="p-3">{o.gifts.length > 0 ? `🎁 ${o.gifts.length} items` : "-"}</td>
                    <td className="p-3 text-[11px]">+{o.pointsEarned} {o.pointsUsed > 0 ? `(-${o.pointsUsed})` : ""}</td>
                    <td className="p-3">
                      <select value={o.status} onChange={e => handleUpdateOrderStatus(o.id, e.target.value as any)} className={`border text-[10px] h-6 px-1 ${o.status === "paid" ? "bg-green-50 border-green-200" : o.status === "shipped" ? "bg-blue-50 border-blue-200" : o.status === "delivered" ? "bg-[#111] text-white border-[#111]" : o.status === "cancelled" ? "bg-red-50 border-red-200" : ""}`}>
                        <option value="pending">pending</option><option value="paid">paid</option><option value="shipped">shipped</option><option value="delivered">delivered</option><option value="cancelled">cancelled</option>
                      </select>
                    </td>
                    <td className="p-3 text-[11px]">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">
                      <button onClick={() => { alert(`Order Details:\n${o.items.map(i => `  ${i.productId} x${i.qty}`).join("\n")}\nAddress: ${o.shippingAddress?.name}, ${o.shippingAddress?.address}, ${o.shippingAddress?.district}`) }} className="underline text-[#8F8881] text-[10px]">View</button>
                    </td>
                  </tr>
                )
              })}</tbody>
            </table>
            {filteredOrders.length === 0 && <p className="p-8 text-center text-[12px] text-[#8F8881]">No orders found.</p>}
          </div>
        </div>
      )}

      {/* ==================== COUPONS TAB (with CRUD) ==================== */}
      {tab === "coupons" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#ECE6DF] p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[12px] uppercase font-semibold">Promotion Coupons ({coupons.length})</h3>
              <button onClick={() => { setEditingCoupon({ type: "percent", value: 10, isActive: true }); setIsAddingCoupon(true) }} className="bg-[#111] text-white px-4 h-8 text-[11px] uppercase">+ Add Coupon</button>
            </div>

            {/* Coupon Edit/Add Form */}
            {editingCoupon && (
              <div className="mb-6 p-4 bg-[#FBF6F0] border border-[#ECE6DF]">
                <h4 className="text-[12px] uppercase font-semibold mb-3">{isAddingCoupon ? "+ Create New Coupon" : `Edit: ${editingCoupon.code}`}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[12px]">
                  <div><label className="text-[10px] uppercase text-[#8F8881]">Code *</label><input value={editingCoupon.code || ""} onChange={e => setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 uppercase font-mono" disabled={!isAddingCoupon} /></div>
                  <div><label className="text-[10px] uppercase text-[#8F8881]">Type</label>
                    <select value={editingCoupon.type || "percent"} onChange={e => setEditingCoupon({ ...editingCoupon, type: e.target.value as any })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1">
                      <option value="percent">Percent (%)</option><option value="fixed">Fixed (HKD)</option>
                    </select>
                  </div>
                  <div><label className="text-[10px] uppercase text-[#8F8881]">Value *</label><input type="number" value={editingCoupon.value || ""} onChange={e => setEditingCoupon({ ...editingCoupon, value: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                  <div><label className="text-[10px] uppercase text-[#8F8881]">Min Amount HKD</label><input type="number" value={editingCoupon.minAmountHKD || ""} onChange={e => setEditingCoupon({ ...editingCoupon, minAmountHKD: Number(e.target.value) || undefined })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                  <div><label className="text-[10px] uppercase text-[#8F8881]">Valid From</label><input type="date" value={editingCoupon.validFrom || ""} onChange={e => setEditingCoupon({ ...editingCoupon, validFrom: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                  <div><label className="text-[10px] uppercase text-[#8F8881]">Valid To</label><input type="date" value={editingCoupon.validTo || ""} onChange={e => setEditingCoupon({ ...editingCoupon, validTo: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                  <div><label className="text-[10px] uppercase text-[#8F8881]">Max Uses</label><input type="number" value={editingCoupon.maxUses || ""} onChange={e => setEditingCoupon({ ...editingCoupon, maxUses: Number(e.target.value) || undefined })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                  <div><label className="text-[10px] uppercase text-[#8F8881]">Description (中)</label><input value={editingCoupon.description_zh || ""} onChange={e => setEditingCoupon({ ...editingCoupon, description_zh: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                  <div className="flex items-end gap-4">
                    <label className="flex items-center gap-2 text-[11px]"><input type="checkbox" checked={editingCoupon.onlyFirstOrder || false} onChange={e => setEditingCoupon({ ...editingCoupon, onlyFirstOrder: e.target.checked })} />First Order Only</label>
                    <label className="flex items-center gap-2 text-[11px]"><input type="checkbox" checked={editingCoupon.isActive !== false} onChange={e => setEditingCoupon({ ...editingCoupon, isActive: e.target.checked })} />Active</label>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={handleSaveCoupon} className="bg-[#111] text-white px-6 h-9 text-[11px] uppercase">{isAddingCoupon ? "Create Coupon" : "Save Changes"}</button>
                  <button onClick={() => { setEditingCoupon(null); setIsAddingCoupon(false) }} className="border border-[#ECE6DF] px-6 h-9 text-[11px] uppercase">Cancel</button>
                </div>
              </div>
            )}

            <div className="overflow-auto">
              <table className="w-full text-[12px]">
                <thead><tr className="text-[10px] uppercase text-[#8F8881]"><th className="text-left p-2">Code</th><th className="text-left p-2">Type</th><th className="text-left p-2">Value</th><th className="text-left p-2">Min HKD</th><th className="text-left p-2">First Only</th><th className="text-left p-2">Active</th><th className="text-left p-2">Used</th><th className="text-left p-2">Validity</th><th className="text-left p-2">Actions</th></tr></thead>
                <tbody>{coupons.map(c => (
                  <tr key={c.code} className="border-t border-[#F2ECE4]">
                    <td className="p-2 font-mono font-semibold">{c.code}</td>
                    <td className="p-2">{c.type}</td>
                    <td className="p-2">{c.value}{c.type === "percent" ? "%" : ""}</td>
                    <td className="p-2">{c.minAmountHKD || "-"}</td>
                    <td className="p-2">{c.onlyFirstOrder ? "✔" : "-"}</td>
                    <td className="p-2">
                      <button onClick={() => handleToggleCoupon(c.code, !c.isActive)} className={`px-2 py-[1px] text-[10px] ${c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {c.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="p-2">{c.usedCount}{c.maxUses ? `/${c.maxUses}` : ""}</td>
                    <td className="p-2 text-[10px] text-[#8F8881]">{c.validFrom} → {c.validTo}</td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingCoupon(c); setIsAddingCoupon(false) }} className="underline text-[#8F8881] text-[10px]">Edit</button>
                        <button onClick={() => handleDeleteCoupon(c.code)} className="underline text-red-400 text-[10px]">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== BUNDLES TAB ==================== */}
      {tab === "bundles" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.filter(p => p.isBundle).map(b => (
            <div key={b.id} className="bg-white border border-[#ECE6DF] p-5">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-serif text-[18px]">{b.name_zh}</h4>
                  <p className="text-[12px] text-[#5C5651]">{b.name_en}</p>
                </div>
                <button onClick={() => { setEditingProduct(b); setIsAdding(false); setTab("products") }} className="underline text-[11px] text-[#8F8881]">Edit</button>
              </div>
              <p className="text-[11px] text-[#8F8881] mt-2">{b.bundleGiftLabel} • HK${b.price_hkd} (原 HK${b.original_price_hkd}) • Stock: {b.stock}</p>
              <p className="text-[12px] mt-2">{b.description_zh}</p>
              {b.bundleItems && (
                <div className="mt-3 pt-3 border-t border-[#F2ECE4] text-[11px] text-[#8F8881]">
                  <p className="font-semibold text-[10px] uppercase mb-1">Bundle Contents:</p>
                  {b.bundleItems.map((bi, i) => {
                    const bp = products.find(p => p.id === bi.productId)
                    return <p key={i}>• {bp?.name_zh || bi.productId} x{bi.qty}</p>
                  })}
                </div>
              )}
            </div>
          ))}
          <button onClick={() => { setEditingProduct({ isBundle: true, bundleGiftLabel: "買2送3" }); setIsAdding(true); setTab("products") }} className="border-2 border-dashed border-[#ECE6DF] p-5 text-center text-[12px] text-[#8F8881] hover:border-[#111] hover:text-[#111] transition cursor-pointer min-h-[120px] flex items-center justify-center">
            + Create New Bundle
          </button>
        </div>
      )}

      {/* ==================== GIFT TIERS TAB ==================== */}
      {tab === "gifts" && (
        <div className="space-y-6">
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h3 className="text-[12px] uppercase font-semibold mb-4">Gift-With-Purchase Tiers (GWP)</h3>
            <p className="text-[11px] text-[#8F8881] mb-4">Configure spending thresholds and corresponding gifts customers receive.</p>
            {giftTiers.map((tier, ti) => (
              <div key={tier.id} className="border border-[#F2ECE4] p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-[12px] mb-3">
                  <div><label className="text-[10px] uppercase text-[#8F8881]">Threshold HKD</label><input type="number" value={tier.thresholdHKD} onChange={e => { const t = [...giftTiers]; t[ti] = { ...t[ti], thresholdHKD: Number(e.target.value) }; setGiftTiers(t) }} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                  <div><label className="text-[10px] uppercase text-[#8F8881]">Threshold USD</label><input type="number" value={tier.thresholdUSD} onChange={e => { const t = [...giftTiers]; t[ti] = { ...t[ti], thresholdUSD: Number(e.target.value) }; setGiftTiers(t) }} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                  <div><label className="text-[10px] uppercase text-[#8F8881]">Gift Value HKD</label><input type="number" value={tier.giftValueHKD} onChange={e => { const t = [...giftTiers]; t[ti] = { ...t[ti], giftValueHKD: Number(e.target.value) }; setGiftTiers(t) }} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                  <div><label className="text-[10px] uppercase text-[#8F8881]">Label (中)</label><input value={tier.label_zh} onChange={e => { const t = [...giftTiers]; t[ti] = { ...t[ti], label_zh: e.target.value }; setGiftTiers(t) }} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                </div>
                <h5 className="text-[10px] uppercase font-semibold text-[#8F8881] mb-2">Gift Items:</h5>
                <div className="space-y-2">
                  {tier.gifts.map((g, gi) => (
                    <div key={gi} className="flex gap-2 items-center">
                      <input value={g.name_zh} onChange={e => { const t = [...giftTiers]; t[ti].gifts[gi] = { ...t[ti].gifts[gi], name_zh: e.target.value }; setGiftTiers(t) }} className="flex-1 border border-[#ECE6DF] h-8 px-2 text-[11px]" placeholder="Gift name (中)" />
                      <input value={g.name_en} onChange={e => { const t = [...giftTiers]; t[ti].gifts[gi] = { ...t[ti].gifts[gi], name_en: e.target.value }; setGiftTiers(t) }} className="flex-1 border border-[#ECE6DF] h-8 px-2 text-[11px]" placeholder="Gift name (EN)" />
                      <input type="number" value={g.qty} onChange={e => { const t = [...giftTiers]; t[ti].gifts[gi] = { ...t[ti].gifts[gi], qty: Number(e.target.value) }; setGiftTiers(t) }} className="w-16 border border-[#ECE6DF] h-8 px-2 text-[11px]" />
                      <button onClick={() => { const t = [...giftTiers]; t[ti].gifts = t[ti].gifts.filter((_, i) => i !== gi); setGiftTiers(t) }} className="text-red-400 text-[11px]">×</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => { const t = [...giftTiers]; t[ti].gifts.push({ name_zh: "", name_en: "", qty: 1 }); setGiftTiers(t) }} className="mt-2 text-[11px] underline text-[#8F8881]">+ Add gift item</button>
              </div>
            ))}
            <button onClick={handleSaveGiftTiers} className="bg-[#111] text-white px-6 h-9 text-[11px] uppercase">Save Gift Tiers</button>
          </div>
        </div>
      )}

      {/* ==================== SETTINGS TAB ==================== */}
      {tab === "settings" && settings && (
        <div className="space-y-6">
          {/* Store Info */}
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h3 className="text-[12px] uppercase font-semibold mb-4">🏪 Store Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[12px]">
              <div><label className="text-[10px] uppercase text-[#8F8881]">Store Name</label><input value={settings.storeName} onChange={e => setSettings({ ...settings, storeName: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">Tagline (中)</label><input value={settings.storeTagline_zh} onChange={e => setSettings({ ...settings, storeTagline_zh: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">Tagline (EN)</label><input value={settings.storeTagline_en} onChange={e => setSettings({ ...settings, storeTagline_en: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">Contact Email</label><input value={settings.contactEmail} onChange={e => setSettings({ ...settings, contactEmail: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">Contact Phone</label><input value={settings.contactPhone} onChange={e => setSettings({ ...settings, contactPhone: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">WhatsApp Number</label><input value={settings.whatsappNumber} onChange={e => setSettings({ ...settings, whatsappNumber: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div className="md:col-span-2"><label className="text-[10px] uppercase text-[#8F8881]">Address (中)</label><input value={settings.address_zh} onChange={e => setSettings({ ...settings, address_zh: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">Address (EN)</label><input value={settings.address_en} onChange={e => setSettings({ ...settings, address_en: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
            </div>
          </div>

          {/* Social Links */}
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h3 className="text-[12px] uppercase font-semibold mb-4">🔗 Social Links</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[12px]">
              <div><label className="text-[10px] uppercase text-[#8F8881]">Instagram URL</label><input value={settings.instagramUrl} onChange={e => setSettings({ ...settings, instagramUrl: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">Facebook URL</label><input value={settings.facebookUrl} onChange={e => setSettings({ ...settings, facebookUrl: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">WhatsApp URL</label><input value={settings.whatsappUrl} onChange={e => setSettings({ ...settings, whatsappUrl: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
            </div>
          </div>

          {/* Announcement Bar */}
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h3 className="text-[12px] uppercase font-semibold mb-4">📢 Announcement Bar</h3>
            <div className="space-y-3 text-[12px]">
              <label className="flex items-center gap-2"><input type="checkbox" checked={settings.announcementBarActive} onChange={e => setSettings({ ...settings, announcementBarActive: e.target.checked })} /> Active</label>
              <div><label className="text-[10px] uppercase text-[#8F8881]">Text (中)</label><input value={settings.announcementBar_zh} onChange={e => setSettings({ ...settings, announcementBar_zh: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">Text (EN)</label><input value={settings.announcementBar_en} onChange={e => setSettings({ ...settings, announcementBar_en: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
            </div>
          </div>

          {/* Shipping Settings */}
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h3 className="text-[12px] uppercase font-semibold mb-4">🚚 Shipping Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[12px]">
              <div><label className="text-[10px] uppercase text-[#8F8881]">Free Shipping Threshold (HKD)</label><input type="number" value={settings.freeShippingThresholdHKD} onChange={e => setSettings({ ...settings, freeShippingThresholdHKD: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">Free Shipping Threshold (USD)</label><input type="number" value={settings.freeShippingThresholdUSD} onChange={e => setSettings({ ...settings, freeShippingThresholdUSD: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">Flat Shipping Fee (HKD)</label><input type="number" value={settings.flatShippingFeeHKD} onChange={e => setSettings({ ...settings, flatShippingFeeHKD: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">Flat Shipping Fee (USD)</label><input type="number" value={settings.flatShippingFeeUSD} onChange={e => setSettings({ ...settings, flatShippingFeeUSD: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
            </div>
          </div>

          {/* Points & Loyalty Settings */}
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h3 className="text-[12px] uppercase font-semibold mb-4">⭐ Points & Loyalty Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-[12px]">
              <div><label className="text-[10px] uppercase text-[#8F8881]">Points per HK$1 spent</label><input type="number" value={settings.pointsPerHKD} onChange={e => setSettings({ ...settings, pointsPerHKD: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">Points Redemption Rate (pts = HK$1)</label><input type="number" value={settings.pointsRedemptionRate} onChange={e => setSettings({ ...settings, pointsRedemptionRate: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">Birthday Bonus Points</label><input type="number" value={settings.birthdayBonusPoints} onChange={e => setSettings({ ...settings, birthdayBonusPoints: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">Birthday Discount (%)</label><input type="number" value={settings.birthdayDiscountPercent} onChange={e => setSettings({ ...settings, birthdayDiscountPercent: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">VIP Threshold (HKD)</label><input type="number" value={settings.vipThresholdHKD} onChange={e => setSettings({ ...settings, vipThresholdHKD: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">Prestige Threshold (HKD)</label><input type="number" value={settings.prestigeThresholdHKD} onChange={e => setSettings({ ...settings, prestigeThresholdHKD: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
            </div>
          </div>

          {/* First Order Coupon Settings */}
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h3 className="text-[12px] uppercase font-semibold mb-4">🎫 First Order Promotion</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[12px]">
              <div><label className="text-[10px] uppercase text-[#8F8881]">Coupon Code</label><input value={settings.firstOrderCouponCode} onChange={e => setSettings({ ...settings, firstOrderCouponCode: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">Discount (%)</label><input type="number" value={settings.firstOrderDiscountPercent} onChange={e => setSettings({ ...settings, firstOrderDiscountPercent: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">Min Amount (HKD)</label><input type="number" value={settings.firstOrderMinAmountHKD} onChange={e => setSettings({ ...settings, firstOrderMinAmountHKD: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
            </div>
          </div>

          {/* ==================== COLOR TUNER ==================== */}
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h3 className="text-[12px] uppercase font-semibold mb-4">🎨 Color Tuner / Theme Colors</h3>
            <p className="text-[11px] text-[#8F8881] mb-4">Customize the entire site color scheme. Changes apply instantly to the live website.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[12px]">
              {[
                { key: "primaryColor" as const, label: "Primary Color (Buttons, Text)" },
                { key: "secondaryColor" as const, label: "Secondary / Accent (Badges)" },
                { key: "accentColor" as const, label: "Accent / Gold (Highlights)" },
                { key: "backgroundColor" as const, label: "Background Color" },
                { key: "cardColor" as const, label: "Card / Surface Color" },
                { key: "textColor" as const, label: "Main Text Color" },
                { key: "mutedTextColor" as const, label: "Muted Text Color" },
                { key: "borderColor" as const, label: "Border Color" }
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-[10px] uppercase text-[#8F8881] block mb-1">{label}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings[key]}
                      onChange={e => setSettings({ ...settings, [key]: e.target.value })}
                      className="w-10 h-10 rounded border border-[#ECE6DF] cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={settings[key]}
                      onChange={e => setSettings({ ...settings, [key]: e.target.value })}
                      className="flex-1 border border-[#ECE6DF] h-9 px-2 font-mono text-[11px]"
                    />
                  </div>
                </div>
              ))}
            </div>
            {/* Preset Themes */}
            <div className="mt-4 pt-4 border-t border-[#F2ECE4]">
              <p className="text-[10px] uppercase text-[#8F8881] mb-2 font-semibold">Quick Presets:</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setSettings({ ...settings, primaryColor: "#111111", secondaryColor: "#825F59", accentColor: "#D8C6A6", backgroundColor: "#FDFBF8", cardColor: "#FFFFFF", textColor: "#111111", mutedTextColor: "#8F8881", borderColor: "#ECE6DF" })} className="border border-[#ECE6DF] px-3 py-1.5 text-[10px] hover:border-[#111]">Classic Cream</button>
                <button onClick={() => setSettings({ ...settings, primaryColor: "#1a1a2e", secondaryColor: "#16213e", accentColor: "#e94560", backgroundColor: "#f8f9fa", cardColor: "#ffffff", textColor: "#1a1a2e", mutedTextColor: "#6c757d", borderColor: "#dee2e6" })} className="border border-[#ECE6DF] px-3 py-1.5 text-[10px] hover:border-[#111]">Dark Navy</button>
                <button onClick={() => setSettings({ ...settings, primaryColor: "#2d3436", secondaryColor: "#6c5ce7", accentColor: "#fd79a8", backgroundColor: "#fafafa", cardColor: "#ffffff", textColor: "#2d3436", mutedTextColor: "#636e72", borderColor: "#dfe6e9" })} className="border border-[#ECE6DF] px-3 py-1.5 text-[10px] hover:border-[#111]">Modern Purple</button>
                <button onClick={() => setSettings({ ...settings, primaryColor: "#000000", secondaryColor: "#c0392b", accentColor: "#e74c3c", backgroundColor: "#ffffff", cardColor: "#f5f5f5", textColor: "#000000", mutedTextColor: "#7f8c8d", borderColor: "#ecf0f1" })} className="border border-[#ECE6DF] px-3 py-1.5 text-[10px] hover:border-[#111]">Bold Red</button>
                <button onClick={() => setSettings({ ...settings, primaryColor: "#1b4332", secondaryColor: "#2d6a4f", accentColor: "#95d5b2", backgroundColor: "#f0fdf4", cardColor: "#ffffff", textColor: "#1b4332", mutedTextColor: "#52796f", borderColor: "#d8f3dc" })} className="border border-[#ECE6DF] px-3 py-1.5 text-[10px] hover:border-[#111]">Natural Green</button>
              </div>
            </div>
          </div>

          {/* ==================== FONT SETTINGS ==================== */}
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h3 className="text-[12px] uppercase font-semibold mb-4">🔤 Font & Typography Settings</h3>
            <p className="text-[11px] text-[#8F8881] mb-4">Customize fonts and sizes. Google Fonts are supported. The site uses a sans-serif body font and a serif display font for headings.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[12px]">
              <div>
                <label className="text-[10px] uppercase text-[#8F8881]">Body / Sans-Serif Font</label>
                <select value={settings.fontFamily} onChange={e => setSettings({ ...settings, fontFamily: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1">
                  <option value="Instrument Sans">Instrument Sans (Default)</option>
                  <option value="Inter">Inter</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Nunito Sans">Nunito Sans</option>
                  <option value="Lato">Lato</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Montserrat">Montserrat</option>
                  <option value="DM Sans">DM Sans</option>
                  <option value="Work Sans">Work Sans</option>
                  <option value="Quicksand">Quicksand</option>
                  <option value="Outfit">Outfit</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase text-[#8F8881]">Heading / Serif Font</label>
                <select value={settings.fontFamilySerif} onChange={e => setSettings({ ...settings, fontFamilySerif: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1">
                  <option value="Cormorant Garamond">Cormorant Garamond (Default)</option>
                  <option value="Playfair Display">Playfair Display</option>
                  <option value="Lora">Lora</option>
                  <option value="Libre Baskerville">Libre Baskerville</option>
                  <option value="Crimson Text">Crimson Text</option>
                  <option value="EB Garamond">EB Garamond</option>
                  <option value="Merriweather">Merriweather</option>
                  <option value="Source Serif Pro">Source Serif Pro</option>
                  <option value="DM Serif Display">DM Serif Display</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase text-[#8F8881]">Base Font Size (px)</label>
                <input type="range" min="12" max="20" step="1" value={settings.fontSizeBase} onChange={e => setSettings({ ...settings, fontSizeBase: Number(e.target.value) })} className="w-full mt-2" />
                <p className="text-[10px] text-[#8F8881] mt-1">Current: {settings.fontSizeBase}px</p>
              </div>
              <div>
                <label className="text-[10px] uppercase text-[#8F8881]">Font Scale Multiplier</label>
                <input type="range" min="0.8" max="1.3" step="0.05" value={settings.fontSizeScale} onChange={e => setSettings({ ...settings, fontSizeScale: Number(e.target.value) })} className="w-full mt-2" />
                <p className="text-[10px] text-[#8F8881] mt-1">Current: {settings.fontSizeScale}x (affects all headings proportionally)</p>
              </div>
            </div>
            {/* Font Preview */}
            <div className="mt-4 pt-4 border-t border-[#F2ECE4] bg-[#FBF6F0] p-4">
              <p className="text-[10px] uppercase text-[#8F8881] mb-2 font-semibold">Preview:</p>
              <p className="text-[13px]" style={{ fontFamily: `"${settings.fontFamily}", sans-serif` }}>Body text: {settings.fontFamily} — 為敏感肌而生的溫和醫研修護</p>
              <p className="text-[24px] mt-2" style={{ fontFamily: `"${settings.fontFamilySerif}", serif` }}>Heading: {settings.fontFamilySerif} — CS12 Skincare</p>
            </div>
          </div>

          {/* Maintenance Mode */}
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h3 className="text-[12px] uppercase font-semibold mb-4">🔧 Maintenance Mode</h3>
            <div className="space-y-3 text-[12px]">
              <label className="flex items-center gap-2"><input type="checkbox" checked={settings.maintenanceMode} onChange={e => setSettings({ ...settings, maintenanceMode: e.target.checked })} /> Enable Maintenance Mode (hides store from public)</label>
              <div><label className="text-[10px] uppercase text-[#8F8881]">Message (中)</label><input value={settings.maintenanceMessage_zh} onChange={e => setSettings({ ...settings, maintenanceMessage_zh: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">Message (EN)</label><input value={settings.maintenanceMessage_en} onChange={e => setSettings({ ...settings, maintenanceMessage_en: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-3">
            <button onClick={handleSaveSettings} className="bg-[#111] text-white px-8 h-11 text-[12px] tracking-[0.14em] uppercase font-semibold">💾 Save All Settings</button>
            <button onClick={refresh} className="border border-[#ECE6DF] px-6 h-11 text-[12px] uppercase">Reset to Current</button>
          </div>
          <p className="text-[10px] text-[#8F8881]">Last updated: {new Date(settings.updatedAt).toLocaleString()}</p>
        </div>
      )}
    </main>
  )
}
