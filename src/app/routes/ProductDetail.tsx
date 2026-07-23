import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { getDBClient } from "../../lib/db/client"
import { Product } from "../../lib/db/types"
import { useAppStore } from "../../stores/useAppStore"
import { formatPrice } from "../../lib/currency"
import { useCartStore } from "../../stores/useCartStore"
import { ProductCard } from "../../components/product/ProductCard"
import { showToast } from "../../components/ui/Toast"

export function ProductDetailPage() {
  const { slug } = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [qty, setQty] = useState(1)
  const [tab, setTab] = useState<"desc"|"info"|"reviews">("desc")
  const [reviews, setReviews] = useState<{ id: string; name: string; rating: number; comment: string; date: string }[]>([])
  const [reviewName, setReviewName] = useState("")
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState("")
  const { currency, lang } = useAppStore()
  const { addItem } = useCartStore()

  useEffect(()=>{
    if(!slug) return
    getDBClient().getProductBySlug(slug).then(p=>{
      setProduct(p)
      if(p) {
        getDBClient().getProducts().then(all=>{
          setRelated(all.filter(a=>a.series===p.series && a.id!==p.id).slice(0,4))
        })
        // Load reviews from localStorage
        try {
          const raw = localStorage.getItem(`cs12_reviews_${p.id}`)
          if(raw) setReviews(JSON.parse(raw))
        } catch {}
      }
    })
  },[slug])

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

  if(!product) return <div className="py-20 text-center">Loading...</div>

  const name = lang==="zh"?product.name_zh:product.name_en
  const desc = lang==="zh"?product.description_zh:product.description_en

  return (
    <main className="w-[min(calc(100%-48px),1440px)] mx-auto py-8">
      <div className="text-[11px] text-[#8F8881] mb-4"><Link to="/shop">Shop</Link> / {product.series} / {name}</div>
      <div className="grid md:grid-cols-2 gap-10">
        <div className="space-y-4">
          <div className="aspect-square bg-[#FBF6F0] border border-[#F2ECE4] overflow-hidden"><img src={product.images[0]} alt={name} className="w-full h-full object-cover"/></div>
          <div className="grid grid-cols-4 gap-3">
            {product.images.slice(0,4).map((img,i)=><div key={i} className="aspect-square bg-[#FBF6F0] border border-[#F2ECE4]"><img src={img} className="w-full h-full object-cover"/></div>)}
          </div>
        </div>
        <div>
          <p className="text-[10px] tracking-[0.18em] uppercase text-[#8F8881] mb-2">{product.series} • {product.category.join(" / ")}</p>
          <h1 className="font-serif text-[36px] leading-[1] mb-3">{name}</h1>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[12px]">★ {product.rating} ({product.reviewsCount})</span>
            <span className="text-[11px] text-[#8F8881]">{product.stock} {lang==="zh"?"件庫存":"in stock"}</span>
            <span className="text-[11px] bg-[#111] text-white px-2 py-[1px]">{product.points} 積分 Points</span>
          </div>
          <div className="flex items-baseline gap-3 mb-6">
            {product.original_price_hkd && <span className="line-through text-[#BBB5AD]">{formatPrice(product.original_price_hkd, product.original_price_usd||0, currency)}</span>}
            <span className="text-[28px] font-medium">{formatPrice(product.price_hkd, product.price_usd, currency)}</span>
          </div>

          {product.bundleGiftLabel && <div className="mb-4 inline-block bg-[#FEF3C7] border border-[#FDE68A] text-[11px] px-3 py-1">{product.bundleGiftLabel} • {lang==="zh"?"官網限定套裝":"Exclusive Bundle"}</div>}

          <div className="mb-6">
            <label className="text-[10px] tracking-[0.18em] uppercase font-semibold">{lang==="zh"?"數量":"Quantity"}</label>
            <div className="flex items-center gap-2 mt-2">
              <button onClick={()=>setQty(Math.max(1,qty-1))} className="w-9 h-9 border border-[#ECE6DF]">-</button>
              <span className="w-12 text-center">{qty}</span>
              <button onClick={()=>setQty(Math.min(product.stock, qty+1))} className="w-9 h-9 border border-[#ECE6DF]">+</button>
            </div>
          </div>

          <button onClick={()=>{addItem(product, qty); showToast("cart", lang==="zh"?`已加入購物車：${name}`:`Added to cart: ${name}`)}} className="w-full h-[52px] bg-[#111] text-white text-[12px] tracking-[0.18em] uppercase hover:bg-black transition">{lang==="zh"?"加入購物車":"Add to Cart"} • {formatPrice(product.price_hkd*qty, product.price_usd*qty, currency)}</button>

          <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
            <div className="border border-[#ECE6DF] p-3 bg-[#FBF6F0]">🚚 {lang==="zh"?"滿 $800 免運費":"Free shipping over $800"}</div>
            <div className="border border-[#ECE6DF] p-3 bg-[#FBF6F0]">🎁 {lang==="zh"?"購買即可賺取積分":"Earn points"}</div>
          </div>

          <div className="mt-10 border-t border-[#ECE6DF]">
            <div className="flex gap-6 text-[11px] tracking-[0.14em] uppercase mt-4">
              <button onClick={()=>setTab("desc")} className={`pb-2 border-b ${tab==="desc"?"border-black":"border-transparent text-[#8F8881]"}`}>描述</button>
              <button onClick={()=>setTab("info")} className={`pb-2 border-b ${tab==="info"?"border-black":"border-transparent text-[#8F8881]"}`}>額外資訊</button>
              <button onClick={()=>setTab("reviews")} className={`pb-2 border-b ${tab==="reviews"?"border-black":"border-transparent text-[#8F8881]"}`}>評價 ({reviews.length})</button>
            </div>
            <div className="py-6 text-[13px] leading-relaxed text-[#3A3734]">
              {tab==="desc" && (
                <div>
                  <p>{desc}</p>
                  <ul className="mt-4 list-disc pl-5 space-y-1 text-[#5C5651]">
                    <li>促進皮膚深層細胞新陳代謝</li>
                    <li>舒緩敏感和發炎皮膚</li>
                    <li>退紅消腫和鎮靜刺激性皮膚</li>
                    <li>達到深層潔淨和提亮肌膚光澤</li>
                    <li>持久保濕和鎖住水分</li>
                  </ul>
                  <p className="mt-4 text-[11px] text-[#8F8881]">適合膚質：所有膚質，包括普通、敏感、乾性、油性、暗沉肌膚<br/>配方證明：美國FDA認可、抗敏專利配方</p>
                </div>
              )}
              {tab==="info" && <p>重量 | {product.weight_kg} 公斤<br/>貨號: {product.sku}<br/>分類: {product.category.join(", ")}<br/>膚質: {product.skinType.join(", ")}</p>}
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
    </main>
  )
}
