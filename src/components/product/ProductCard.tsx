import { Link } from "react-router-dom"
import { Product } from "../../lib/db/types"
import { useAppStore } from "../../stores/useAppStore"
import { formatPrice } from "../../lib/currency"
import { useCartStore } from "../../stores/useCartStore"

export function ProductCard({ product }: { product: Product }) {
  const { currency, lang } = useAppStore()
  const { addItem } = useCartStore()
  const name = lang==="zh"?product.name_zh:product.name_en
  const priceHKD = product.price_hkd
  const priceUSD = product.price_usd
  const origHKD = product.original_price_hkd
  const origUSD = product.original_price_usd

  return (
    <div className="group bg-white border border-[#F2ECE4] hover:border-[#111] transition-colors">
      <Link to={`/product/${product.slug}`} className="block aspect-square overflow-hidden bg-[#FBF6F0]">
        <img src={product.images[0]} alt={name} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" loading="lazy" />
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
          <span>• {product.stock} {lang==="zh"?"庫存":"stock"}</span>
        </div>
        <button onClick={()=>addItem(product,1)} className="mt-4 w-full border border-[#111] h-[38px] text-[10px] tracking-[0.18em] uppercase hover:bg-[#111] hover:text-white transition-colors">{lang==="zh"?"加入購物車":"Add to Cart"}</button>
      </div>
    </div>
  )
}
