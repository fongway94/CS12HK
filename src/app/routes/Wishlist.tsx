import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getDBClient } from "../../lib/db/client"
import { Product } from "../../lib/db/types"
import { useWishlistStore } from "../../stores/useWishlistStore"
import { useAppStore } from "../../stores/useAppStore"
import { ProductCard } from "../../components/product/ProductCard"
import { Heart, X } from "lucide-react"

export function WishlistPage() {
  const { items: wishlistIds, toggle } = useWishlistStore()
  const { lang } = useAppStore()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDBClient().getProducts().then(all => {
      setProducts(all.filter(p => wishlistIds.includes(p.id)))
      setLoading(false)
    })
  }, [wishlistIds])

  return (
    <main className="w-[min(calc(100%-24px),1440px)] mx-auto py-8 md:py-10">
      <div className="flex items-center gap-3 mb-8">
        <Heart size={22} className="text-[#825F59]" />
        <h1 className="font-serif text-[32px] md:text-[40px]">{lang === "zh" ? "願望清單" : "Wishlist"}</h1>
        <span className="text-[12px] text-[#8F8881]">({products.length})</span>
      </div>

      {loading ? (
        <p className="text-center py-20 text-[#8F8881]">Loading...</p>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <Heart size={48} className="mx-auto text-[#ECE6DF] mb-4" />
          <h2 className="font-serif text-[24px] mb-2">{lang === "zh" ? "願望清單是空的" : "Your wishlist is empty"}</h2>
          <p className="text-[13px] text-[#8F8881] mb-6">{lang === "zh" ? "瀏覽產品並點擊 ♡ 加入收藏" : "Browse products and tap ♡ to save favorites"}</p>
          <Link to="/shop" className="inline-flex bg-[#9E7428] text-white px-8 h-[44px] items-center text-[11px] tracking-[0.18em] uppercase">
            {lang === "zh" ? "去選購" : "Go Shopping"}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </main>
  )
}
