import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { getDBClient } from "../../lib/db/client"
import { Product, ProductVariant } from "../../lib/db/types"
import { useAppStore } from "../../stores/useAppStore"
import { formatPrice } from "../../lib/currency"
import { useCartStore } from "../../stores/useCartStore"
import { useWishlistStore } from "../../stores/useWishlistStore"
import { useRecentlyViewedStore } from "../../stores/useRecentlyViewedStore"
import { useWaitlistStore } from "../../stores/useWaitlistStore"
import { ProductCard } from "../../components/product/ProductCard"
import { showToast } from "../../components/ui/Toast"
import { Mail, Bell, Eye, CheckCircle } from "lucide-react"

export function ProductDetailPage() {
  const { slug } = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [qty, setQty] = useState(1)
  const [tab, setTab] = useState<"desc"|"info"|"reviews">("desc")
  const [reviews, setReviews] = useState<{ id: string; name: string; rating: number; comment: string; date: string }[]>([])
  const [reviewName, setReviewName] = useState("")
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState("")
  // Waitlist modal
  const [showWaitlistModal, setShowWaitlistModal] = useState(false)
  const [waitlistEmail, setWaitlistEmail] = useState("")
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false)
  
  const { currency, lang } = useAppStore()
  const { addItem } = useCartStore()
  const { toggle: toggleWishlist, has: isWishlisted } = useWishlistStore()
  const { addProduct: addRecentlyViewed } = useRecentlyViewedStore()
  const { subscribe: subscribeWaitlist, isSubscribed: isWaitlisted } = useWaitlistStore()

  useEffect(()=>{
    if(!slug) return
    getDBClient().getProductBySlug(slug).then(p=>{
      setProduct(p)
      if(p) {
        // Track recently viewed
        addRecentlyViewed(p)
        getDBClient().getProducts().then(all=>{
          setRelated(all.filter(a=>a.series===p.series && a.id!==p.id).slice(0,4))
        })
        // Load variants
        getDBClient().getProductVariants(p.id).then(v => {
          if (v.length > 0) {
            setVariants(v)
            setSelectedVariant(v.find(v => v.isDefault) || v[0])
          }
        })
        // Load reviews from localStorage
        try {
          const raw = localStorage.getItem(`cs12_reviews_${p.id}`)
          if(raw) setReviews(JSON.parse(raw))
        } catch {}
      }
    })
  },[slug])

  // Determine current product data (variant or base product)
  const currentProduct = selectedVariant || product
  const displayName = lang==="zh"?currentProduct?.name_zh:currentProduct?.name_en
  const displayDesc = lang==="zh"?currentProduct?.description_zh:currentProduct?.description_en
  const displayPriceHKD = currentProduct?.price_hkd ?? product?.price_hkd ?? 0
  const displayPriceUSD = currentProduct?.price_usd ?? product?.price_usd ?? 0
  const displayOriginalHKD = currentProduct?.original_price_hkd ?? product?.original_price_hkd
  const displayOriginalUSD = currentProduct?.original_price_usd ?? product?.original_price_usd
  const displayStock = currentProduct?.stock ?? product?.stock ?? 0
  const displaySKU = currentProduct?.sku ?? product?.sku ?? ""
  const displayWeight = currentProduct?.weight_kg ?? product?.weight_kg ?? 0
  const displayImages = currentProduct?.image ? [currentProduct.image, ...(product?.images || []).slice(1)] : (product?.images || [])
  const isOutOfStock = displayStock <= 0
  const isWishlistedProduct = product ? isWishlisted(product.id) : false

  const submitReview = () => {
    if (!reviewName.trim() || !reviewComment.trim()) {
      showToast("error", lang==="zh"?"請填寫姓名和評價":"Please fill in name and review")
      return
    }
    const newReview = {
      id: "rev_" + Date.now(),
      name: reviewName.trim(),
      rating: reviewRating,
      comment: reviewComment.trim(),
      date: new Date().toISOString()
    }
    const updated = [...reviews, newReview]
    setReviews(updated)
    if (product) {
      localStorage.setItem(`cs12_reviews_${product.id}`, JSON.stringify(updated))
      // Update review count
      getDBClient().updateProduct(product.id, { reviewsCount: (product.reviewsCount || 0) + 1 })
    }
    setReviewName("")
    setReviewRating(5)
    setReviewComment("")
    showToast("success", lang==="zh"?"感謝您的評價！獲得 50 積分獎勵":"Thank you for your review! Earned 50 bonus points")
  }

  const handleAddToCart = () => {
    if (!currentProduct || !product) return
    if (isOutOfStock) {
      showToast("error", lang==="zh"?"此產品已售罄":"This product is out of stock")
      setShowWaitlistModal(true)
      return
    }
    addItem(product, qty, currentProduct.id !== product.id ? currentProduct : undefined)
    showToast("cart", lang==="zh"?`已加入購物車：${displayName}`:`Added to cart: ${displayName}`)
  }

  const handleWaitlistSubmit = async () => {
    if (!waitlistEmail.trim() || !product) return
    setWaitlistSubmitting(true)
    const result = await subscribeWaitlist(product.id, waitlistEmail.trim())
    if (result.success) {
      showToast("success", result.message)
      setWaitlistEmail("")
      setShowWaitlistModal(false)
    } else {
      showToast("error", result.message)
    }
    setWaitlistSubmitting(false)
  }

  if(!product) return <div className="py-20 text-center">Product not found.<br/><Link to="/shop" className="underline">Back to Shop</Link></div>

  return (
    <main className="w-[min(calc(100%-24px),1440px)] mx-auto py-6 md:py-8">
      <div className="text-[11px] text-[#8F8881] mb-4"><Link to="/shop">Shop</Link> / {product.series} / {displayName}</div>
      <div className="grid md:grid-cols-2 gap-10">
        <div className="space-y-4">
          <div className="aspect-square bg-[#FBF6F0] border border-[#F2ECE4] overflow-hidden">
            <img src={displayImages[0]} alt={displayName} className="w-full h-full object-cover"/>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {displayImages.slice(0,4).map((img,i)=><div key={i} className="aspect-square bg-[#FBF6F0] border border-[#F2ECE4]"><img src={img} className="w-full h-full object-cover"/></div>)}
          </div>
        </div>
        <div>
          <p className="text-[10px] tracking-[0.18em] uppercase text-[#8F8881] mb-2">{product.series} • {product.category.join(" / ")}</p>
          <h1 className="font-serif text-[36px] leading-[1] mb-3">{displayName}</h1>
          
          {/* Variant Selector */}
          {variants.length > 0 && (
            <div className="mb-4 p-3 bg-[#FBF6F0] border border-[#ECE6DF] rounded">
              <label className="text-[10px] tracking-[0.18em] uppercase font-semibold text-[#8F8881] block mb-2">
                {lang==="zh"?"選擇規格":"Select Variant"}
              </label>
              <div className="flex flex-wrap gap-2">
                {variants.map(v => {
                  const vName = lang==="zh"?v.name_zh:v.name_en
                  const attrs = Object.entries(v.attributes).map(([k,val]) => `${k}: ${val}`).join(", ")
                  return (
                    <button
                      key={v.id}
                      onClick={() => { setSelectedVariant(v); setQty(1) }}
                      className={`px-3 py-2 text-[11px] border rounded transition ${selectedVariant?.id === v.id ? "bg-[#111] text-white border-[#111]" : "bg-white border-[#ECE6DF] hover:border-[#111]"} disabled={v.stock <= 0}`}
                      disabled={v.stock <= 0}
                    >
                      {vName} {attrs && <span className="text-[#8F8881] ml-1">({attrs})</span>}
                      {v.stock <= 0 && <span className="text-red-500 ml-1">({lang==="zh"?"售罄":"Sold Out"})</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 mb-4">
            <span className="text-[12px]">★ {product.rating} ({product.reviewsCount})</span>
            <span className="text-[11px] text-[#8F8881]">
              {isOutOfStock 
                ? (lang==="zh"?"售罄":"Sold Out") 
                : `${displayStock} ${lang==="zh"?"件庫存":"in stock"}`}
            </span>
            <span className="text-[11px] bg-[#111] text-white px-2 py-[1px]">{product.points} 積分 Points</span>
          </div>
          <div className="flex items-baseline gap-3 mb-6">
            {displayOriginalHKD && <span className="line-through text-[#BBB5AD]">{formatPrice(displayOriginalHKD, displayOriginalUSD||0, currency)}</span>}
            <span className="text-[28px] font-medium">{formatPrice(displayPriceHKD, displayPriceUSD, currency)}</span>
          </div>

          {product.bundleGiftLabel && <div className="mb-4 inline-block bg-[#FEF3C7] border border-[#FDE68A] text-[11px] px-3 py-1">{product.bundleGiftLabel} • {lang==="zh"?"官網限定套裝":"Exclusive Bundle"}</div>}

          <div className="mb-6">
            <label className="text-[10px] tracking-[0.18em] uppercase font-semibold">{lang==="zh"?"數量":"Quantity"}</label>
            <div className="flex items-center gap-2 mt-2">
              <button onClick={()=>setQty(Math.max(1,qty-1))} className="w-9 h-9 border border-[#ECE6DF]">-</button>
              <span className="w-12 text-center">{qty}</span>
              <button onClick={()=>setQty(Math.min(displayStock, qty+1))} className="w-9 h-9 border border-[#ECE6DF]">+</button>
            </div>
          </div>

          {/* Wishlist Button */}
          <button
            onClick={() => { if(product) { toggleWishlist(product.id); showToast("info", isWishlistedProduct ? (lang==="zh"?"已從願望清單移除":"Removed from wishlist") : (lang==="zh"?"已加入願望清單":"Added to wishlist")) }}}
            className={`w-full h-[52px] bg-white border border-[#111] text-[#111] text-[12px] tracking-[0.18em] uppercase hover:bg-[#111] hover:text-white transition mb-2 flex items-center justify-center gap-2`}
          >
            <Eye size={18} className={isWishlistedProduct ? "text-[#111]" : "text-[#8F8881]"} />
            {isWishlistedProduct ? (lang==="zh"?"已加入願望清單":"In Wishlist") : (lang==="zh"?"加入願望清單":"Add to Wishlist")}
          </button>

          <button onClick={handleAddToCart} className={`w-full h-[52px] text-[12px] tracking-[0.18em] uppercase transition ${isOutOfStock ? "bg-[#ECE6DF] text-[#8F8881] cursor-not-allowed" : "bg-[#111] text-white hover:bg-black"}`}>
            {isOutOfStock 
              ? (lang==="zh"?"售罄 - 登記補貨通知":"Sold Out - Notify Me") 
              : `${lang==="zh"?"加入購物車":"Add to Cart"} • ${formatPrice(displayPriceHKD*qty, displayPriceUSD*qty, currency)}`}
          </button>

          <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
            <div className="border border-[#ECE6DF] p-3 bg-[#FBF6F0]">🚚 {lang==="zh"?"滿 $800 免運費":"Free shipping over $800"}</div>
            <div className="border border-[#ECE6DF] p-3 bg-[#FBF6F0]">🎁 {lang==="zh"?"購買即可賺取積分":"Earn points"}</div>
          </div>

          <div className="mt-10 border-t border-[#ECE6DF]">
            <div className="flex gap-6 text-[11px] tracking-[0.14em] uppercase mt-4">
              <button onClick={()=>setTab("desc")} className={`pb-2 border-b ${tab==="desc"?"border-black":"border-transparent text-[#8F8881]"}`}>{lang==="zh"?"描述":"Description"}</button>
              <button onClick={()=>setTab("info")} className={`pb-2 border-b ${tab==="info"?"border-black":"border-transparent text-[#8F8881]"}`}>{lang==="zh"?"額外資訊":"Additional Info"}</button>
              <button onClick={()=>setTab("reviews")} className={`pb-2 border-b ${tab==="reviews"?"border-black":"border-transparent text-[#8F8881]"}`}>{lang==="zh"?"評價":"Reviews"} ({reviews.length})</button>
            </div>
            <div className="py-6 text-[13px] leading-relaxed text-[#3A3734]">
              {tab==="desc" && (
                <div>
                  <p>{displayDesc || (lang==="zh"?product.description_zh:product.description_en)}</p>
                  <ul className="mt-4 list-disc pl-5 space-y-1 text-[#5C5651]">
                    {lang==="zh" ? (
                      <>
                        <li>促進皮膚深層細胞新陳代謝</li>
                        <li>舒緩敏感和發炎皮膚</li>
                        <li>退紅消腫和鎮靜刺激性皮膚</li>
                        <li>達到深層潔淨和提亮肌膚光澤</li>
                        <li>持久保濕和鎖住水分</li>
                      </>
                    ) : (
                      <>
                        <li>Promotes deep cellular skin metabolism</li>
                        <li>Soothes sensitive and inflamed skin</li>
                        <li>Reduces redness, swelling, and calms irritated skin</li>
                        <li>Deep cleansing and skin radiance enhancement</li>
                        <li>Long-lasting hydration and moisture lock</li>
                      </>
                    )}
                  </ul>
                  <p className="mt-4 text-[11px] text-[#8F8881]">
                    {lang==="zh"
                      ? <>適合膚質：所有膚質，包括普通、敏感、乾性、油性、暗沉肌膚<br/>配方證明：美國FDA認可、抗敏專利配方</>
                      : <>Suitable for: All skin types including normal, sensitive, dry, oily, and dull skin<br/>Certification: US FDA recognized, patented anti-allergy formula</>
                    }
                  </p>
                </div>
              )}
              {tab==="info" && (
                <div className="space-y-2">
                  <p>{lang==="zh"?"重量":"Weight"} | {displayWeight} {lang==="zh"?"公斤":"kg"}</p>
                  <p>{lang==="zh"?"貨號":"SKU"}: {displaySKU}</p>
                  <p>{lang==="zh"?"分類":"Category"}: {product.category.join(", ")}</p>
                  <p>{lang==="zh"?"膚質":"Skin Type"}: {product.skinType.join(", ")}</p>
                  {selectedVariant && (
                    <p className="text-[11px] text-[#8F8881]">
                      {lang==="zh"?"所選規格":"Selected Variant"}: {lang==="zh"?selectedVariant.name_zh:selectedVariant.name_en}
                    </p>
                  )}
                </div>
              )}
              {tab==="reviews" && (
                <div>
                  {reviews.length === 0 ? (
                    <p className="text-[#8F8881] mb-6">{lang==="zh"?"目前還沒有評價。搶先評價可獲額外 50 積分！":"No reviews yet. Be the first to review and earn 50 bonus points!"}</p>
                  ) : (
                    <div className="space-y-4 mb-8">
                      {reviews.map(r => (
                        <div key={r.id} className="border border-[#F2ECE4] p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-[13px]">{r.name}</span>
                            <span className="text-[12px]">{"★".repeat(r.rating)}{"☆".repeat(5-r.rating)}</span>
                            <span className="text-[10px] text-[#8F8881] ml-auto">{new Date(r.date).toLocaleDateString()}</span>
                          </div>
                          <p className="text-[12px] text-[#5C5651]">{r.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="bg-[#FBF6F0] border border-[#ECE6DF] p-5">
                    <h4 className="text-[12px] tracking-[0.14em] uppercase font-semibold mb-3">{lang==="zh"?"撰寫評價":"Write a Review"}</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] text-[#8F8881]">{lang==="zh"?"您的名稱":"Your Name"}</label>
                        <input value={reviewName} onChange={e=>setReviewName(e.target.value)} className="w-full border border-[#ECE6DF] h-9 px-3 text-[12px] mt-1"/>
                      </div>
                      <div>
                        <label className="text-[11px] text-[#8F8881]">{lang==="zh"?"評分":"Rating"}</label>
                        <div className="flex gap-1 mt-1">
                          {[1,2,3,4,5].map(s => (
                            <button key={s} onClick={()=>setReviewRating(s)} className={`text-[18px] ${s <= reviewRating ? "text-[#111]" : "text-[#ECE6DF]"}`}>★</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-[#8F8881]">{lang==="zh"?"您的評價":"Your Review"}</label>
                        <textarea value={reviewComment} onChange={e=>setReviewComment(e.target.value)} rows={3} className="w-full border border-[#ECE6DF] px-3 py-2 text-[12px] mt-1"/>
                      </div>
                      <button onClick={submitReview} className="bg-[#111] text-white px-6 h-9 text-[11px] tracking-[0.14em] uppercase">{lang==="zh"?"提交評價":"Submit Review"}</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {related.length>0 && (
        <section className="mt-20">
          <h3 className="font-serif text-[26px] mb-6">{lang==="zh"?"相關商品":"Related Products"}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {related.map(p=><ProductCard key={p.id} product={p}/>)}
          </div>
        </section>
      )}

      {/* Recently Viewed Section */}
      <section className="mt-20">
        <h3 className="font-serif text-[26px] mb-6">{lang==="zh"?"最近瀏覽":"Recently Viewed"}</h3>
        <RecentlyViewedSection />
      </section>

      {/* Waitlist Modal */}
      {showWaitlistModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={() => setShowWaitlistModal(false)}>
          <div className="bg-white border border-[#ECE6DF] max-w-md w-full p-6 rounded-[6px] shadow-2xl animate-scaleUp" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <Bell size={24} className="text-[#825F59]" />
              <h3 className="font-serif text-[20px]">{lang==="zh"?"補貨通知":"Back in Stock Alert"}</h3>
            </div>
            <p className="text-[13px] text-[#5C5651] mb-4">
              {lang==="zh"
                ? `"${displayName}" 目前售罄。請輸入您的電郵，補貨時我們會第一時間通知您。`
                : `"${displayName}" is currently out of stock. Enter your email and we'll notify you as soon as it's back.`
              }
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-[#8F8881] block mb-1">{lang==="zh"?"電郵地址":"Email Address"} *</label>
                <input
                  type="email"
                  value={waitlistEmail}
                  onChange={e => setWaitlistEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full border border-[#ECE6DF] h-10 px-3 text-[13px]"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleWaitlistSubmit} disabled={waitlistSubmitting || !waitlistEmail.trim()} className="flex-1 bg-[#111] text-white h-10 text-[11px] tracking-[0.14em] uppercase disabled:opacity-50">
                  {waitlistSubmitting ? (lang==="zh"?"處理中...":"Subscribing...") : (lang==="zh"?"訂閱通知":"Subscribe to Alert")}
                </button>
                <button onClick={() => { setShowWaitlistModal(false); setWaitlistEmail("") }} className="px-6 h-10 border border-[#ECE6DF] text-[11px] uppercase">
                  {lang==="zh"?"取消":"Cancel"}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-[#8F8881] mt-4 text-center">
              {lang==="zh"?"我們承諾不會發送垃圾郵件，您可隨時取消訂閱。":"No spam, unsubscribe anytime."}
            </p>
          </div>
        </div>
      )}
    </main>
  )
}

// Recently Viewed Section Component
function RecentlyViewedSection() {
  const { items } = useRecentlyViewedStore()

  // Filter out current product (would need context, simplified here)
  const recentItems = items.slice(0, 4)
  
  if (recentItems.length === 0) return null
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {recentItems.map(p => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}