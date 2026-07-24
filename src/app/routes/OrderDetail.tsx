import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useAuthStore } from "../../stores/useAuthStore"
import { useAppStore } from "../../stores/useAppStore"
import { getDBClient } from "../../lib/db/client"
import { Order, Product } from "../../lib/db/types"
import { formatPrice } from "../../lib/currency"
import { showToast } from "../../components/ui/Toast"
import { Truck, CheckCircle, Clock, XCircle, Package, MapPin, CreditCard, Star } from "lucide-react"

export function OrderDetailPage() {
  const { id } = useParams()
  const { user } = useAuthStore()
  const { currency, lang } = useAppStore()
  const [order, setOrder] = useState<Order | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !id) return
    const db = getDBClient()
    db.getOrderById(id).then(o => {
      setOrder(o)
      if (o) {
        db.getProducts().then(p => setProducts(p))
      }
      setLoading(false)
    })
  }, [user, id])

  if (loading) return <div className="w-[min(calc(100%-24px),1440px)] mx-auto py-20 text-center">Loading...</div>
  if (!order) return <div className="w-[min(calc(100%-24px),1440px)] mx-auto py-20 text-center">Order not found</div>

  const statusConfig: Record<string, { label_zh: string; label_en: string; icon: any; color: string }> = {
    pending: { label_zh: "待付款", label_en: "Pending", icon: Clock, color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
    paid: { label_zh: "已付款", label_en: "Paid", icon: CheckCircle, color: "text-green-600 bg-green-50 border-green-200" },
    shipped: { label_zh: "已出貨", label_en: "Shipped", icon: Truck, color: "text-blue-600 bg-blue-50 border-blue-200" },
    delivered: { label_zh: "已妥投", label_en: "Delivered", icon: Package, color: "text-[var(--brand-accent)] bg-[var(--brand-accent)] text-white border-[var(--brand-accent)]" },
    cancelled: { label_zh: "已取消", label_en: "Cancelled", icon: XCircle, color: "text-red-600 bg-red-50 border-red-200" }
  }

  const status = statusConfig[order.status] || statusConfig.pending
  const StatusIcon = status.icon

  const getProductName = (productId: string, variantId?: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return productId
    if (variantId) {
      const variant = product.variants?.find(v => v.id === variantId)
      if (variant) return lang==="zh"?variant.name_zh:variant.name_en
    }
    return lang==="zh"?product.name_zh:product.name_en
  }

  const getProductImage = (productId: string, variantId?: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return "https://placehold.co/100x100/FBF6F0/8F8881?text=CS12"
    if (variantId) {
      const variant = product.variants?.find(v => v.id === variantId)
      if (variant?.image) return variant.image
    }
    return product.images[0]
  }

  const getProductPrice = (productId: string, variantId?: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return { hkd: 0, usd: 0 }
    if (variantId) {
      const variant = product.variants?.find(v => v.id === variantId)
      if (variant) return { hkd: variant.price_hkd, usd: variant.price_usd }
    }
    return { hkd: product.price_hkd, usd: product.price_usd }
  }

  return (
    <main className="w-[min(calc(100%-24px),1440px)] mx-auto py-6 md:py-10">
      <div className="mb-6">
        <Link to="/account" className="text-[11px] underline text-[#8F8881]">{lang==="zh"?"← 返回訂單列表":"← Back to Orders"}</Link>
      </div>

      <div className="bg-white border border-[#ECE6DF] rounded-[4px] overflow-hidden">
        {/* Header */}
        <div className="bg-[#FBF6F0] border-b border-[#ECE6DF] p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-[28px]">{lang==="zh"?"訂單詳情":"Order Details"}</h1>
              <p className="text-[12px] text-[#8F8881] mt-1">{order.id} • {new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-full font-medium text-[11px] uppercase ${status.color}`}>
                <StatusIcon size={12} className="inline-block mr-1" />
                {lang==="zh"?status.label_zh:status.label_en}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Items */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-[12px] uppercase tracking-[0.14em] font-semibold text-[#8F8881] mb-4">{lang==="zh"?"訂單商品":"Order Items"} ({order.items.length})</h2>
            <div className="space-y-4">
              {order.items.map((item, idx) => {
                const name = getProductName(item.productId, item.variantId)
                const image = getProductImage(item.productId, item.variantId)
                const price = getProductPrice(item.productId, item.variantId)
                return (
                  <div key={`${item.productId}-${item.variantId || "base"}-${idx}`} className="border border-[#F2ECE4] p-4 flex gap-4">
                    <div className="w-20 h-20 bg-[#FBF6F0] border border-[#F2ECE4] shrink-0">
                      <img src={image} alt={name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <Link to={`/product/${products.find(p => p.id === item.productId)?.slug}`} className="font-serif text-[16px] leading-tight block">{name}</Link>
                      {item.variantId && (
                        <p className="text-[10px] text-[#8F8881] mt-0.5">{lang==="zh"?"規格":"Variant"}:</p>
                      )}
                      <p className="text-[11px] text-[#8F8881] mt-1">x{item.qty} • {formatPrice(price.hkd * item.qty, price.usd * item.qty, currency)}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Gift Items */}
            {order.gifts.length > 0 && (
              <div className="mt-6 pt-6 border-t border-[#F2ECE4]">
                <h3 className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#8F8881] mb-3">{lang==="zh"?"贈品禮遇":"Gift Items"}</h3>
                <div className="flex flex-wrap gap-2">
                  {order.gifts.map((gift, idx) => (
                    <span key={idx} className="bg-[#FEF3C7] border border-[#FDE68A] text-[10px] px-3 py-1 rounded">{gift}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Info */}
            <div className="mt-6 pt-6 border-t border-[#F2ECE4]">
              <h3 className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#8F8881] mb-3">{lang==="zh"?"付款資訊":"Payment Information"}</h3>
              <div className="grid grid-cols-2 gap-4 text-[12px]">
                <div><span className="text-[#8F8881]">{lang==="zh"?"付款方式":"Payment Method"}:</span> <span className="font-medium ml-2">{order.couponCode ? `${order.couponCode} + ` : ""}{lang==="zh"?"信用卡/電子支付":"Credit Card/E-Payment"}</span></div>
                <div><span className="text-[#8F8881]">{lang==="zh"?"優惠碼":"Coupon Code"}:</span> <span className="font-medium ml-2">{order.couponCode || (lang==="zh"?"無":"None")}</span></div>
                <div><span className="text-[#8F8881]">{lang==="zh"?"積分抵扣":"Points Used"}:</span> <span className="font-medium ml-2">-{order.pointsUsed} ({lang==="zh"?"約 HK$":"≈ HK$"}{(order.pointsUsed/100).toFixed(0)})</span></div>
                <div><span className="text-[#8F8881]">{lang==="zh"?"本次獲得積分":"Points Earned"}:</span> <span className="font-medium text-green-600 ml-2">+{order.pointsEarned}</span></div>
              </div>
            </div>
          </div>

          {/* Sidebar - Order Summary & Shipping */}
          <div className="lg:col-span-1">
            <div className="bg-[#FBF6F0] border border-[#ECE6DF] p-6 sticky top-[100px]">
              <h3 className="text-[12px] uppercase tracking-[0.18em] font-semibold mb-4">{lang==="zh"?"訂單摘要":"Order Summary"}</h3>
              <div className="space-y-3 text-[13px]">
                <div className="flex justify-between"><span>{lang==="zh"?"商品小計":"Subtotal"}</span><span>{formatPrice(order.subtotalHKD, order.subtotalUSD, currency)}</span></div>
                {order.discountHKD > 0 && <div className="flex justify-between text-green-700"><span>{lang==="zh"?"折扣優惠":"Discount"} {order.couponCode}</span><span>-{formatPrice(order.discountHKD, order.discountUSD, currency)}</span></div>}
                <div className="flex justify-between"><span>{lang==="zh"?"運費":"Shipping"}</span><span>{order.shippingHKD === 0 ? (lang==="zh"?"免費":"Free") : formatPrice(order.shippingHKD, order.shippingUSD, currency)}</span></div>
                <div className="border-t border-[#ECE6DF] pt-3 flex justify-between font-semibold text-[16px]"><span>{lang==="zh"?"合計":"Total"}</span><span>{formatPrice(order.totalHKD, order.totalUSD, currency)}</span></div>
              </div>

              <div className="mt-6 pt-6 border-t border-[#ECE6DF] space-y-4">
                <h4 className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#8F8881]">{lang==="zh"?"配送地址":"Shipping Address"}</h4>
                <div className="text-[12px] text-[#3A3734] leading-relaxed">
                  {order.shippingAddress.email && <p className="text-[#8F8881] text-[12px] mb-1">{order.shippingAddress.email}</p>}
                  <p className="font-medium">{order.shippingAddress.firstName ? `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}` : order.shippingAddress.name}</p>
                  {order.shippingAddress.company && <p>{order.shippingAddress.company}</p>}
                  <p>{order.shippingAddress.phone}</p>
                  <p>{order.shippingAddress.address}</p>
                  {order.shippingAddress.address2 && <p>{order.shippingAddress.address2}</p>}
                  <p>{order.shippingAddress.district}</p>
                </div>
              </div>

              {order.giftTier && (
                <div className="mt-4 pt-4 border-t border-[#ECE6DF] bg-[var(--brand-accent)] text-white p-3 text-[11px] rounded">
                  🎁 {lang==="zh"?order.giftTier==="tier2_3000"?"滿 HK$3,000 禮遇 (10件禮品)":"滿 HK$2,000 禮遇 (6件禮品)":order.giftTier==="tier2_3000"?"Spend HK$3,000 Tier (10 gifts)":"Spend HK$2,000 Tier (6 gifts)"}
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-[#ECE6DF] text-[11px] text-[#8F8881] space-y-1">
                <p>📦 {lang==="zh"?"訂單編號":"Order ID"}: {order.id}</p>
                <p>📅 {lang==="zh"?"下單日期":"Order Date"}: {new Date(order.createdAt).toLocaleString()}</p>
                <p>💰 {lang==="zh"?"付款貨幣":"Currency"}: {order.currency}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Timeline */}
      <section className="mt-8">
        <h2 className="text-[12px] uppercase tracking-[0.14em] font-semibold text-[#8F8881] mb-4">{lang==="zh"?"訂單進度":"Order Timeline"}</h2>
        <div className="bg-white border border-[#ECE6DF] p-6">
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-[#ECE6DF]"></div>
            {[
              { key: "pending", label_zh: "建立訂單", label_en: "Order Placed", time: order.createdAt },
              { key: "paid", label_zh: "付款完成", label_en: "Payment Confirmed", time: order.status !== "pending" ? order.createdAt : null },
              { key: "shipped", label_zh: "已出貨", label_en: "Shipped", time: order.status === "shipped" || order.status === "delivered" ? order.createdAt : null },
              { key: "delivered", label_zh: "已妥投", label_en: "Delivered", time: order.status === "delivered" ? order.createdAt : null },
            ].map((step, idx) => {
              const isActive = ["pending", "paid", "shipped", "delivered"].indexOf(order.status) >= ["pending", "paid", "shipped", "delivered"].indexOf(step.key)
              const isCurrent = order.status === step.key
              return (
                <div key={step.key} className="relative pl-14 pb-8 flex items-start">
                  <div className={`absolute left-6 top-1 w-3 h-3 rounded-full border-2 transition-all ${isActive ? "bg-[var(--brand-accent)] border-[var(--brand-accent)]" : "bg-white border-[#ECE6DF]"} ${isCurrent ? "ring-2 ring-[var(--brand-accent)] ring-offset-2" : ""}`}></div>
                  <div className="ml-4">
                    <p className={`font-semibold ${isActive ? "text-[var(--brand-accent)]" : "text-[#8F8881]"}`}>{lang==="zh"?step.label_zh:step.label_en}</p>
                    {step.time && <p className="text-[11px] text-[#8F8881] mt-0.5">{new Date(step.time).toLocaleString()}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}