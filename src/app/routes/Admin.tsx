import { useEffect, useState } from "react"
import { useAuthStore } from "../../stores/useAuthStore"
import { getDBClient } from "../../lib/db/client"
import { Product, User, Order, Coupon } from "../../lib/db/types"
import { useNavigate } from "react-router-dom"
import { showToast } from "../../components/ui/Toast"
import { useAppStore } from "../../stores/useAppStore"

export function AdminPage() {
  const { user } = useAuthStore()
  const { lang } = useAppStore()
  const nav = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [tab, setTab] = useState<"crm"|"products"|"orders"|"coupons"|"bundles">("crm")
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [orderFilter, setOrderFilter] = useState<string>("all")

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
  const paidOrders = orders.filter(o=>o.status==="paid"||o.status==="shipped"||o.status==="delivered")
  const newUsersThisMonth = users.filter(u=> new Date(u.createdAt).getMonth()===new Date().getMonth()).length

  const filteredOrders = orderFilter === "all" ? orders : orders.filter(o => o.status === orderFilter)

  const filteredProducts = searchTerm
    ? products.filter(p => (p.name_zh+p.name_en+p.sku+p.id).toLowerCase().includes(searchTerm.toLowerCase()))
    : products

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

  // Order status update
  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order["status"]) => {
    const db = getDBClient()
    await db.updateOrder(orderId, { status: newStatus })
    showToast("success", `訂單 ${orderId} 狀態已更新為 ${newStatus}`)
    refresh()
  }

  // Coupon toggle active
  const handleToggleCoupon = async (code: string, isActive: boolean) => {
    const db = getDBClient()
    await db.updateCoupon(code, { isActive })
    showToast("success", `優惠碼 ${code} 已${isActive ? "啟用" : "停用"}`)
    refresh()
  }

  // User role update
  const handleToggleUserRole = async (userId: string, newRole: "customer" | "admin") => {
    const db = getDBClient()
    await db.updateUser(userId, { role: newRole })
    showToast("success", `用戶角色已更新為 ${newRole}`)
    refresh()
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
              <button onClick={()=>{setEditingProduct({}); setIsAdding(true)}} className="bg-[#111] text-white px-4 h-8 text-[11px] uppercase">+ Add Product</button>
            </div>
          </div>

          {/* Product Edit/Add Form */}
          {editingProduct && (
            <div className="p-6 bg-[#FBF6F0] border-b border-[#ECE6DF]">
              <h4 className="text-[12px] uppercase font-semibold mb-4">{isAdding ? "+ Add New Product" : `Edit: ${editingProduct.name_zh}`}</h4>
              <div className="grid md:grid-cols-3 gap-4 text-[12px]">
                <div><label className="text-[10px] uppercase text-[#8F8881]">名稱 (中) *</label><input value={editingProduct.name_zh||""} onChange={e=>setEditingProduct({...editingProduct, name_zh: e.target.value})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1"/></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">Name (EN)</label><input value={editingProduct.name_en||""} onChange={e=>setEditingProduct({...editingProduct, name_en: e.target.value})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1"/></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">SKU *</label><input value={editingProduct.sku||""} onChange={e=>setEditingProduct({...editingProduct, sku: e.target.value})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1"/></div>
                <div><label className="text-[10px] uppercase text-[#8F8881]">Price HKD *</label><input type="number" value={editingProduct.price_hkd||""} onChange={e=>setEditingProduct({...editingProduct, price_hkd: Number(e.target.value)})} className="w-full border border-[#ECE6DF] h-9 px-2 mt-1"/></div>
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
                    <button onClick={()=>{setEditingProduct(p); setIsAdding(false)}} className="underline text-[#8F8881] hover:text-[#111]">Edit</button>
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
          <div className="bg-white border border-[#ECE6DF] p-6">
            <h3 className="text-[12px] uppercase font-semibold mb-4">Promotion Coupons</h3>
            <table className="w-full text-[12px]">
              <thead><tr className="text-[10px] uppercase text-[#8F8881]"><th className="text-left p-2">Code</th><th className="text-left p-2">Type</th><th className="text-left p-2">Value</th><th className="text-left p-2">Min HKD</th><th className="text-left p-2">First Only</th><th className="text-left p-2">Active</th><th className="text-left p-2">Used</th><th className="text-left p-2">Actions</th></tr></thead>
              <tbody>{coupons.map(c=>(
                <tr key={c.code} className="border-t border-[#F2ECE4]">
                  <td className="p-2 font-mono font-semibold">{c.code}</td>
                  <td className="p-2">{c.type}</td>
                  <td className="p-2">{c.value}{c.type==="percent"?"%":""}</td>
                  <td className="p-2">{c.minAmountHKD||"-"}</td>
                  <td className="p-2">{c.onlyFirstOrder?"✔":"-"}</td>
                  <td className="p-2">
                    <button onClick={()=>handleToggleCoupon(c.code, !c.isActive)} className={`px-2 py-[1px] text-[10px] ${c.isActive?"bg-green-100 text-green-700":"bg-gray-100 text-gray-500"}`}>
                      {c.isActive?"Active":"Inactive"}
                    </button>
                  </td>
                  <td className="p-2">{c.usedCount}</td>
                  <td className="p-2 text-[10px] text-[#8F8881]">
                    {c.validFrom} → {c.validTo}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="bg-[#FBF6F0] border border-[#ECE6DF] p-6 text-[12px] leading-relaxed">
            <h4 className="font-semibold mb-2">Promotion Engine Status</h4>
            <ul className="list-disc pl-5 space-y-1 text-[#5C5651]">
              <li>NEWCS12: 15% off first order over HK$1500</li>
              <li>BIRTHDAY10: 10% off for birthday month (auto-activated)</li>
              <li>Gift tiers: HK$2000 → 6 gifts (value 975), HK$3000 → 10 gifts (value 1741)</li>
              <li>Free shipping: over HK$800 / USD$100</li>
              <li>Points: 1 HKD = 1 point, 100 pts = HK$1, Member→VIP(5000)→Prestige(10000)</li>
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
                <button onClick={()=>{setEditingProduct(b); setIsAdding(false); setTab("products")}} className="underline text-[11px] text-[#8F8881]">Edit</button>
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
          <button onClick={()=>{setEditingProduct({ isBundle: true, bundleGiftLabel: "買2送3" }); setIsAdding(true); setTab("products")}} className="border-2 border-dashed border-[#ECE6DF] p-5 text-center text-[12px] text-[#8F8881] hover:border-[#111] hover:text-[#111] transition cursor-pointer">
            + Create New Bundle
          </button>
        </div>
      )}
    </main>
  )
}
