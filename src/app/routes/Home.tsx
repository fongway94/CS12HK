import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getDBClient } from "../../lib/db/client"
import { Product } from "../../lib/db/types"
import { ProductCard } from "../../components/product/ProductCard"
import { useAppStore } from "../../stores/useAppStore"
import { Gift, Truck, BadgePercent } from "lucide-react"

export function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const { lang } = useAppStore()

  useEffect(()=>{
    getDBClient().getProducts().then(p=>setProducts(p))
  },[])

  const bestsellers = products.filter(p=>p.tags.includes("暢銷產品")).slice(0,4)
  const bundles = products.filter(p=>p.isBundle).slice(0,4)
  const calmex = products.filter(p=>p.series==="CalmEX" && !p.isBundle).slice(0,3)

  return (
    <main>
      {/* Campaign Banner */}
      <section className="bg-gradient-to-br from-[#FDFBF8] via-[#FAF3E9] to-[#EAD8BE] border-b border-[#ECE6DF]">
        <div className="w-[min(calc(100%-48px),1440px)] mx-auto py-8 md:py-12 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-[10px] tracking-[0.20em] uppercase text-[#8F8881] mb-4">2026 夏季修護焦點</p>
            <img src="https://cs12skincare.com.hk/wp-content/uploads/2026/07/CS12-202607-Banner-1.png" alt="Summer" className="w-full rounded-[4px]" />
          </div>
          <div className="md:pl-12">
            <h1 className="font-serif text-[clamp(36px,5vw,64px)] leading-[0.95] tracking-[-0.03em]">開啟冰涼<br/>盛夏護膚之旅</h1>
            <p className="mt-4 text-[14px] text-[#3A3734] leading-relaxed">官網限定修護套裝低至 HK$1,198 起 · 滿額贈療敏禮品<br/>7.7 – 7.31 限時</p>
            <div className="mt-6 flex gap-3">
              <Link to="/exclusive" className="bg-[#111] text-white px-8 h-[46px] inline-flex items-center text-[10px] tracking-[0.18em] uppercase">立即選購</Link>
              <Link to="/shop" className="border border-[#111] px-8 h-[46px] inline-flex items-center text-[10px] tracking-[0.18em] uppercase">探索系列</Link>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4 border-t border-[#ECE6DF] pt-6">
              <div className="flex gap-2 items-start"><Truck size={16}/><span className="text-[11px] leading-tight">滿 $800<br/>免運費</span></div>
              <div className="flex gap-2 items-start"><BadgePercent size={16}/><span className="text-[11px] leading-tight">首購滿 $1500<br/>15% OFF</span></div>
              <div className="flex gap-2 items-start"><Gift size={16}/><span className="text-[11px] leading-tight">滿 $2000/3000<br/>贈禮遇</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Seasonal Hero Full Bleed */}
      <section className="relative h-[70vh] md:h-[85vh] overflow-hidden">
        <img src="https://cs12skincare.com.hk/wp-content/uploads/2025/03/March-2025-Banner-1400x788.jpg" alt="Seasonal" className="absolute inset-0 w-full h-full object-cover"/>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/5"></div>
        <div className="relative z-10 h-full flex items-end p-8 md:p-16">
          <div className="text-white max-w-[560px]">
            <p className="text-[10px] tracking-[0.2em] uppercase opacity-80 mb-3">Seasonal Focus 2026</p>
            <h2 className="font-serif text-[48px] md:text-[72px] leading-[0.9] tracking-[-0.04em]">敏感肌<br/>轉季必備</h2>
            <p className="mt-4 text-[14px] leading-relaxed opacity-90">針對泛紅、突發敏感，為你編排一套極簡、臨床級的修護儀式。</p>
            <Link to="/shop" className="mt-6 inline-flex border border-white text-white px-8 h-[44px] items-center text-[10px] tracking-[0.18em] uppercase hover:bg-white hover:text-black transition">Shop Now</Link>
          </div>
        </div>
      </section>

      {/* Miracle Mask Story */}
      <section className="grid md:grid-cols-2">
        <div className="aspect-[4/5] md:aspect-auto overflow-hidden"><img src="https://cs12skincare.com.hk/wp-content/uploads/2026/03/cs-12-253-E-720x1080.jpg" className="w-full h-full object-cover"/></div>
        <div className="flex items-center bg-white p-8 md:p-20">
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#8F8881] mb-6">Hero 01 — CalmEX</p>
            <h3 className="font-serif text-[44px] leading-[0.95] mb-6">奇蹟面膜<br/>Miracle Mask</h3>
            <p className="text-[#3A3734] leading-relaxed max-w-[46ch]">品牌創始之作。冰感膠囊科技瞬間降溫 5°C，5分鐘快速鎮靜泛紅、刺痛、曬後不適。醫美級舒敏肽複合物由根源修護屏障。</p>
            <ul className="mt-6 space-y-2 text-[12px] text-[#5C5651] list-disc pl-4">
              <li>瞬間冰感降溫 5°C</li><li>醫美級舒敏肽複合物</li><li>轉季 · 曬後 · 術後 · 突發敏感適用</li>
            </ul>
            <Link to="/product/cs12-miracle-mask-zh" className="mt-8 inline-flex text-[10px] tracking-[0.18em] uppercase border-b border-black pb-1">查看真實用家效果 ↗</Link>
          </div>
        </div>
      </section>

      {/* SoCalm reversed */}
      <section className="grid md:grid-cols-2 bg-[#FBF6F0]">
        <div className="flex items-center p-8 md:p-20 order-2 md:order-1">
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#8F8881] mb-6">Hero 02 — #SoCalm</p>
            <h3 className="font-serif text-[44px] leading-[0.95] mb-6">強韌屏障<br/>3 步曲</h3>
            <p className="text-[#3A3734] leading-relaxed max-w-[46ch]">不只是單品，而是一套早晚三步驟的屏障建立方案。從潔面喚醒、精華修護、乳霜鎖水，系統性重建角質層脂質結構。</p>
            <div className="mt-8 grid grid-cols-3 gap-4 text-center border-t border-[#ECE6DF] pt-6">
              <div><em className="font-serif text-[24px] block">01</em><label className="text-[11px] tracking-[0.12em] uppercase">喚醒潔面</label></div>
              <div><em className="font-serif text-[24px] block">02</em><label className="text-[11px] tracking-[0.12em] uppercase">精華修護</label></div>
              <div><em className="font-serif text-[24px] block">03</em><label className="text-[11px] tracking-[0.12em] uppercase">乳霜鎖水</label></div>
            </div>
          </div>
        </div>
        <div className="aspect-[4/5] md:aspect-auto overflow-hidden order-1 md:order-2"><img src="https://cs12skincare.com.hk/wp-content/uploads/2026/03/1O1A7491-E-scaled.jpg" className="w-full h-full object-cover"/></div>
      </section>

      {/* Bundles */}
      <section className="w-[min(calc(100%-48px),1440px)] mx-auto py-20">
        <div className="flex justify-between items-end mb-10">
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#8F8881] mb-3">July Exclusive</p>
            <h2 className="font-serif text-[36px] md:text-[52px] leading-[0.95]">官網限定修護套裝</h2>
          </div>
          <Link to="/exclusive" className="hidden md:inline-flex text-[10px] tracking-[0.18em] uppercase border-b border-black pb-1">查看全部</Link>
        </div>
        <div className="grid md:grid-cols-4 gap-6">
          {bundles.map(p=><ProductCard key={p.id} product={p}/>)}
        </div>
      </section>

      {/* Collections wall */}
      <section className="bg-white border-y border-[#ECE6DF] py-20">
        <div className="w-[min(calc(100%-48px),1440px)] mx-auto">
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#8F8881] mb-8 text-center">Selected Collections</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Link to="/shop?series=CalmEX" className="group">
              <div className="aspect-square bg-[#FDFBF8] border border-[#F2ECE4] overflow-hidden"><img src="https://cs12skincare.com.hk/wp-content/uploads/2026/03/CalmEX1200-1-1200x1200.png" className="group-hover:scale-105 transition duration-700"/></div>
              <h4 className="font-serif text-[22px] mt-3">#CalmEX</h4><p className="text-[11px] text-[#8F8881]">奇蹟修護 · 冰感鎮靜</p>
            </Link>
            <Link to="/shop?series=SoCalm" className="group">
              <div className="aspect-square bg-[#FDFBF8] border border-[#F2ECE4] overflow-hidden"><img src="https://cs12skincare.com.hk/wp-content/uploads/2026/03/SoClam1200-1200x1200.png" className="group-hover:scale-105 transition duration-700"/></div>
              <h4 className="font-serif text-[22px] mt-3">#SoCalm</h4><p className="text-[11px] text-[#8F8881]">3步強韌屏障</p>
            </Link>
            <Link to="/shop?series=CellRevEX" className="group">
              <div className="aspect-square bg-[#FDFBF8] border border-[#F2ECE4] overflow-hidden"><img src="https://cs12skincare.com.hk/wp-content/uploads/2025/01/CNY-banner-1-1-scaled.jpg" className="w-full h-full object-cover group-hover:scale-105 transition duration-700"/></div>
              <h4 className="font-serif text-[22px] mt-3">#CellRevEX</h4><p className="text-[11px] text-[#8F8881]">逆齡緊緻 · 細胞更新</p>
            </Link>
            <Link to="/shop?cat=防曬" className="group">
              <div className="aspect-square bg-[#FDFBF8] border border-[#F2ECE4] overflow-hidden"><img src="https://cs12skincare.com.hk/wp-content/uploads/2024/03/CS12-SUN-CUSHION-IVORY-PINK-7-SAND-BEIGE-9-scaled.jpg" className="w-full h-full object-cover group-hover:scale-105 transition duration-700"/></div>
              <h4 className="font-serif text-[22px] mt-3">防曬</h4><p className="text-[11px] text-[#8F8881]">抗敏防護 · 零刺激</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Bestsellers */}
      <section className="w-[min(calc(100%-48px),1440px)] mx-auto py-20">
        <h2 className="font-serif text-[36px] mb-10">{lang==="zh"?"暢銷產品":"Bestsellers"}</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {bestsellers.map(p=><ProductCard key={p.id} product={p}/>)}
        </div>
      </section>

      {/* Social proof */}
      <section className="bg-[#211C19] text-[#FDFBF8] py-20">
        <div className="w-[min(calc(100%-48px),1440px)] mx-auto grid md:grid-cols-3 gap-12">
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#BBB5AD] mb-4">Real Results</p>
            <h3 className="font-serif text-[40px] leading-[0.95]">真實用家<br/>如實分享</h3>
          </div>
          <div className="md:col-span-2 grid md:grid-cols-3 gap-8 text-[13px] leading-relaxed">
            <div className="border border-[#3A3734] p-6"><p className="font-serif text-[18px] mb-2">Vince</p><p className="text-[#BBB5AD]">曬傷、起敏感時必備 鍾意每次敷上臉的冰涼感 真的feel到瞬間降溫 鎮靜退紅的效果真的很好！</p><span className="mt-3 block text-[10px] uppercase tracking-[0.14em] opacity-60">Miracle Mask</span></div>
            <div className="border border-[#3A3734] p-6"><p className="font-serif text-[18px] mb-2">Sabrina</p><p className="text-[#BBB5AD]">消除紅腫、鎮靜敏感、止痕。術後第3天泛紅退了7成。</p><span className="mt-3 block text-[10px] uppercase tracking-[0.14em] opacity-60">Miracle Mask</span></div>
            <div className="border border-[#3A3734] p-6"><p className="font-serif text-[18px] mb-2">Yan</p><p className="text-[#BBB5AD]">每個月經期時肌膚都會突發乾燥、痕癢 奇蹟面膜可以成功止痕，同埋好補水！</p><span className="mt-3 block text-[10px] uppercase tracking-[0.14em] opacity-60">Miracle Mask</span></div>
          </div>
        </div>
      </section>

      {/* Offers */}
      <section className="w-[min(calc(100%-48px),1440px)] mx-auto py-16 grid md:grid-cols-3 gap-6">
        <div className="bg-white border border-[#ECE6DF] p-8 text-center">
          <img src="https://cs12skincare.com.hk/wp-content/uploads/2026/03/1.png" className="w-16 h-16 mx-auto mb-4"/>
          <h4 className="font-serif text-[20px]">享15% OFF</h4><p className="text-[12px] text-[#5C5651] mt-2">首次購物滿$1500即享！<br/>優惠碼：NEWCS12</p>
        </div>
        <div className="bg-white border border-[#ECE6DF] p-8 text-center">
          <img src="https://cs12skincare.com.hk/wp-content/uploads/2026/03/2.png" className="w-16 h-16 mx-auto mb-4"/>
          <h4 className="font-serif text-[20px]">免運費</h4><p className="text-[12px] text-[#5C5651] mt-2">購買任何產品滿$800<br/>免費送貨到指定地址</p>
        </div>
        <div className="bg-[#111] text-white border border-[#111] p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center font-serif text-[20px]">M</div>
          <h4 className="font-serif text-[20px]">會員積分</h4><p className="text-[12px] text-[#BBB5AD] mt-2">每 HK$1 = 1 積分<br/>100 積分 = HK$1 抵扣</p>
        </div>
      </section>
    </main>
  )
}
