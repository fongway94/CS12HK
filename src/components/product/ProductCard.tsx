import { Link } from "react-router-dom"
import { Product } from "../../lib/db/types"
import { useAppStore } from "../../stores/useAppStore"
import { formatPrice } from "../../lib/currency"
import { useCartStore } from "../../stores/useCartStore"
import { useWishlistStore } from "../../stores/useWishlistStore"
import { showToast } from "../ui/Toast"
import { Heart } from "lucide-react"

export function ProductCard({ product }: { product: Product }) {
  const { currency, lang } = useAppStore()
  const { addItem, items } = useCartStore()
  const { toggle: toggleWishlist, has: isWishlisted } = useWishlistStore()
  const name = lang==="zh"?product.name_zh:product.name_en
  const wishlisted = isWishlisted(product.id)
  const priceHKD = product.price_hkd
  const priceUSD = product.price_usd
  const origHKD = product.original_price_hkd
  const origUSD = product.original_price_usd

  const cartItem = items.find(i => i.product.id === product.id)
  const inCartQty = cartItem?.qty ?? 0
  const isOutOfStock = product.stock <= 0
  const isMaxInCart = inCartQty >= product.stock

  const handleAddToCart = () => {
    if (isOutOfStock) {
      showToast("error", lang==="zh"?"此產品已售罄":"This product is out of stock")
      return
    }
    if (isMaxInCart) {
      showToast("error", lang==="zh"?`已達庫存上限 (${product.stock}件)`:`Max stock reached (${product.stock})`)
      return
    }
    addItem(product, 1)
    showToast("cart", lang==="zh"?`已加入購物車：${name}`:`Added to cart: ${name}`)
  }

  return (
    <div className="group bg-white border border-[#F2ECE4] hover:border-[#111] transition-colors">
      <Link to={`/product/${product.slug}`} className="block aspect-square overflow-hidden bg-[#FBF6F0] relative">
        <img src={product.images[0]} alt={name} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" loading="lazy" />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="bg-[#111] text-white text-[10px] tracking-[0.14em] uppercase px-4 py-2">{lang==="zh"?"售罄":"Sold Out"}</span>
          </div>
        )}
        {product.isBundle && product.bundleGiftLabel && (
          <span className="absolute top-3 left-3 bg-[#111] text-white text-[9px] tracking-[0.12em] px-2 py-1">{product.bundleGiftLabel}</span>
        )}
        {/* Wishlist Button */}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(product.id); showToast("info", wishlisted ? (lang==="zh"?"已從願望清單移除":"Removed from wishlist") : (lang==="zh"?"已加入願望清單":"Added to wishlist")) }}
          className="absolute top-3 right-3 w-8 h-8 bg-white/80 backdrop-blur-sm border border-[#ECE6DF]/50 rounded-full flex items-center justify-center hover:bg-white transition-all z-10"
          aria-label="Toggle wishlist"
        >
          <Heart size={14} className={wishlisted ? "fill-red-500 text-red-500" : "text-[#8F8881]"} />
        </button>
      </Link>
      <div className="p-5">
        <p className="text-[9px] tracking-[0.18em] uppercase text-[#8F8881] mb-2">{product.series} • {product.category[0]}</p>
        <Link to={`/product/${product.slug}`} className="font-serif text-[18px] leading-[1.2] line-clamp-2 min-h-[44px] block">{name}</Link>
        {product.bundleGiftLabel && <span className="inline-block mt-2 text-[10px] tracking-[0.12em] bg-[#111] text-white px-2 py-[2px]">{product.bundleGiftLabel}</span>}
        <div className="mt-3 flex items-baseline gap-2">
          {origHKD && <span className="text-[12px] text-[#BBB5AD] line-through">{formatPrice(origHKD, origUSD||0, currency)}</span>}
          <span className="text-[15px] font-medium">{formatPrice(priceHKD, priceUSD, currency)}</span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-[#8F8881]">
          <span>★ {product.rating}</span>
          <span>• {product.points} 積分</span>
          <span className={isOutOfStock ? "text-red-500" : ""}>
            • {isOutOfStock ? (lang==="zh"?"售罄":"Sold Out") : `${product.stock} ${lang==="zh"?"庫存":"stock"}`}
          </span>
        </div>
        {inCartQty > 0 && (
          <p className="mt-2 text-[10px] text-[#8F8881]">
            {lang==="zh"?`購物車已有 ${inCartQty} 件`:`${inCartQty} in cart`}
          </p>
        )}
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className={`mt-4 w-full h-[38px] text-[10px] tracking-[0.18em] uppercase transition-colors ${
            isOutOfStock
              ? "border border-[#ECE6DF] text-[#BBB5AD] cursor-not-allowed bg-[#FBF6F0]"
              : "border border-[#111] hover:bg-[#111] hover:text-white"
          }`}
        >
          {isOutOfStock
            ? (lang==="zh"?"售罄":"Sold Out")
            : (lang==="zh"?"加入購物車":"Add to Cart")
          }
        </button>
      </div>
    </div>
  )
}
