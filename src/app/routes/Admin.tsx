import { useEffect, useState, useMemo } from "react"
import { useAuthStore } from "../../stores/useAuthStore"
import { getDBClient } from "../../lib/db/client"
import { Product, User, Order, Coupon, GiftTier, SiteSettings, NewsletterSubscriber, InventoryLog, SEOPageSettings } from "../../lib/db/types"
import { useNavigate } from "react-router-dom"
import { showToast } from "../../components/ui/Toast"
import { useAppStore } from "../../stores/useAppStore"
import { useThemeStore } from "../../stores/useThemeStore"
import { Download, Search, Filter, Mail, Eye, Trash2, FileText } from "lucide-react"
import { displayBundleGiftLabel } from "../../lib/i18n/productLabels"

type AdminTab = "dashboard" | "crm" | "products" | "orders" | "coupons" | "bundles" | "gifts" | "newsletter" | "inventory" | "reviews" | "seo" | "settings"

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
  const [newsletterSubscribers, setNewsletterSubscribers] = useState<NewsletterSubscriber[]>([])
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([])
  const [seoPages, setSeoPages] = useState<SEOPageSettings[]>([])
  const [tab, setTab] = useState<AdminTab>("dashboard")
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [orderFilter, setOrderFilter] = useState<string>("all")
  const [newsletterSearch, setNewsletterSearch] = useState("")
  const [inventoryFilter, setInventoryFilter] = useState<string>("all")
  const [inventoryProductFilter, setInventoryProductFilter] = useState<string>("")

  // Coupon editing
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon> | null>(null)
  const [isAddingCoupon, setIsAddingCoupon] = useState(false)

  // SEO editing
  const [editingSeoPage, setEditingSeoPage] = useState<Partial<SEOPageSettings> | null>(null)
  const [isAddingSeoPage, setIsAddingSeoPage] = useState(false)

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
    setNewsletterSubscribers(await db.getNewsletterSubscribers())
    setInventoryLogs(await db.getInventoryLogs())
    setSeoPages(await db.getSEOPageSettings())
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
        showToast("error", lang === "zh" ? "請填寫必填欄位 (名稱、SKU、價格)" : "Please fill in required fields (Name, SKU, Price)")
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
      showToast("success", lang === "zh" ? `產品已新增: ${newProduct.name_zh}` : `Product added: ${newProduct.name_en || newProduct.name_zh}`)
    } else {
      await db.updateProduct(editingProduct.id!, editingProduct)
      showToast("success", lang === "zh" ? `產品已更新: ${editingProduct.name_zh}` : `Product updated: ${editingProduct.name_en || editingProduct.name_zh}`)
    }
    setEditingProduct(null)
    setIsAdding(false)
    refresh()
  }

  const handleDeleteProduct = async (id: string, name: string) => {
    const msg = lang === "zh" ? `確定刪除產品「${name}」？` : `Are you sure you want to delete "${name}"?`
    if (!confirm(msg)) return
    const db = getDBClient()
    await db.deleteProduct(id)
    showToast("success", lang === "zh" ? `已刪除: ${name}` : `Deleted: ${name}`)
    refresh()
  }

  // ========== Order status update ==========
  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order["status"]) => {
    const db = getDBClient()
    await db.updateOrder(orderId, { status: newStatus })
    showToast("success", lang === "zh" ? `訂單 ${orderId} 狀態已更新為 ${newStatus}` : `Order ${orderId} status updated to ${newStatus}`)
    refresh()
  }

  // ========== Coupon CRUD ==========
  const handleSaveCoupon = async () => {
    if (!editingCoupon) return
    const db = getDBClient()
    if (isAddingCoupon) {
      if (!editingCoupon.code || !editingCoupon.type || editingCoupon.value === undefined) {
        showToast("error", lang === "zh" ? "請填寫代碼、類型和數值" : "Please fill in Code, Type and Value")
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
      showToast("success", lang === "zh" ? `優惠碼 ${newCoupon.code} 已新增` : `Coupon code ${newCoupon.code} added`)
    } else {
      await db.updateCoupon(editingCoupon.code!, editingCoupon)
      showToast("success", lang === "zh" ? `優惠碼 ${editingCoupon.code} 已更新` : `Coupon code ${editingCoupon.code} updated`)
    }
    setEditingCoupon(null)
    setIsAddingCoupon(false)
    refresh()
  }

  const handleDeleteCoupon = async (code: string) => {
    const msg = lang === "zh" ? `確定刪除優惠碼「${code}」？` : `Are you sure you want to delete coupon code "${code}"?`
    if (!confirm(msg)) return
    const db = getDBClient()
    await db.deleteCoupon(code)
    showToast("success", lang === "zh" ? `已刪除: ${code}` : `Deleted: ${code}`)
    refresh()
  }

  const handleToggleCoupon = async (code: string, isActive: boolean) => {
    const db = getDBClient()
    await db.updateCoupon(code, { isActive })
    showToast("success", lang === "zh" ? `優惠碼 ${code} 已${isActive ? "啟用" : "停用"}` : `Coupon code ${code} is now ${isActive ? "active" : "inactive"}`)
    refresh()
  }

  // ========== Gift Tier Management ==========
  const handleSaveGiftTiers = async () => {
    const db = getDBClient()
    await db.updateGiftTiers(giftTiers)
    showToast("success", lang === "zh" ? "滿額贈品階梯設定已儲存" : "Gift tiers updated successfully")
    refresh()
  }

  // ========== User role update ==========
  const handleToggleUserRole = async (userId: string, newRole: "customer" | "admin") => {
    const db = getDBClient()
    await db.updateUser(userId, { role: newRole })
    showToast("success", lang === "zh" ? `用戶角色已更新為 ${newRole}` : `User role updated to ${newRole}`)
    refresh()
  }

  // ========== Settings ==========
  const handleSaveSettings = async () => {
    if (!settings) return
    const db = getDBClient()
    await db.updateSiteSettings(settings)
    await reloadTheme()
    showToast("success", lang === "zh" ? "設定已儲存" : "Settings saved successfully")
    refresh()
  }

  // ========== SEO Page Settings ==========
  const handleSaveSeoPage = async () => {
    if (!editingSeoPage) return
    const db = getDBClient()
    if (isAddingSeoPage) {
      if (!editingSeoPage.path) {
        showToast("error", lang === "zh" ? "請填寫頁面路徑" : "Please enter page path")
        return
      }
      const newSeoPage: SEOPageSettings = {
        path: editingSeoPage.path,
        title_zh: editingSeoPage.title_zh || "",
        title_en: editingSeoPage.title_en || "",
        description_zh: editingSeoPage.description_zh || "",
        description_en: editingSeoPage.description_en || "",
        image: editingSeoPage.image,
        noIndex: editingSeoPage.noIndex || false,
        noFollow: editingSeoPage.noFollow || false
      }
      await db.upsertSEOPageSettings(newSeoPage)
      showToast("success", lang === "zh" ? `SEO 設定已新增: ${newSeoPage.path}` : `SEO settings added: ${newSeoPage.path}`)
    } else {
      await db.upsertSEOPageSettings(editingSeoPage as SEOPageSettings)
      showToast("success", lang === "zh" ? `SEO 設定已更新: ${editingSeoPage.path}` : `SEO settings updated: ${editingSeoPage.path}`)
    }
    setEditingSeoPage(null)
    setIsAddingSeoPage(false)
    refresh()
  }

  const handleDeleteSeoPage = async (path: string) => {
    const msg = lang === "zh" ? `確定刪除「${path}」的 SEO 設定？` : `Are you sure you want to delete SEO settings for "${path}"?`
    if (!confirm(msg)) return
    const db = getDBClient()
    await db.deleteSEOPageSettings(path)
    showToast("success", lang === "zh" ? `已刪除: ${path}` : `Deleted: ${path}`)
    refresh()
  }

  const tabLabels: Record<AdminTab, string> = {
    dashboard: lang === "zh" ? "📊 控制台" : "📊 Dashboard",
    crm: lang === "zh" ? "👥 會員 CRM" : "👥 CRM",
    products: lang === "zh" ? "📦 產品管理" : "📦 Products",
    orders: lang === "zh" ? "🛒 訂單管理" : "🛒 Orders",
    coupons: lang === "zh" ? "🏷️ 優惠碼" : "🏷️ Coupons",
    bundles: lang === "zh" ? "🎁 組合包" : "🎁 Bundles",
    gifts: lang === "zh" ? "🎀 滿額贈" : "🎀 Gift Tiers",
    newsletter: lang === "zh" ? "📧 電子報訂閱" : "📧 Newsletter",
    inventory: lang === "zh" ? "📋 庫存記錄" : "📋 Inventory Log",
    reviews: lang === "zh" ? "⭐ 評價管理" : "⭐ Reviews",
    seo: lang === "zh" ? "🔍 SEO 設定" : "🔍 SEO Settings",
    settings: lang === "zh" ? "⚙️ 系統設定" : "⚙️ Settings"
  }

  // Premium color palette
  const premiumColors = [
    "#9E7428", // CS12 logo gold
    "#825F59", // Rose Wood
    "#D8C6A6", // Champagne Gold
    "#FDFBF8", // Soft Cream (Default BG)
    "#FFFFFF", // Pure White
    "#8F8881", // Warm Stone
    "#ECE6DF", // Soft Linen
    "#2C3E50", // Slate Navy
    "#16A085", // Soft Teal
    "#7D6608", // Antique Gold
    "#B48A78", // Dusty Pink
    "#4A3B32", // Deep Bronze
    "#E5DCD3"  // Pale Beige
  ]

  const colorLabelsZh: Record<string, string> = {
    brandAccentColor: "品牌強調色 (全站金色元素)",
    primaryColor: "主色調 (按鈕、重點文字)",
    secondaryColor: "次色調 / 特色色 (標籤、徽章)",
    accentColor: "強調色 / 金色 (重點高亮)",
    backgroundColor: "網頁背景顏色",
    cardColor: "卡片 / 區塊背景色",
    textColor: "主要文字顏色",
    mutedTextColor: "次要 / 淡化文字顏色",
    borderColor: "邊框線條顏色"
  }

  return (
    <main className="w-[min(calc(100%-24px),1600px)] mx-auto py-6 md:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-2">
        <div>
          <h1 className="font-serif text-[28px] md:text-[32px]">{lang === "zh" ? "管理後台" : "Admin Panel"}</h1>
          <p className="text-[12px] text-[#8F8881] mt-1">
            {lang === "zh" ? "管理產品、訂單、優惠碼、用戶及營運數據" : "Manage products, orders, coupons, users and operations data"}
          </p>
        </div>
        <button onClick={refresh} className="border border-[#ECE6DF] px-4 h-8 text-[11px] uppercase hover:bg-[#FBF6F0]">
          {lang === "zh" ? "↻ 重新整理" : "↻ Refresh"}
        </button>
      </div>

      <div className="flex gap-1.5 mb-8 text-[10px] md:text-[11px] uppercase tracking-[0.12em] flex-wrap overflow-x-auto pb-2">
        {(Object.keys(tabLabels) as AdminTab[]).map(t =>
          <button key={t} onClick={() => setTab(t)} className={`border px-3 md:px-4 h-8 whitespace-nowrap ${tab === t ? "bg-[var(--brand-accent)] text-white border-[var(--brand-accent)]" : "bg-white border-[#ECE6DF] hover:border-[var(--brand-accent)]"}`}>{tabLabels[t]}</button>
        )}
      </div>

      {/* ==================== DASHBOARD TAB ==================== */}
      {tab === "dashboard" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-[#ECE6DF] p-5">
              <p className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "總銷售額" : "Total Revenue"}</p>
              <p className="font-serif text-[22px] md:text-[28px]">HK${totalRevenue.toLocaleString()}</p>
              <p className="text-[11px] text-green-600 mt-1">{paidOrders.length} {lang === "zh" ? "筆已付款訂單" : "paid orders"}</p>
            </div>
            <div className="bg-white border border-[#ECE6DF] p-5">
              <p className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "本月業額" : "This Month"}</p>
              <p className="font-serif text-[22px] md:text-[28px]">HK${thisMonthRevenue.toLocaleString()}</p>
              <p className="text-[11px] text-[#8F8881] mt-1">{orders.filter(o => new Date(o.createdAt).getMonth() === new Date().getMonth()).length} {lang === "zh" ? "筆訂單" : "orders"}</p>
            </div>
            <div className="bg-white border border-[#ECE6DF] p-5">
              <p className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "會員總數" : "Users"}</p>
              <p className="font-serif text-[22px] md:text-[28px]">{users.length}</p>
              <p className="text-[11px] text-[#8F8881] mt-1">{lang === "zh" ? "本月新增" : "New this month"}: {newUsersThisMonth}</p>
            </div>
            <div className="bg-white border border-[#ECE6DF] p-5">
              <p className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "商品總數" : "Products"}</p>
              <p className="font-serif text-[22px] md:text-[28px]">{products.length}</p>
              <p className="text-[11px] text-[#8F8881] mt-1">
                {products.filter(p => p.isBundle).length} {lang === "zh" ? "個組合包" : "bundles"} • {products.filter(p => p.stock <= 5).length} {lang === "zh" ? "個庫存低" : "low stock"}
              </p>
            </div>
          </div>

          {/* Revenue Chart (CSS-based bar chart) */}
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h3 className="text-[12px] uppercase font-semibold mb-4">{lang === "zh" ? "營收趨勢 (最近 6 個月)" : "Revenue Trend (Last 6 Months)"}</h3>
            <div className="flex items-end gap-3 h-[160px] border-b border-[#ECE6DF] pb-2">
              {revenueByMonth.map((m, i) => {
                const maxRev = Math.max(...revenueByMonth.map(x => x.revenue), 1)
                const height = (m.revenue / maxRev) * 100
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                    <p className="text-[10px] text-[#8F8881] mb-1">HK${(m.revenue / 1000).toFixed(0)}k</p>
                    <div className="w-full bg-[var(--brand-accent)] rounded-t transition-all duration-500" style={{ height: `${Math.max(height, 4)}%` }}></div>
                    <p className="text-[9px] text-[#8F8881] mt-2">{m.label}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top Products */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white border border-[#ECE6DF] p-6">
              <h3 className="text-[12px] uppercase font-semibold mb-4">{lang === "zh" ? "熱銷商品排行榜" : "Top Products by Sales"}</h3>
              {topProducts.length === 0 ? <p className="text-[12px] text-[#8F8881]">{lang === "zh" ? "暫無銷售數據" : "No sales data yet."}</p> :
                <div className="space-y-3">
                  {topProducts.slice(0, 5).map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 text-[12px]">
                      <span className="font-serif text-[16px] text-[#8F8881] w-5">#{i + 1}</span>
                      <div className="flex-1">
                        <p className="font-medium">{p.name}</p>
                        <p className="text-[10px] text-[#8F8881]">{p.qty} {lang === "zh" ? "件已售" : "sold"} • HK${p.revenue.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              }
            </div>

            <div className="bg-white border border-[#ECE6DF] p-6">
              <h3 className="text-[12px] uppercase font-semibold mb-4">{lang === "zh" ? "會員等級分佈" : "Membership Tiers"}</h3>
              <div className="grid grid-cols-3 gap-3">
                {(["Member", "VIP", "Prestige"] as const).map(tier => (
                  <div key={tier} className="bg-[#FBF6F0] p-4 text-center">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[#8F8881]">{tier}</p>
                    <p className="font-serif text-[24px]">{users.filter(u => u.tier === tier).length}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-[11px] text-[#8F8881] space-y-1">
                <p>• {lang === "zh" ? "平均訂單金額" : "Average order value"}: HK${orders.length ? Math.round(totalRevenue / orders.length) : 0}</p>
                <p>• {lang === "zh" ? "總發行積分" : "Points issued total"}: {users.reduce((a, b) => a + b.points, 0)}</p>
                <p>• {lang === "zh" ? "有效優惠碼" : "Active coupons"}: {coupons.filter(c => c.isActive).length} / {coupons.length}</p>
              </div>
            </div>
          </div>

          {/* Low Stock Alert */}
          {products.filter(p => p.stock <= 5).length > 0 && (
            <div className="bg-red-50 border border-red-200 p-4">
              <h3 className="text-[12px] uppercase font-semibold mb-2 text-red-700">⚠ {lang === "zh" ? "庫存低預警" : "Low Stock Alert"}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {products.filter(p => p.stock <= 5).map(p => (
                  <div key={p.id} className="text-[11px] text-red-600">
                    <p className="font-medium">{p.name_zh}</p>
                    <p>{lang === "zh" ? "庫存" : "Stock"}: {p.stock} • SKU: {p.sku}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== CRM TAB ==================== */}
      {tab === "crm" && (
        <div className="bg-white border border-[#ECE6DF] overflow-auto">
          <div className="p-4 border-b border-[#F2ECE4] flex flex-wrap justify-between items-center gap-2">
            <h3 className="text-[12px] uppercase font-semibold">{lang === "zh" ? `會員 CRM 管理 (${users.length})` : `Users CRM (${users.length})`}</h3>
            <input 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder={lang === "zh" ? "搜尋會員名稱、郵箱..." : "Search users..."} 
              className="border border-[#ECE6DF] h-8 px-3 text-[11px] w-48" 
            />
          </div>
          <table className="w-full text-[12px] text-left">
            <thead className="bg-[#FBF6F0] text-[10px] uppercase tracking-[0.14em]">
              <tr>
                <th className="p-3">{lang === "zh" ? "會員" : "User"}</th>
                <th className="p-3">{lang === "zh" ? "電子郵件" : "Email"}</th>
                <th className="p-3">{lang === "zh" ? "等級" : "Tier"}</th>
                <th className="p-3">{lang === "zh" ? "積分" : "Points"}</th>
                <th className="p-3">{lang === "zh" ? "累積消費" : "Spent"}</th>
                <th className="p-3">{lang === "zh" ? "訂單數" : "Orders"}</th>
                <th className="p-3">{lang === "zh" ? "生日" : "Birthday"}</th>
                <th className="p-3">{lang === "zh" ? "訂閱" : "Newsletter"}</th>
                <th className="p-3">{lang === "zh" ? "角色" : "Role"}</th>
                <th className="p-3">{lang === "zh" ? "加入時間" : "Joined"}</th>
              </tr>
            </thead>
            <tbody>{users.filter(u => {
              if (!searchTerm) return true
              return (u.username + u.email).toLowerCase().includes(searchTerm.toLowerCase())
            }).map(u => (
              <tr key={u.id} className="border-t border-[#F2ECE4] hover:bg-[#FBF6F0]">
                <td className="p-3 font-medium">{u.username}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3"><span className="bg-[var(--brand-accent)] text-white px-2 py-[1px] text-[10px]">{u.tier}</span></td>
                <td className="p-3">{u.points}</td>
                <td className="p-3 font-mono text-[11px]">HK${u.totalSpentHKD}</td>
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
      )}

      {/* ==================== PRODUCTS TAB ==================== */}
      {tab === "products" && (
        <div className="bg-white border border-[#ECE6DF] overflow-auto">
          <div className="p-4 flex flex-wrap justify-between items-center gap-2 border-b border-[#F2ECE4]">
            <h3 className="text-[12px] uppercase font-semibold">{lang === "zh" ? `產品與庫存列表 (${products.length})` : `Products & Inventory (${products.length})`}</h3>
            <div className="flex gap-2">
              <input 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                placeholder={lang === "zh" ? "搜尋 SKU、名稱..." : "Search SKU, name..."} 
                className="border border-[#ECE6DF] h-8 px-3 text-[11px] w-40 md:w-48" 
              />
              <button onClick={() => { setEditingProduct({}); setIsAdding(true) }} className="bg-[var(--brand-accent)] text-white px-4 h-8 text-[11px] uppercase whitespace-nowrap">
                + {lang === "zh" ? "新增產品" : "Add Product"}
              </button>
            </div>
          </div>

          {editingProduct && (
            <div className="p-6 bg-[#FBF6F0] border-b border-[#ECE6DF]">
              <h4 className="text-[12px] uppercase font-semibold mb-4">
                {isAdding ? (lang === "zh" ? "+ 新增產品資訊" : "+ Add New Product") : `${lang === "zh" ? "編輯產品" : "Edit"}: ${editingProduct.name_zh}`}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[12px]">
                <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "中文產品名稱 *" : "Name (ZH) *"}</label><input value={editingProduct.name_zh || ""} onChange={e => setEditingProduct({ ...editingProduct, name_zh: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "英文產品名稱" : "Name (EN)"}</label><input value={editingProduct.name_en || ""} onChange={e => setEditingProduct({ ...editingProduct, name_en: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "產品條碼 SKU *" : "SKU *"}</label><input value={editingProduct.sku || ""} onChange={e => setEditingProduct({ ...editingProduct, sku: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "港幣售價 HKD *" : "Price HKD *"}</label><input type="number" value={editingProduct.price_hkd || ""} onChange={e => setEditingProduct({ ...editingProduct, price_hkd: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "原價 (港幣) Original Price HKD" : "Original Price HKD"}</label><input type="number" value={editingProduct.original_price_hkd || ""} onChange={e => setEditingProduct({ ...editingProduct, original_price_hkd: Number(e.target.value) || undefined })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "現有庫存" : "Stock"}</label><input type="number" value={editingProduct.stock || 0} onChange={e => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "系列" : "Series"}</label>
                  <select value={editingProduct.series || "Other"} onChange={e => setEditingProduct({ ...editingProduct, series: e.target.value as any })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1">
                    <option value="CalmEX">CalmEX</option><option value="SoCalm">SoCalm</option><option value="CellRevEX">CellRevEX</option><option value="Other">Other</option>
                  </select>
                </div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "購買可得積分" : "Earn Points"}</label><input type="number" value={editingProduct.points || 0} onChange={e => setEditingProduct({ ...editingProduct, points: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "產品重量 (kg)" : "Weight (kg)"}</label><input type="number" step="0.01" value={editingProduct.weight_kg || 0} onChange={e => setEditingProduct({ ...editingProduct, weight_kg: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                <div className="md:col-span-2"><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "中文產品描述" : "Description (ZH)"}</label><textarea value={editingProduct.description_zh || ""} onChange={e => setEditingProduct({ ...editingProduct, description_zh: e.target.value })} className="w-full border border-[#ECE6DF] h-16 px-2 mt-1 text-[11px]" /></div>
                <div className="md:col-span-1"><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "英文產品描述" : "Description (EN)"}</label><textarea value={editingProduct.description_en || ""} onChange={e => setEditingProduct({ ...editingProduct, description_en: e.target.value })} className="w-full border border-[#ECE6DF] h-16 px-2 mt-1 text-[11px]" /></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "產品圖片 (逗號隔開 URLs)" : "Images (comma URLs)"}</label><input value={(editingProduct.images || []).join(",")} onChange={e => setEditingProduct({ ...editingProduct, images: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 text-[10px]" /></div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 text-[11px]"><input type="checkbox" checked={editingProduct.isBundle || false} onChange={e => setEditingProduct({ ...editingProduct, isBundle: e.target.checked })} />{lang === "zh" ? "設為組合套裝？" : "Bundle?"}</label>
                  {editingProduct.isBundle && <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "組合包標籤" : "Bundle Label"}</label><input value={editingProduct.bundleGiftLabel || ""} onChange={e => setEditingProduct({ ...editingProduct, bundleGiftLabel: e.target.value })} className="border border-[#ECE6DF] h-9 px-2 ml-2 text-[11px] w-28" /></div>}
                </div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "產品分類 (英文/中文逗號隔開)" : "Category (comma)"}</label><input value={(editingProduct.category || []).join(",")} onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 text-[10px]" /></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "適用肌膚 (逗號隔開)" : "Skin Type (comma)"}</label><input value={(editingProduct.skinType || []).join(",")} onChange={e => setEditingProduct({ ...editingProduct, skinType: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 text-[10px]" /></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "標籤 (逗號隔開)" : "Tags (comma)"}</label><input value={(editingProduct.tags || []).join(",")} onChange={e => setEditingProduct({ ...editingProduct, tags: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 text-[10px]" /></div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveProduct} className="bg-[var(--brand-accent)] text-white px-6 h-9 text-[11px] uppercase">
                  {isAdding ? (lang === "zh" ? "建立新產品" : "Create Product") : (lang === "zh" ? "儲存變更" : "Save Changes")}
                </button>
                <button onClick={() => { setEditingProduct(null); setIsAdding(false) }} className="border border-[#ECE6DF] px-6 h-9 text-[11px] uppercase">
                  {lang === "zh" ? "取消" : "Cancel"}
                </button>
              </div>
            </div>
          )}

          <table className="w-full text-[12px] text-left">
            <thead className="bg-[#FBF6F0] text-[10px] uppercase">
              <tr>
                <th className="p-3">SKU</th>
                <th className="p-3">{lang === "zh" ? "產品名稱" : "Name"}</th>
                <th className="p-3">{lang === "zh" ? "系列" : "Series"}</th>
                <th className="p-3">{lang === "zh" ? "港幣價格" : "Price HKD"}</th>
                <th className="p-3">{lang === "zh" ? "庫存" : "Stock"}</th>
                <th className="p-3">{lang === "zh" ? "積分" : "Points"}</th>
                <th className="p-3">{lang === "zh" ? "組合？" : "Bundle?"}</th>
                <th className="p-3">{lang === "zh" ? "操作" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>{filteredProducts.map(p => (
              <tr key={p.id} className="border-t border-[#F2ECE4] hover:bg-[#FBF6F0]">
                <td className="p-3 font-mono text-[11px]">{p.sku}</td>
                <td className="p-3">{p.name_zh}<br /><span className="text-[10px] text-[#8F8881]">{p.name_en}</span></td>
                <td className="p-3">{p.series}</td>
                <td className="p-3 font-mono">HK${p.price_hkd} {p.original_price_hkd ? <span className="text-[10px] text-[#BBB5AD] line-through ml-1">HK${p.original_price_hkd}</span> : ""}</td>
                <td className="p-3"><span className={p.stock <= 5 ? "text-red-500 font-semibold" : ""}>{p.stock}</span></td>
                <td className="p-3 font-mono">{p.points}</td>
                <td className="p-3">{p.isBundle ? <span className="bg-[var(--brand-accent)] text-white px-1.5 py-0.5 rounded text-[9px] uppercase font-bold">YES</span> : "-"}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingProduct(p); setIsAdding(false) }} className="underline text-[#8F8881] hover:text-[var(--brand-accent)]">
                      {lang === "zh" ? "編輯" : "Edit"}
                    </button>
                    <button onClick={() => handleDeleteProduct(p.id, p.name_zh)} className="underline text-red-400 hover:text-red-600">
                      {lang === "zh" ? "刪除" : "Delete"}
                    </button>
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
            {(["all", "pending", "paid", "shipped", "delivered"] as const).map(s => {
              const statusLabels: Record<string, string> = {
                all: lang === "zh" ? "全部訂單" : "all",
                pending: lang === "zh" ? "待付款" : "pending",
                paid: lang === "zh" ? "已付款" : "paid",
                shipped: lang === "zh" ? "已出貨" : "shipped",
                delivered: lang === "zh" ? "已妥投" : "delivered"
              }
              return (
                <button key={s} onClick={() => setOrderFilter(s)} className={`border px-3 py-3 text-center text-[11px] ${orderFilter === s ? "bg-[var(--brand-accent)] text-white border-[var(--brand-accent)]" : "bg-white border-[#ECE6DF]"}`}>
                  <p className="uppercase tracking-[0.12em] font-medium">{statusLabels[s]}</p>
                  <p className="font-serif text-[16px] md:text-[18px] mt-1">{s === "all" ? orders.length : orders.filter(o => o.status === s).length}</p>
                </button>
              )
            })}
          </div>

          <div className="bg-white border border-[#ECE6DF] overflow-auto">
            <table className="w-full text-[12px] text-left">
              <thead className="bg-[#FBF6F0] text-[10px] uppercase">
                <tr>
                  <th className="p-3">{lang === "zh" ? "訂單編號" : "Order ID"}</th>
                  <th className="p-3">{lang === "zh" ? "客戶" : "User"}</th>
                  <th className="p-3">{lang === "zh" ? "商品數" : "Items"}</th>
                  <th className="p-3">{lang === "zh" ? "總額 HKD" : "Total HKD"}</th>
                  <th className="p-3">{lang === "zh" ? "優惠券" : "Coupon"}</th>
                  <th className="p-3">{lang === "zh" ? "贈品" : "Gifts"}</th>
                  <th className="p-3">{lang === "zh" ? "積分變動" : "Points"}</th>
                  <th className="p-3">{lang === "zh" ? "狀態" : "Status"}</th>
                  <th className="p-3">{lang === "zh" ? "日期" : "Date"}</th>
                  <th className="p-3">{lang === "zh" ? "詳細" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>{filteredOrders.map(o => {
                const orderUser = users.find(u => u.id === o.userId)
                return (
                  <tr key={o.id} className="border-t border-[#F2ECE4] hover:bg-[#FBF6F0]">
                    <td className="p-3 font-mono text-[11px]">{o.id}</td>
                    <td className="p-3">{orderUser?.username || o.userId}<br /><span className="text-[10px] text-[#8F8881]">{orderUser?.email}</span></td>
                    <td className="p-3">{o.items.length}</td>
                    <td className="p-3 font-medium font-mono">HK${o.totalHKD}</td>
                    <td className="p-3">{o.couponCode || "-"}</td>
                    <td className="p-3 text-[11px]">{o.gifts.length > 0 ? `🎁 ${o.gifts.length} ${lang === "zh" ? "件禮品" : "items"}` : "-"}</td>
                    <td className="p-3 text-[11px] font-mono">+{o.pointsEarned} {o.pointsUsed > 0 ? `(-${o.pointsUsed})` : ""}</td>
                    <td className="p-3">
                      <select value={o.status} onChange={e => handleUpdateOrderStatus(o.id, e.target.value as any)} className={`border text-[10px] h-6 px-1 ${o.status === "paid" ? "bg-green-50 border-green-200" : o.status === "shipped" ? "bg-blue-50 border-blue-200" : o.status === "delivered" ? "bg-[var(--brand-accent)] text-white border-[var(--brand-accent)]" : o.status === "cancelled" ? "bg-red-50 border-red-200" : ""}`}>
                        <option value="pending">pending</option><option value="paid">paid</option><option value="shipped">shipped</option><option value="delivered">delivered</option><option value="cancelled">cancelled</option>
                      </select>
                    </td>
                    <td className="p-3 text-[11px]">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">
                      <button onClick={() => {
                        const items_list = o.items.map(i => `  ${i.productId} x${i.qty}`).join("\n")
                        const shipping = o.shippingAddress
                        const billing = o.billingAddress
                        const isSame = !billing || (billing.name === shipping?.name && billing.address === shipping?.address && billing.phone === shipping?.phone)
                        const zh = lang === "zh"
                        let details = `${zh?"訂單編號":"Order"}: ${o.id}\n\n`
                        details += `📦 ${zh?"商品":"Items"}:\n${items_list}\n\n`
                        if (isSame) {
                          details += `🏠 ${zh?"帳單及送貨地址":"Billing & Shipping Address"}:\n`
                          details += `  ${shipping?.email || ""}\n`
                          details += `  ${shipping?.firstName || ""} ${shipping?.lastName || shipping?.name || ""}\n`
                          if (shipping?.company) details += `  ${shipping.company}\n`
                          details += `  ${shipping?.phone || ""}\n`
                          details += `  ${shipping?.address || ""}\n`
                          if (shipping?.address2) details += `  ${shipping.address2}\n`
                          details += `  ${shipping?.district || ""}\n`
                        } else {
                          details += `💳 ${zh?"帳單地址":"Billing Address"}:\n`
                          details += `  ${billing?.email || ""}\n`
                          details += `  ${billing?.firstName || ""} ${billing?.lastName || billing?.name || ""}\n`
                          if (billing?.company) details += `  ${billing.company}\n`
                          details += `  ${billing?.phone || ""}\n`
                          details += `  ${billing?.address || ""}\n`
                          if (billing?.address2) details += `  ${billing.address2}\n`
                          details += `  ${billing?.district || ""}\n\n`
                          details += `🚚 ${zh?"送貨地址":"Shipping Address"}:\n`
                          details += `  ${shipping?.firstName || ""} ${shipping?.lastName || shipping?.name || ""}\n`
                          if (shipping?.company) details += `  ${shipping.company}\n`
                          details += `  ${shipping?.phone || ""}\n`
                          details += `  ${shipping?.address || ""}\n`
                          if (shipping?.address2) details += `  ${shipping.address2}\n`
                          details += `  ${shipping?.district || ""}\n`
                        }
                        alert(details)
                      }} className="underline text-[#8F8881] text-[10px]">
                        {lang === "zh" ? "查看" : "View"}
                      </button>
                    </td>
                  </tr>
                )
              })}</tbody>
            </table>
            {filteredOrders.length === 0 && <p className="p-8 text-center text-[12px] text-[#8F8881]">{lang === "zh" ? "無訂單記錄" : "No orders found."}</p>}
          </div>
        </div>
      )}

      {/* ==================== COUPONS TAB ==================== */}
      {tab === "coupons" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#ECE6DF] p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[12px] uppercase font-semibold">{lang === "zh" ? `宣傳折扣碼管理 (${coupons.length})` : `Promotion Coupons (${coupons.length})`}</h3>
              <button onClick={() => { setEditingCoupon({ type: "percent", value: 10, isActive: true }); setIsAddingCoupon(true) }} className="bg-[var(--brand-accent)] text-white px-4 h-8 text-[11px] uppercase">
                + {lang === "zh" ? "新增優惠碼" : "Add Coupon"}
              </button>
            </div>

            {/* Coupon Edit/Add Form */}
            {editingCoupon && (
              <div className="mb-6 p-4 bg-[#FBF6F0] border border-[#ECE6DF]">
                <h4 className="text-[12px] uppercase font-semibold mb-3">
                  {isAddingCoupon ? (lang === "zh" ? "+ 建立新優惠碼" : "+ Create New Coupon") : `${lang === "zh" ? "編輯優惠碼" : "Edit"}: ${editingCoupon.code}`}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[12px]">
                  <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "代碼 *" : "Code *"}</label><input value={editingCoupon.code || ""} onChange={e => setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 uppercase font-mono" disabled={!isAddingCoupon} /></div>
                  <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "類型" : "Type"}</label>
                    <select value={editingCoupon.type || "percent"} onChange={e => setEditingCoupon({ ...editingCoupon, type: e.target.value as any })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1">
                      <option value="percent">Percent (%)</option><option value="fixed">Fixed (HKD)</option>
                    </select>
                  </div>
                  <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "數值 *" : "Value *"}</label><input type="number" value={editingCoupon.value || ""} onChange={e => setEditingCoupon({ ...editingCoupon, value: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                  <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "最低消費額 HKD" : "Min Amount HKD"}</label><input type="number" value={editingCoupon.minAmountHKD || ""} onChange={e => setEditingCoupon({ ...editingCoupon, minAmountHKD: Number(e.target.value) || undefined })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                  <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "有效期自" : "Valid From"}</label><input type="date" value={editingCoupon.validFrom || ""} onChange={e => setEditingCoupon({ ...editingCoupon, validFrom: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                  <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "有效期至" : "Valid To"}</label><input type="date" value={editingCoupon.validTo || ""} onChange={e => setEditingCoupon({ ...editingCoupon, validTo: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                  <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "最大可用次數" : "Max Uses"}</label><input type="number" value={editingCoupon.maxUses || ""} onChange={e => setEditingCoupon({ ...editingCoupon, maxUses: Number(e.target.value) || undefined })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                  <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "中文描述" : "Description (ZH)"}</label><input value={editingCoupon.description_zh || ""} onChange={e => setEditingCoupon({ ...editingCoupon, description_zh: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                  <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "英文描述" : "Description (EN)"}</label><input value={editingCoupon.description_en || ""} onChange={e => setEditingCoupon({ ...editingCoupon, description_en: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                  <div className="flex items-end gap-4 col-span-1 md:col-span-3">
                    <label className="flex items-center gap-2 text-[11px]"><input type="checkbox" checked={editingCoupon.onlyFirstOrder || false} onChange={e => setEditingCoupon({ ...editingCoupon, onlyFirstOrder: e.target.checked })} />{lang === "zh" ? "僅限首購用戶使用" : "First Order Only"}</label>
                    <label className="flex items-center gap-2 text-[11px]"><input type="checkbox" checked={editingCoupon.isActive !== false} onChange={e => setEditingCoupon({ ...editingCoupon, isActive: e.target.checked })} />{lang === "zh" ? "已啟用" : "Active"}</label>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={handleSaveCoupon} className="bg-[var(--brand-accent)] text-white px-6 h-9 text-[11px] uppercase">
                    {isAddingCoupon ? (lang === "zh" ? "建立優惠碼" : "Create Coupon") : (lang === "zh" ? "儲存變更" : "Save Changes")}
                  </button>
                  <button onClick={() => { setEditingCoupon(null); setIsAddingCoupon(false) }} className="border border-[#ECE6DF] px-6 h-9 text-[11px] uppercase">
                    {lang === "zh" ? "取消" : "Cancel"}
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-[10px] uppercase text-[#8F8881]">
                    <th className="text-left p-2">{lang === "zh" ? "代碼" : "Code"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "類型" : "Type"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "數值" : "Value"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "最低港幣消費" : "Min HKD"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "首單限定" : "First Only"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "狀態" : "Active"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "已用次數" : "Used"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "有效期限" : "Validity"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "操作" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody>{coupons.map(c => (
                  <tr key={c.code} className="border-t border-[#F2ECE4]">
                    <td className="p-2 font-mono font-semibold">{c.code}</td>
                    <td className="p-2">{c.type}</td>
                    <td className="p-2 font-mono">{c.value}{c.type === "percent" ? "%" : ""}</td>
                    <td className="p-2 font-mono">{c.minAmountHKD || "-"}</td>
                    <td className="p-2">{c.onlyFirstOrder ? "✔" : "-"}</td>
                    <td className="p-2">
                      <button onClick={() => handleToggleCoupon(c.code, !c.isActive)} className={`px-2 py-[1px] text-[10px] ${c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {c.isActive ? (lang === "zh" ? "啟用中" : "Active") : (lang === "zh" ? "已停用" : "Inactive")}
                      </button>
                    </td>
                    <td className="p-2 font-mono">{c.usedCount}{c.maxUses ? `/${c.maxUses}` : ""}</td>
                    <td className="p-2 text-[10px] text-[#8F8881] font-mono">{c.validFrom} → {c.validTo}</td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingCoupon(c); setIsAddingCoupon(false) }} className="underline text-[#8F8881] text-[10px]">
                          {lang === "zh" ? "編輯" : "Edit"}
                        </button>
                        <button onClick={() => handleDeleteCoupon(c.code)} className="underline text-red-400 text-[10px]">
                          {lang === "zh" ? "刪除" : "Delete"}
                        </button>
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
                <button onClick={() => { setEditingProduct(b); setIsAdding(false); setTab("products") }} className="underline text-[11px] text-[#8F8881]">
                  {lang === "zh" ? "編輯" : "Edit"}
                </button>
              </div>
              <p className="text-[11px] text-[#8F8881] mt-2">{displayBundleGiftLabel(b.bundleGiftLabel, lang)} • HK${b.price_hkd} (原 HK${b.original_price_hkd}) • {lang === "zh" ? "庫存" : "Stock"}: {b.stock}</p>
              <p className="text-[12px] mt-2">{b.description_zh}</p>
              {b.bundleItems && (
                <div className="mt-3 pt-3 border-t border-[#F2ECE4] text-[11px] text-[#8F8881]">
                  <p className="font-semibold text-[10px] uppercase mb-1">{lang === "zh" ? "組合包含商品：" : "Bundle Contents:"}</p>
                  {b.bundleItems.map((bi, i) => {
                    const bp = products.find(p => p.id === bi.productId)
                    return <p key={i}>• {bp?.name_zh || bi.productId} x{bi.qty}</p>
                  })}
                </div>
              )}
            </div>
          ))}
          <button onClick={() => { setEditingProduct({ isBundle: true, bundleGiftLabel: "買2送3" }); setIsAdding(true); setTab("products") }} className="border-2 border-dashed border-[#ECE6DF] p-5 text-center text-[12px] text-[#8F8881] hover:border-[var(--brand-accent)] hover:text-[var(--brand-accent)] transition cursor-pointer min-h-[120px] flex items-center justify-center">
            + {lang === "zh" ? "創建新組合包" : "Create New Bundle"}
          </button>
        </div>
      )}

      {/* ==================== GIFT TIERS TAB ==================== */}
      {tab === "gifts" && (
        <div className="space-y-6">
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h3 className="text-[12px] uppercase font-semibold mb-4">{lang === "zh" ? "滿額贈品禮品階梯 (GWP)" : "Gift-With-Purchase Tiers (GWP)"}</h3>
            <p className="text-[11px] text-[#8F8881] mb-4">
              {lang === "zh" ? "設定滿額消費門檻，系統會自動在結算時給符合條件的客戶贈送相應的產品禮包。" : "Configure spending thresholds and corresponding gifts customers receive."}
            </p>
            {giftTiers.map((tier, ti) => (
              <div key={tier.id} className="border border-[#F2ECE4] p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-[12px] mb-3">
                  <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "港幣門檻 HKD" : "Threshold HKD"}</label><input type="number" value={tier.thresholdHKD} onChange={e => { const t = [...giftTiers]; t[ti] = { ...t[ti], thresholdHKD: Number(e.target.value) }; setGiftTiers(t) }} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 font-mono" /></div>
                  <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "美金門檻 USD" : "Threshold USD"}</label><input type="number" value={tier.thresholdUSD} onChange={e => { const t = [...giftTiers]; t[ti] = { ...t[ti], thresholdUSD: Number(e.target.value) }; setGiftTiers(t) }} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 font-mono" /></div>
                  <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "贈品價值港幣" : "Gift Value HKD"}</label><input type="number" value={tier.giftValueHKD} onChange={e => { const t = [...giftTiers]; t[ti] = { ...t[ti], giftValueHKD: Number(e.target.value) }; setGiftTiers(t) }} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 font-mono" /></div>
                  <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "贈送標籤 (中)" : "Label (ZH)"}</label><input value={tier.label_zh} onChange={e => { const t = [...giftTiers]; t[ti] = { ...t[ti], label_zh: e.target.value }; setGiftTiers(t) }} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                </div>
                <h5 className="text-[10px] uppercase font-semibold text-[#8F8881] mb-2">{lang === "zh" ? "贈品包含單品：" : "Gift Items:"}</h5>
                <div className="space-y-2">
                  {tier.gifts.map((g, gi) => (
                    <div key={gi} className="flex gap-2 items-center">
                      <input value={g.name_zh} onChange={e => { const t = [...giftTiers]; t[ti].gifts[gi] = { ...t[ti].gifts[gi], name_zh: e.target.value }; setGiftTiers(t) }} className="flex-1 border border-[#ECE6DF] h-8 px-2 text-[11px]" placeholder={lang === "zh" ? "贈品中文名" : "Gift name (ZH)"} />
                      <input value={g.name_en} onChange={e => { const t = [...giftTiers]; t[ti].gifts[gi] = { ...t[ti].gifts[gi], name_en: e.target.value }; setGiftTiers(t) }} className="flex-1 border border-[#ECE6DF] h-8 px-2 text-[11px]" placeholder={lang === "zh" ? "贈品英文名" : "Gift name (EN)"} />
                      <input type="number" value={g.qty} onChange={e => { const t = [...giftTiers]; t[ti].gifts[gi] = { ...t[ti].gifts[gi], qty: Number(e.target.value) }; setGiftTiers(t) }} className="w-16 border border-[#ECE6DF] h-8 px-2 text-[11px] font-mono" />
                      <button onClick={() => { const t = [...giftTiers]; t[ti].gifts = t[ti].gifts.filter((_, i) => i !== gi); setGiftTiers(t) }} className="text-red-400 text-[11px] px-1 font-bold">×</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => { const t = [...giftTiers]; t[ti].gifts.push({ name_zh: "", name_en: "", qty: 1 }); setGiftTiers(t) }} className="mt-2 text-[11px] underline text-[#8F8881]">
                  + {lang === "zh" ? "新增贈品項目" : "Add gift item"}
                </button>
              </div>
            ))}
            <button onClick={handleSaveGiftTiers} className="bg-[var(--brand-accent)] text-white px-6 h-9 text-[11px] uppercase">
              {lang === "zh" ? "儲存贈品階梯設定" : "Save Gift Tiers"}
            </button>
          </div>
        </div>
      )}

      {/* ==================== NEWSLETTER TAB ==================== */}
      {tab === "newsletter" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#ECE6DF] p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[12px] uppercase font-semibold">{lang === "zh" ? "電子報訂閱管理 (" + newsletterSubscribers.length + ")" : "Newsletter Subscribers (" + newsletterSubscribers.length + ")"}</h3>
              <div className="flex gap-2">
                <button onClick={() => {
                  const csv = ["ID,Email,Source,Subscribed At,Confirmed At,Unsubscribed At,Active,Tags", 
                    ...newsletterSubscribers.map(s => `${s.id},${s.email},${s.source},${s.subscribedAt},${s.confirmedAt||""},${s.unsubscribedAt||""},${s.isActive},"${(s.tags||[]).join(";")}"`
                  )].join("\n")
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
                  const link = document.createElement("a")
                  link.href = URL.createObjectURL(blob)
                  link.download = `newsletter_subscribers_${new Date().toISOString().split("T")[0]}.csv`
                  link.click()
                  showToast("success", lang === "zh" ? "已匯出 CSV" : "CSV exported")
                }} className="border border-[#ECE6DF] px-3 h-8 text-[11px] uppercase hover:bg-[#FBF6F0] flex items-center gap-1">
                  <Download size={12} /> {lang === "zh" ? "匯出 CSV" : "Export CSV"}
                </button>
              </div>
            </div>

            <div className="mb-4">
              <input 
                value={newsletterSearch} 
                onChange={e => setNewsletterSearch(e.target.value)} 
                placeholder={lang === "zh" ? "搜尋電郵、來源..." : "Search email, source..."} 
                className="border border-[#ECE6DF] h-9 px-3 text-[11px] w-64" 
              />
            </div>

            <div className="overflow-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-[10px] uppercase text-[#8F8881]">
                    <th className="text-left p-2">{lang === "zh" ? "電郵" : "Email"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "來源" : "Source"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "訂閱時間" : "Subscribed"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "確認時間" : "Confirmed"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "狀態" : "Status"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "標籤" : "Tags"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "操作" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {newsletterSubscribers.filter(s => {
                    if (!newsletterSearch) return true
                    return (s.email + s.source).toLowerCase().includes(newsletterSearch.toLowerCase())
                  }).map(s => (
                    <tr key={s.id} className="border-t border-[#F2ECE4]">
                      <td className="p-2 font-mono text-[11px]">{s.email}</td>
                      <td className="p-2">
                        <span className="bg-[#FBF6F0] text-[10px] px-2 py-[1px] rounded">{s.source}</span>
                      </td>
                      <td className="p-2 text-[10px] text-[#8F8881]">{new Date(s.subscribedAt).toLocaleString()}</td>
                      <td className="p-2 text-[10px] text-[#8F8881]">{s.confirmedAt ? new Date(s.confirmedAt).toLocaleString() : "-"}</td>
                      <td className="p-2">
                        <button onClick={() => { const db = getDBClient(); db.updateNewsletterSubscriber(s.id, { isActive: !s.isActive }); refresh() }} className={`px-2 py-[1px] text-[10px] ${s.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {s.isActive ? (lang === "zh" ? "已訂閱" : "Subscribed") : (lang === "zh" ? "已退訂" : "Unsubscribed")}
                        </button>
                      </td>
                      <td className="p-2 text-[10px] text-[#8F8881]">{(s.tags||[]).join(", ") || "-"}</td>
                      <td className="p-2">
                        <button onClick={() => { const msg = lang === "zh" ? `確定刪除 ${s.email}？` : `Delete ${s.email}?`; if(confirm(msg)) { const db = getDBClient(); db.deleteNewsletterSubscriber(s.id); refresh() } }} className="underline text-red-400 text-[10px]">
                          {lang === "zh" ? "刪除" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {newsletterSubscribers.length === 0 && <p className="p-8 text-center text-[12px] text-[#8F8881]">{lang === "zh" ? "暫無訂閱記錄" : "No subscribers yet."}</p>}
          </div>
        </div>
      )}

      {/* ==================== INVENTORY LOG TAB ==================== */}
      {tab === "inventory" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h3 className="text-[12px] uppercase font-semibold mb-4">{lang === "zh" ? "庫存異動記錄" : "Inventory Logs"} ({inventoryLogs.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <select value={inventoryFilter} onChange={e => setInventoryFilter(e.target.value)} className="border border-[#ECE6DF] h-9 px-3 text-[11px]">
                <option value="all">{lang === "zh" ? "全部類型" : "All Types"}</option>
                <option value="restock">{lang === "zh" ? "進貨/補貨" : "Restock"}</option>
                <option value="sale">{lang === "zh" ? "銷售出貨" : "Sale"}</option>
                <option value="adjustment">{lang === "zh" ? "手動調整" : "Adjustment"}</option>
                <option value="return">{lang === "zh" ? "退貨入庫" : "Return"}</option>
                <option value="damaged">{lang === "zh" ? "損壞/報廢" : "Damaged"}</option>
                <option value="initial">{lang === "zh" ? "初始庫存" : "Initial"}</option>
              </select>
              <input value={inventoryProductFilter} onChange={e => setInventoryProductFilter(e.target.value)} placeholder={lang === "zh" ? "搜尋產品名稱、SKU..." : "Search product name, SKU..."} className="border border-[#ECE6DF] h-9 px-3 text-[11px]" />
              <button onClick={() => {
                const csv = ["ID,Product ID,Variant ID,Type,Quantity,Previous Stock,New Stock,Reason,Order ID,Admin ID,Created At",
                  ...inventoryLogs.map(l => `${l.id},${l.productId},${l.variantId||""},${l.type},${l.quantity},${l.previousStock},${l.newStock},${l.reason||""},${l.orderId||""},${l.adminId||""},${l.createdAt}`
                )].join("\n")
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
                const link = document.createElement("a")
                link.href = URL.createObjectURL(blob)
                link.download = `inventory_logs_${new Date().toISOString().split("T")[0]}.csv`
                link.click()
                showToast("success", lang === "zh" ? "已匯出 CSV" : "CSV exported")
              }} className="border border-[#ECE6DF] px-3 h-9 text-[11px] uppercase hover:bg-[#FBF6F0] flex items-center justify-center gap-1">
                <Download size={12} /> {lang === "zh" ? "匯出 CSV" : "Export CSV"}
              </button>
            </div>

            <div className="overflow-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-[10px] uppercase text-[#8F8881]">
                    <th className="text-left p-2">{lang === "zh" ? "時間" : "Time"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "產品" : "Product"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "類型" : "Type"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "數量" : "Qty"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "之前庫存" : "Prev Stock"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "之後庫存" : "New Stock"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "原因/備註" : "Reason"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "相關訂單" : "Order ID"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "操作員" : "Admin"}</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryLogs.filter(l => {
                    const matchType = inventoryFilter === "all" || l.type === inventoryFilter
                    const matchProduct = !inventoryProductFilter || 
                      products.find(p => p.id === l.productId)?.name_zh.toLowerCase().includes(inventoryProductFilter.toLowerCase()) ||
                      products.find(p => p.id === l.productId)?.sku.toLowerCase().includes(inventoryProductFilter.toLowerCase()) ||
                      l.productId.toLowerCase().includes(inventoryProductFilter.toLowerCase())
                    return matchType && matchProduct
                  }).map(l => {
                    const product = products.find(p => p.id === l.productId)
                    const typeLabels: Record<string, {zh: string, en: string}> = {
                      restock: {zh: "進貨", en: "Restock"},
                      sale: {zh: "銷售", en: "Sale"},
                      adjustment: {zh: "調整", en: "Adjustment"},
                      return: {zh: "退貨", en: "Return"},
                      damaged: {zh: "損壞", en: "Damaged"},
                      initial: {zh: "初始", en: "Initial"}
                    }
                    const typeLabel = typeLabels[l.type] || {zh: l.type, en: l.type}
                    return (
                      <tr key={l.id} className="border-t border-[#F2ECE4] hover:bg-[#FBF6F0]">
                        <td className="p-2 text-[10px] text-[#8F8881]">{new Date(l.createdAt).toLocaleString()}</td>
                        <td className="p-2">
                          <span className="font-medium">{product?.name_zh || l.productId}</span>
                          <br /><span className="text-[10px] text-[#8F8881] font-mono">{product?.sku || ""}</span>
                        </td>
                        <td className="p-2">
                          <span className={`px-2 py-[1px] text-[10px] rounded ${l.type === "restock" ? "bg-green-100 text-green-700" : l.type === "sale" ? "bg-blue-100 text-blue-700" : l.type === "adjustment" ? "bg-yellow-100 text-yellow-700" : l.type === "return" ? "bg-purple-100 text-purple-700" : l.type === "damaged" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>
                            {lang === "zh" ? typeLabel.zh : typeLabel.en}
                          </span>
                        </td>
                        <td className="p-2 font-mono">{l.quantity > 0 ? "+" : ""}{l.quantity}</td>
                        <td className="p-2 font-mono">{l.previousStock}</td>
                        <td className="p-2 font-mono">{l.newStock}</td>
                        <td className="p-2 text-[10px] text-[#8F8881]">{l.reason || "-"}</td>
                        <td className="p-2 text-[10px] text-[#8F8881] font-mono">{l.orderId || "-"}</td>
                        <td className="p-2 text-[10px] text-[#8F8881]">{l.adminId || "-"}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {inventoryLogs.length === 0 && <p className="p-8 text-center text-[12px] text-[#8F8881]">{lang === "zh" ? "暫無庫存記錄" : "No inventory logs yet."}</p>}
          </div>
        </div>
      )}

      {/* ==================== REVIEWS TAB ==================== */}
      {tab === "reviews" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h3 className="text-[12px] uppercase font-semibold mb-4">{lang === "zh" ? "產品評價管理" : "Product Reviews Management"}</h3>
            <p className="text-[11px] text-[#8F8881] mb-4">{lang === "zh" ? "評價資料儲存在瀏覽器 localStorage 中 (鍵名：cs12_reviews_<productId>)，此處提供檢視與管理介面。" : "Reviews are stored in browser localStorage (key: cs12_reviews_<productId>). This interface allows viewing and management."}</p>
            
            <div className="space-y-4">
              {products.map(product => {
                try {
                  const raw = localStorage.getItem(`cs12_reviews_${product.id}`)
                  const reviews = raw ? JSON.parse(raw) : []
                  if (reviews.length === 0) return null
                  return (
                    <div key={product.id} className="border border-[#F2ECE4] p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-serif text-[16px]">{product.name_zh}</h4>
                          <p className="text-[11px] text-[#8F8881]">SKU: {product.sku} • ID: {product.id}</p>
                        </div>
                        <span className="bg-[var(--brand-accent)] text-white text-[10px] px-2 py-1 rounded">{reviews.length} {lang === "zh" ? "則評價" : "reviews"}</span>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {reviews.map((r: any) => (
                          <div key={r.id} className="border border-[#F2ECE4] p-3 text-[11px]">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{r.name}</span>
                              <span className="text-[12px]">{"★".repeat(r.rating)}{"☆".repeat(5-r.rating)}</span>
                              <span className="text-[10px] text-[#8F8881] ml-auto">{new Date(r.date).toLocaleDateString()}</span>
                            </div>
                            <p className="text-[#5C5651]">{r.comment}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                } catch { return null }
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== SEO SETTINGS TAB ==================== */}
      {tab === "seo" && settings && (
        <div className="space-y-6">
          {/* Global SEO Settings */}
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h3 className="text-[12px] uppercase font-semibold mb-4">🌐 {lang === "zh" ? "全域 SEO 設定" : "Global SEO Settings"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[12px] mb-6">
              <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "預設標題 (中)" : "Default Title (ZH)"}</label><input value={settings.seoDefaultTitle_zh} onChange={e => setSettings({ ...settings, seoDefaultTitle_zh: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "預設標題 (EN)" : "Default Title (EN)"}</label><input value={settings.seoDefaultTitle_en} onChange={e => setSettings({ ...settings, seoDefaultTitle_en: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div className="md:col-span-2"><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "預設描述 (中)" : "Default Description (ZH)"}</label><textarea value={settings.seoDefaultDescription_zh} onChange={e => setSettings({ ...settings, seoDefaultDescription_zh: e.target.value })} className="w-full border border-[#ECE6DF] h-16 px-2 mt-1 text-[11px]" /></div>
              <div className="md:col-span-2"><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "預設描述 (EN)" : "Default Description (EN)"}</label><textarea value={settings.seoDefaultDescription_en} onChange={e => setSettings({ ...settings, seoDefaultDescription_en: e.target.value })} className="w-full border border-[#ECE6DF] h-16 px-2 mt-1 text-[11px]" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "預設分享圖片 URL" : "Default OG Image URL"}</label><input value={settings.seoDefaultImage} onChange={e => setSettings({ ...settings, seoDefaultImage: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 font-mono text-[11px]" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">Twitter Handle</label><input value={settings.seoTwitterHandle} onChange={e => setSettings({ ...settings, seoTwitterHandle: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 font-mono text-[11px]" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">Facebook App ID</label><input value={settings.seoFacebookAppId} onChange={e => setSettings({ ...settings, seoFacebookAppId: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 font-mono text-[11px]" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">Google Analytics ID</label><input value={settings.googleAnalyticsId} onChange={e => setSettings({ ...settings, googleAnalyticsId: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 font-mono text-[11px]" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">GTM Container ID</label><input value={settings.gtmContainerId} onChange={e => setSettings({ ...settings, gtmContainerId: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 font-mono text-[11px]" /></div>
            </div>
          </div>

          {/* Per-Page SEO Settings */}
          <div className="bg-white border border-[#ECE6DF] p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[12px] uppercase font-semibold">{lang === "zh" ? "分頁 SEO 設定 (" + seoPages.length + ")" : "Per-Page SEO Settings (" + seoPages.length + ")"}</h3>
              <button onClick={() => { setEditingSeoPage({}); setIsAddingSeoPage(true) }} className="bg-[var(--brand-accent)] text-white px-4 h-8 text-[11px] uppercase">
                + {lang === "zh" ? "新增頁面 SEO" : "Add Page SEO"}
              </button>
            </div>

            {/* SEO Edit/Add Form */}
            {editingSeoPage && (
              <div className="mb-6 p-4 bg-[#FBF6F0] border border-[#ECE6DF]">
                <h4 className="text-[12px] uppercase font-semibold mb-3">
                  {isAddingSeoPage ? (lang === "zh" ? "+ 新增分頁 SEO 設定" : "+ Add New Page SEO") : `${lang === "zh" ? "編輯 SEO 設定" : "Edit SEO"}: ${editingSeoPage.path}`}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
                  <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "頁面路徑 *" : "Page Path *"}</label><input value={editingSeoPage.path || ""} onChange={e => setEditingSeoPage({ ...editingSeoPage, path: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 font-mono text-[11px]" placeholder="/shop" disabled={!isAddingSeoPage} /></div>
                  <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "標題 (中)" : "Title (ZH)"}</label><input value={editingSeoPage.title_zh || ""} onChange={e => setEditingSeoPage({ ...editingSeoPage, title_zh: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                  <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "標題 (EN)" : "Title (EN)"}</label><input value={editingSeoPage.title_en || ""} onChange={e => setEditingSeoPage({ ...editingSeoPage, title_en: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
                  <div className="md:col-span-2"><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "描述 (中)" : "Description (ZH)"}</label><textarea value={editingSeoPage.description_zh || ""} onChange={e => setEditingSeoPage({ ...editingSeoPage, description_zh: e.target.value })} className="w-full border border-[#ECE6DF] h-16 px-2 mt-1 text-[11px]" /></div>
                  <div className="md:col-span-2"><label className="text=[10px] uppercase text-[#8F8881]">{lang === "zh" ? "描述 (EN)" : "Description (EN)"}</label><textarea value={editingSeoPage.description_en || ""} onChange={e => setEditingSeoPage({ ...editingSeoPage, description_en: e.target.value })} className="w-full border border-[#ECE6DF] h-16 px-2 mt-1 text-[11px]" /></div>
                  <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "分享圖片 URL" : "OG Image URL"}</label><input value={editingSeoPage.image || ""} onChange={e => setEditingSeoPage({ ...editingSeoPage, image: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 font-mono text-[11px]" /></div>
                  <div className="flex items-end gap-4 col-span-1 md:col-span-2">
                    <label className="flex items-center gap-2 text-[11px]"><input type="checkbox" checked={editingSeoPage.noIndex || false} onChange={e => setEditingSeoPage({ ...editingSeoPage, noIndex: e.target.checked })} />{lang === "zh" ? "No Index" : "No Index"}</label>
                    <label className="flex items-center gap-2 text-[11px]"><input type="checkbox" checked={editingSeoPage.noFollow || false} onChange={e => setEditingSeoPage({ ...editingSeoPage, noFollow: e.target.checked })} />{lang === "zh" ? "No Follow" : "No Follow"}</label>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={handleSaveSeoPage} className="bg-[var(--brand-accent)] text-white px-6 h-9 text-[11px] uppercase">
                    {isAddingSeoPage ? (lang === "zh" ? "建立 SEO 設定" : "Create SEO Settings") : (lang === "zh" ? "儲存變更" : "Save Changes")}
                  </button>
                  <button onClick={() => { setEditingSeoPage(null); setIsAddingSeoPage(false) }} className="border border-[#ECE6DF] px-6 h-9 text-[11px] uppercase">
                    {lang === "zh" ? "取消" : "Cancel"}
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-[10px] uppercase text-[#8F8881]">
                    <th className="text-left p-2">{lang === "zh" ? "路徑" : "Path"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "標題 (中)" : "Title (ZH)"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "標題 (EN)" : "Title (EN)"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "描述 (中)" : "Description (ZH)"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "No Index" : "No Index"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "No Follow" : "No Follow"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "操作" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {seoPages.map(s => (
                    <tr key={s.path} className="border-t border-[#F2ECE4]">
                      <td className="p-2 font-mono text-[11px]">{s.path}</td>
                      <td className="p-2 text-[11px] max-w-[200px] truncate">{s.title_zh}</td>
                      <td className="p-2 text-[11px] max-w-[200px] truncate">{s.title_en}</td>
                      <td className="p-2 text-[10px] text-[#8F8881] max-w-[250px] truncate">{s.description_zh}</td>
                      <td className="p-2">{s.noIndex ? "✓" : "-"}</td>
                      <td className="p-2">{s.noFollow ? "✓" : "-"}</td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingSeoPage(s); setIsAddingSeoPage(false) }} className="underline text-[#8F8881] text-[10px]">{lang === "zh" ? "編輯" : "Edit"}</button>
                          <button onClick={() => handleDeleteSeoPage(s.path)} className="underline text-red-400 text-[10px]">{lang === "zh" ? "刪除" : "Delete"}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {seoPages.length === 0 && <p className="p-8 text-center text-[12px] text-[#8F8881]">{lang === "zh" ? "尚未設定分頁 SEO，將使用全域預設值" : "No per-page SEO settings, using global defaults"}</p>}
          </div>

          {/* Product SEO Helper */}
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h3 className="text-[12px] uppercase font-semibold mb-4">{lang === "zh" ? "產品 SEO 檢查" : "Product SEO Audit"}</h3>
            <p className="text-[11px] text-[#8F8881] mb-4">{lang === "zh" ? "檢查哪些產品缺少 SEO 標題、描述或圖片。" : "Check which products are missing SEO title, description, or image."}</p>
            <div className="overflow-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-[10px] uppercase text-[#8F8881]">
                    <th className="text-left p-2">{lang === "zh" ? "產品" : "Product"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "SKU" : "SKU"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "SEO 標題" : "SEO Title"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "SEO 描述" : "SEO Desc"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "SEO 圖片" : "SEO Image"}</th>
                    <th className="text-left p-2">{lang === "zh" ? "狀態" : "Status"}</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => {
                    const hasTitle = !!(p.seoTitle_zh || p.seoTitle_en)
                    const hasDesc = !!(p.seoDescription_zh || p.seoDescription_en)
                    const hasImage = !!p.seoImage
                    const missing = [!hasTitle, !hasDesc, !hasImage].filter(Boolean).length
                    return (
                      <tr key={p.id} className="border-t border-[#F2ECE4] hover:bg-[#FBF6F0]">
                        <td className="p-2">{p.name_zh}</td>
                        <td className="p-2 font-mono text-[11px]">{p.sku}</td>
                        <td className="p-2">{hasTitle ? "✓" : "✗"}</td>
                        <td className="p-2">{hasDesc ? "✓" : "✗"}</td>
                        <td className="p-2">{hasImage ? "✓" : "✗"}</td>
                        <td className="p-2">
                          <span className={missing === 0 ? "text-green-600" : missing <= 1 ? "text-yellow-600" : "text-red-600"}>
                            {missing === 0 ? (lang === "zh" ? "完整" : "Complete") : missing <= 1 ? (lang === "zh" ? "輕微缺漏" : "Minor gaps") : (lang === "zh" ? "需補齊" : "Needs work")}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SETTINGS TAB ==================== */}
      {tab === "settings" && settings && (
        <div className="space-y-6">
          {/* Store Info */}
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h3 className="text-[12px] uppercase font-semibold mb-4">🏪 {lang === "zh" ? "商店基本設定" : "Store Information"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[12px]">
              <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "商店名稱" : "Store Name"}</label><input value={settings.storeName} onChange={e => setSettings({ ...settings, storeName: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "商店副標題 (中)" : "Tagline (ZH)"}</label><input value={settings.storeTagline_zh} onChange={e => setSettings({ ...settings, storeTagline_zh: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "商店副標題 (EN)" : "Tagline (EN)"}</label><input value={settings.storeTagline_en} onChange={e => setSettings({ ...settings, storeTagline_en: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "聯絡信箱" : "Contact Email"}</label><input value={settings.contactEmail} onChange={e => setSettings({ ...settings, contactEmail: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 font-mono" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "聯絡電話" : "Contact Phone"}</label><input value={settings.contactPhone} onChange={e => setSettings({ ...settings, contactPhone: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 font-mono" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "WhatsApp 電話" : "WhatsApp Number"}</label><input value={settings.whatsappNumber} onChange={e => setSettings({ ...settings, whatsappNumber: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 font-mono" /></div>
              <div className="md:col-span-2"><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "地址 (中)" : "Address (ZH)"}</label><input value={settings.address_zh} onChange={e => setSettings({ ...settings, address_zh: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "地址 (EN)" : "Address (EN)"}</label><input value={settings.address_en} onChange={e => setSettings({ ...settings, address_en: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
            </div>
          </div>

          {/* Social Links */}
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h3 className="text-[12px] uppercase font-semibold mb-4">🔗 {lang === "zh" ? "社群連結設定" : "Social Links"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[12px]">
              <div><label className="text-[10px] uppercase text-[#8F8881]">Instagram URL</label><input value={settings.instagramUrl} onChange={e => setSettings({ ...settings, instagramUrl: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 font-mono text-[11px]" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">Facebook URL</label><input value={settings.facebookUrl} onChange={e => setSettings({ ...settings, facebookUrl: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 font-mono text-[11px]" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">WhatsApp URL</label><input value={settings.whatsappUrl} onChange={e => setSettings({ ...settings, whatsappUrl: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 font-mono text-[11px]" /></div>
            </div>
          </div>

          {/* Announcement Bar */}
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h3 className="text-[12px] uppercase font-semibold mb-4">📢 {lang === "zh" ? "網站頂部公告欄" : "Announcement Bar"}</h3>
            <div className="space-y-3 text-[12px]">
              <label className="flex items-center gap-2 font-medium">
                <input type="checkbox" checked={settings.announcementBarActive} onChange={e => setSettings({ ...settings, announcementBarActive: e.target.checked })} /> 
                {lang === "zh" ? "顯示頂部公告欄" : "Active"}
              </label>
              <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "公告文字 (中)" : "Text (ZH)"}</label><input value={settings.announcementBar_zh} onChange={e => setSettings({ ...settings, announcementBar_zh: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "公告文字 (EN)" : "Text (EN)"}</label><input value={settings.announcementBar_en} onChange={e => setSettings({ ...settings, announcementBar_en: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
            </div>
          </div>

          {/* Shipping Settings */}
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h3 className="text-[12px] uppercase font-semibold mb-4">🚚 {lang === "zh" ? "運費與物流設定" : "Shipping Settings"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[12px]">
              <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "港幣免運費門檻" : "Free Shipping Threshold (HKD)"}</label><input type="number" value={settings.freeShippingThresholdHKD} onChange={e => setSettings({ ...settings, freeShippingThresholdHKD: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 font-mono" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "美金免運費門檻" : "Free Shipping Threshold (USD)"}</label><input type="number" value={settings.freeShippingThresholdUSD} onChange={e => setSettings({ ...settings, freeShippingThresholdUSD: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 font-mono" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "港幣基本運費" : "Flat Shipping Fee (HKD)"}</label><input type="number" value={settings.flatShippingFeeHKD} onChange={e => setSettings({ ...settings, flatShippingFeeHKD: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 font-mono" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "美金基本運費" : "Flat Shipping Fee (USD)"}</label><input type="number" value={settings.flatShippingFeeUSD} onChange={e => setSettings({ ...settings, flatShippingFeeUSD: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 font-mono" /></div>
            </div>
          </div>

          {/* Points & Loyalty Settings */}
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h3 className="text-[12px] uppercase font-semibold mb-4">⭐ {lang === "zh" ? "積分與會員制度設定" : "Points & Loyalty Settings"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-[12px]">
              <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "每消費 HK$1 得積分" : "Points per HK$1 spent"}</label><input type="number" value={settings.pointsPerHKD} onChange={e => setSettings({ ...settings, pointsPerHKD: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 font-mono" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "積分折抵率 (100點 = 折抵$1)" : "Points Redemption Rate (pts = HK$1)"}</label><input type="number" value={settings.pointsRedemptionRate} onChange={e => setSettings({ ...settings, pointsRedemptionRate: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 font-mono" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "生日會員贈送紅利點" : "Birthday Bonus Points"}</label><input type="number" value={settings.birthdayBonusPoints} onChange={e => setSettings({ ...settings, birthdayBonusPoints: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 font-mono" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "生日專屬打折 (%)" : "Birthday Discount (%)"}</label><input type="number" value={settings.birthdayDiscountPercent} onChange={e => setSettings({ ...settings, birthdayDiscountPercent: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 font-mono" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "VIP 會員門檻 (港幣)" : "VIP Threshold (HKD)"}</label><input type="number" value={settings.vipThresholdHKD} onChange={e => setSettings({ ...settings, vipThresholdHKD: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 font-mono" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "Prestige 會員門檻 (港幣)" : "Prestige Threshold (HKD)"}</label><input type="number" value={settings.prestigeThresholdHKD} onChange={e => setSettings({ ...settings, prestigeThresholdHKD: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 font-mono" /></div>
            </div>
          </div>

          {/* First Order Coupon Settings */}
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h3 className="text-[12px] uppercase font-semibold mb-4">🎫 {lang === "zh" ? "新用戶首購優惠券設定" : "First Order Promotion"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[12px]">
              <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "首購優惠折扣代碼" : "Coupon Code"}</label><input value={settings.firstOrderCouponCode} onChange={e => setSettings({ ...settings, firstOrderCouponCode: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 uppercase font-mono" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "首購打折幅度 (%)" : "Discount (%)"}</label><input type="number" value={settings.firstOrderDiscountPercent} onChange={e => setSettings({ ...settings, firstOrderDiscountPercent: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 font-mono" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "首購起用港幣金額" : "Min Amount (HKD)"}</label><input type="number" value={settings.firstOrderMinAmountHKD} onChange={e => setSettings({ ...settings, firstOrderMinAmountHKD: Number(e.target.value) })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 font-mono" /></div>
            </div>
          </div>

          {/* ==================== COLOR TUNER ==================== */}
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h3 className="text-[12px] uppercase font-semibold mb-4">🎨 {lang === "zh" ? "配色調整 / 網站色彩面板" : "Color Tuner / Theme Colors"}</h3>
            <p className="text-[11px] text-[#8F8881] mb-4">
              {lang === "zh" ? "客製化網站整體的視覺色調。此處修改會立刻在正式網站上即時套用生效。" : "Customize the entire site color scheme. Changes apply instantly to the live website."}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[12px]">
              {[
                { key: "brandAccentColor" as const, label: "Brand Accent Color (Site-wide Gold)" },
                { key: "primaryColor" as const, label: "Primary Color (Buttons, Text)" },
                { key: "secondaryColor" as const, label: "Secondary / Accent (Badges)" },
                { key: "accentColor" as const, label: "Accent / Gold (Highlights)" },
                { key: "backgroundColor" as const, label: "Background Color" },
                { key: "cardColor" as const, label: "Card / Surface Color" },
                { key: "textColor" as const, label: "Main Text Color" },
                { key: "mutedTextColor" as const, label: "Muted Text Color" },
                { key: "borderColor" as const, label: "Border Color" }
              ].map(({ key, label }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-[10px] uppercase text-[#8F8881] block mb-1">
                    {lang === "zh" ? colorLabelsZh[key] : label}
                  </label>
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

                  {/* Flexible Color Palette for users to select standard/custom luxury colors */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {premiumColors.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSettings({ ...settings, [key]: color })}
                        className={`w-4 h-4 rounded-full border border-gray-300 transition-all hover:scale-125 focus:outline-none ${settings[key].toLowerCase() === color.toLowerCase() ? "ring-1 ring-[var(--brand-accent)] scale-110" : ""}`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Preset Themes */}
            <div className="mt-4 pt-4 border-t border-[#F2ECE4]">
              <p className="text-[10px] uppercase text-[#8F8881] mb-2 font-semibold">{lang === "zh" ? "快速主題模板預設值：" : "Quick Presets:"}</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setSettings({ ...settings, primaryColor: "#9E7428", brandAccentColor: "#9E7428", secondaryColor: "#825F59", accentColor: "#D8C6A6", backgroundColor: "#FDFBF8", cardColor: "#FFFFFF", textColor: "#111111", mutedTextColor: "#8F8881", borderColor: "#ECE6DF" })} className="border border-[#ECE6DF] bg-white px-3 py-1.5 text-[10px] hover:border-[var(--brand-accent)]">{lang === "zh" ? "典雅米白" : "Classic Cream"}</button>
                <button onClick={() => setSettings({ ...settings, primaryColor: "#1a1a2e", brandAccentColor: "#1a1a2e", secondaryColor: "#16213e", accentColor: "#e94560", backgroundColor: "#f8f9fa", cardColor: "#ffffff", textColor: "#1a1a2e", mutedTextColor: "#6c757d", borderColor: "#dee2e6" })} className="border border-[#ECE6DF] bg-white px-3 py-1.5 text-[10px] hover:border-[var(--brand-accent)]">{lang === "zh" ? "午夜深藍" : "Dark Navy"}</button>
                <button onClick={() => setSettings({ ...settings, primaryColor: "#2d3436", brandAccentColor: "#2d3436", secondaryColor: "#6c5ce7", accentColor: "#fd79a8", backgroundColor: "#fafafa", cardColor: "#ffffff", textColor: "#2d3436", mutedTextColor: "#636e72", borderColor: "#dfe6e9" })} className="border border-[#ECE6DF] bg-white px-3 py-1.5 text-[10px] hover:border-[var(--brand-accent)]">{lang === "zh" ? "現代粉紫" : "Modern Purple"}</button>
                <button onClick={() => setSettings({ ...settings, primaryColor: "#000000", brandAccentColor: "#000000", secondaryColor: "#c0392b", accentColor: "#e74c3c", backgroundColor: "#ffffff", cardColor: "#f5f5f5", textColor: "#000000", mutedTextColor: "#7f8c8d", borderColor: "#ecf0f1" })} className="border border-[#ECE6DF] bg-white px-3 py-1.5 text-[10px] hover:border-[var(--brand-accent)]">{lang === "zh" ? "經典正紅" : "Bold Red"}</button>
                <button onClick={() => setSettings({ ...settings, primaryColor: "#1b4332", brandAccentColor: "#1b4332", secondaryColor: "#2d6a4f", accentColor: "#95d5b2", backgroundColor: "#f0fdf4", cardColor: "#ffffff", textColor: "#1b4332", mutedTextColor: "#52796f", borderColor: "#d8f3dc" })} className="border border-[#ECE6DF] bg-white px-3 py-1.5 text-[10px] hover:border-[var(--brand-accent)]">{lang === "zh" ? "自然森綠" : "Natural Green"}</button>
              </div>
            </div>
          </div>

          {/* ==================== FONT SETTINGS ==================== */}
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h3 className="text-[12px] uppercase font-semibold mb-4">🔤 {lang === "zh" ? "字型與排版設定" : "Font & Typography Settings"}</h3>
            <p className="text-[11px] text-[#8F8881] mb-6">
              {lang === "zh" ? "分別為英文與繁體中文設定「正文字型」與「標題字型」，系統會依訪客當前選用的語言自動套用對應字型。" : "Set a Body font and a Heading font separately for English and for Traditional Chinese. The site automatically applies the matching pair based on the visitor's selected language."}
            </p>

            {/* English fonts */}
            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[var(--primary)] mb-3 pb-2 border-b border-[#F2ECE4]">EN {lang === "zh" ? "英文字型" : "English Fonts"}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[12px]">
                <div>
                  <label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "英文 · 正文字型 (Sans-Serif)" : "English · Body Font (Sans-Serif)"}</label>
                  <select value={settings.fontFamilyEnBody} onChange={e => setSettings({ ...settings, fontFamilyEnBody: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 bg-white">
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
                  <label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "英文 · 標題字型 (Serif)" : "English · Heading Font (Serif)"}</label>
                  <select value={settings.fontFamilyEnHeading} onChange={e => setSettings({ ...settings, fontFamilyEnHeading: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 bg-white">
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
              </div>
              <div className="mt-3 bg-[#FBF6F0] p-4">
                <p style={{ fontFamily: `"${settings.fontFamilyEnBody}", sans-serif` }} className="text-[13px]">Body: {settings.fontFamilyEnBody} — Gentle, dermatologist-formulated repair for sensitive skin</p>
                <p style={{ fontFamily: `"${settings.fontFamilyEnHeading}", serif` }} className="text-[22px] mt-2">Heading: {settings.fontFamilyEnHeading} — CS12 Skincare</p>
              </div>
            </div>

            {/* Chinese fonts */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[var(--primary)] mb-3 pb-2 border-b border-[#F2ECE4]">繁 {lang === "zh" ? "中文字型" : "Chinese Fonts"}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[12px]">
                <div>
                  <label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "中文 · 正文字型 (無襯線)" : "Chinese · Body Font (Sans-Serif)"}</label>
                  <select value={settings.fontFamilyZhBody} onChange={e => setSettings({ ...settings, fontFamilyZhBody: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 bg-white">
                    <option value="Noto Sans TC">思源黑體 (Noto Sans TC) (Default)</option>
                    <option value="Microsoft JhengHei">微軟正黑體 (Microsoft JhengHei)</option>
                    <option value="PingFang TC">蘋方 (PingFang TC)</option>
                    <option value="Heiti TC">黑體-繁 (Heiti TC)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "中文 · 標題字型 (襯線)" : "Chinese · Heading Font (Serif)"}</label>
                  <select value={settings.fontFamilyZhHeading} onChange={e => setSettings({ ...settings, fontFamilyZhHeading: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1 bg-white">
                    <option value="Noto Serif TC">思源宋體 (Noto Serif TC) (Default)</option>
                    <option value="Songti TC">宋體-繁 (Songti TC)</option>
                    <option value="PMingLiU">新細明體 (PMingLiU)</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 bg-[#FBF6F0] p-4">
                <p style={{ fontFamily: `"${settings.fontFamilyZhBody}", sans-serif` }} className="text-[13px]">正文：{settings.fontFamilyZhBody} — 為敏感肌而生的溫和醫研修護</p>
                <p style={{ fontFamily: `"${settings.fontFamilyZhHeading}", serif` }} className="text-[22px] mt-2">標題：{settings.fontFamilyZhHeading} — CS12 護膚</p>
              </div>
            </div>

            {/* Shared sizing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[12px] mt-6 pt-6 border-t border-[#F2ECE4]">
              <div>
                <label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "基礎字型大小 (px)" : "Base Font Size (px)"}</label>
                <input type="range" min="12" max="20" step="1" value={settings.fontSizeBase} onChange={e => setSettings({ ...settings, fontSizeBase: Number(e.target.value) })} className="w-full mt-2" />
                <p className="text-[10px] text-[#8F8881] mt-1">{lang === "zh" ? "當前選用" : "Current"}: {settings.fontSizeBase}px</p>
              </div>
              <div>
                <label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "標題字體縮放比例" : "Font Scale Multiplier"}</label>
                <input type="range" min="0.8" max="1.3" step="0.05" value={settings.fontSizeScale} onChange={e => setSettings({ ...settings, fontSizeScale: Number(e.target.value) })} className="w-full mt-2" />
                <p className="text-[10px] text-[#8F8881] mt-1">{lang === "zh" ? "當前選用" : "Current"}: {settings.fontSizeScale}x</p>
              </div>
            </div>
          </div>

          {/* Maintenance Mode */}
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h3 className="text-[12px] uppercase font-semibold mb-4">🔧 {lang === "zh" ? "網站維護模式" : "Maintenance Mode"}</h3>
            <div className="space-y-3 text-[12px]">
              <label className="flex items-center gap-2 font-medium">
                <input type="checkbox" checked={settings.maintenanceMode} onChange={e => setSettings({ ...settings, maintenanceMode: e.target.checked })} /> 
                {lang === "zh" ? "開啟網站維護模式 (將向公共關閉商店)" : "Enable Maintenance Mode (hides store from public)"}
              </label>
              <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "維護提示文字 (中)" : "Message (ZH)"}</label><input value={settings.maintenanceMessage_zh} onChange={e => setSettings({ ...settings, maintenanceMessage_zh: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
              <div><label className="text-[10px] uppercase text-[#8F8881]">{lang === "zh" ? "維護提示文字 (EN)" : "Message (EN)"}</label><input value={settings.maintenanceMessage_en} onChange={e => setSettings({ ...settings, maintenanceMessage_en: e.target.value })} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1" /></div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-3">
            <button onClick={handleSaveSettings} className="bg-[var(--brand-accent)] text-white px-8 h-11 text-[12px] tracking-[0.14em] uppercase font-bold rounded-[3px] shadow">
              💾 {lang === "zh" ? "儲存所有後台設定" : "Save All Settings"}
            </button>
            <button onClick={refresh} className="border border-[#ECE6DF] bg-white px-6 h-11 text-[12px] uppercase hover:bg-[#FBF6F0]">
              {lang === "zh" ? "重設為當前值" : "Reset to Current"}
            </button>
          </div>
          <p className="text-[10px] text-[#8F8881]">{lang === "zh" ? "最後更新於" : "Last updated"}: {new Date(settings.updatedAt).toLocaleString()}</p>
        </div>
      )}
    </main>
  )
}
