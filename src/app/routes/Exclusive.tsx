import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getDBClient } from "../../lib/db/client"
import { Product, GiftTier } from "../../lib/db/types"
import { ProductCard } from "../../components/product/ProductCard"
import { useAppStore } from "../../stores/useAppStore"

export function ExclusivePage() {
  const [bundles, setBundles] = useState<Product[]>([])
  const [tiers, setTiers] = useState<GiftTier[]>([])
  const [countdown, setCountdown] = useState("")
  const [expired, setExpired] = useState(false)
  const { lang } = useAppStore()

  useEffect(()=>{
    getDBClient().getProducts().then(all=> setBundles(all.filter(p=>p.isBundle)))
    getDBClient().getGiftTiers().then(setTiers)
    const end = new Date("2026-07-31T23:59:59").getTime()
    const iv = setInterval(()=>{
      const diff = end - Date.now()
      if(diff<=0){ setExpired(true); return }
      const d = Math.floor(diff/86400000)
      const h = Math.floor((diff%86400000)/3600000)
      const m = Math.floor((diff%3600000)/60000)
      const s = Math.floor((diff%60000)/1000)
      setCountdown(`${d}d ${h}h ${m}m ${s}s`)
    },1000)
    return ()=>clearInterval(iv)
  },[])

  return (
    <main>
      {/* Hero Section */}
      <section className="bg-[#FBF6F0] border-b border-[#ECE6DF]">
        <div className="w-[min(calc(100%-24px),1440px)] mx-auto py-8 md:py-10 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-center">
          <img src="https://cs12skincare.com.hk/wp-content/uploads/2026/07/CS12-202607-Banner-1.png" alt="July Campaign" className="w-full rounded-[4px]"/>
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#8F8881] mb-3">{lang==="zh" ? "官網限定 • 7.7 – 7.31" : "Online Exclusive • 7.7 – 7.31"}</p>
            <h1 className="font-serif text-[36px] md:text-[44px] leading-[0.95]">
              {lang==="zh" ? <>開啟冰涼<br/>盛夏護膚之旅</> : <>Begin Your Icy<br/>Summer Skincare Journey</>}
            </h1>
            <p className="mt-4 text-[#3A3734] text-[13px] leading-relaxed">
              {lang==="zh"
                ? <>官網限定修護套裝低至 HK$1,198 起<br/>購滿 HK$2,000，獲贈6件療敏禮品<br/>購滿 $3000，獲贈10件療敏禮品</>
                : <>Exclusive recovery sets from HK$1,198<br/>Spend HK$2,000 — receive 6-piece deluxe gift set<br/>Spend HK$3,000 — receive 10-piece deluxe gift set</>}
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-[11px]">
              <span className="bg-[#111] text-white px-3 py-1.5 rounded-[2px]">
                {expired ? (lang==="zh" ? "已結束" : "Ended") : `${lang==="zh" ? "倒數" : "Countdown"}: ${countdown}`}
              </span>
              <span className="border border-[#111] px-3 py-1.5 rounded-[2px]">
                {lang==="zh" ? "限時至 2026-07-31" : "Limited until Jul 31, 2026"}
              </span>
            </div>
            <div className="mt-6">
              <Link to="/shop" className="inline-flex bg-[#111] text-white px-8 h-[42px] items-center text-[10px] tracking-[0.18em] uppercase font-bold hover:bg-black transition rounded-[2px]">
                {lang==="zh" ? "立即選購" : "Shop Now"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Guide Section */}
      <section className="w-[min(calc(100%-24px),1440px)] mx-auto py-8 md:py-12">
        <h2 className="font-serif text-[24px] md:text-[28px] mb-4 md:mb-6">
          {lang==="zh" ? "如何選擇適合你的套裝？" : "How to Choose the Right Set for You?"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-[13px] leading-relaxed text-[#3A3734]">
          <div className="border border-[#ECE6DF] p-5 bg-white rounded-[3px]">
            <h4 className="font-semibold mb-2 text-[14px]">{lang==="zh" ? "敏感肌首選" : "For Sensitive Skin"}</h4>
            <p>{lang==="zh" ? "想初次體驗 CS12 修護系列，建議選擇夏日急救修護套裝。" : "New to CS12? Start with the Starter Recovery Set — ideal for first-time sensitive skin users."}</p>
          </div>
          <div className="border border-[#ECE6DF] p-5 bg-white rounded-[3px]">
            <h4 className="font-semibold mb-2 text-[14px]">{lang==="zh" ? "皇牌集中修護" : "Hero Treatment Duo"}</h4>
            <p>{lang==="zh" ? "肌膚容易泛紅、乾燥或不穩定，建議選擇急救修護套裝。" : "Prone to redness, dryness, or instability? Try the Treatment Duo Set for targeted calming."}</p>
          </div>
          <div className="border border-[#ECE6DF] p-5 bg-white rounded-[3px]">
            <h4 className="font-semibold mb-2 text-[14px]">{lang==="zh" ? "完整舒敏程序" : "Complete Routine"}</h4>
            <p>{lang==="zh" ? "想同時擁有面膜、安瓶及肌底精華水，建議選擇全效舒敏修護套裝。" : "Want the full trio — mask, ampoule, and essence water? The Complete Recovery Set covers it all."}</p>
          </div>
          <div className="border border-[#ECE6DF] p-5 bg-white rounded-[3px]">
            <h4 className="font-semibold mb-2 text-[14px]">{lang==="zh" ? "最高價值之選" : "Best Value Pick"}</h4>
            <p>{lang==="zh" ? "想一次入手完整 CS12 修護程序及最多贈品，建議選擇極致冰鎮修護套裝。" : "Want the full CS12 ritual with the most gifts? The Ultimate Barrier Repair Set is your best value."}</p>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="w-[min(calc(100%-24px),1440px)] mx-auto pb-8 md:pb-12">
        <h2 className="font-serif text-[26px] md:text-[30px] mb-6 md:mb-8">
          {lang==="zh" ? "7月限定修護套裝" : "July Exclusive Recovery Sets"}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {bundles.map(b=><ProductCard key={b.id} product={b}/>)}
        </div>
      </section>

      {/* GWP Section */}
      <section className="bg-[#111] text-white py-12 md:py-16">
        <div className="w-[min(calc(100%-24px),1440px)] mx-auto">
          <h2 className="font-serif text-[28px] md:text-[32px] mb-8 md:mb-10 text-center">
            {lang==="zh" ? "官網限定滿購禮遇" : "Online Exclusive — Gift With Purchase"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {tiers.map(t=>(
              <div key={t.id} className="border border-[#333] p-6 md:p-8 rounded-[4px]">
                <h3 className="font-serif text-[22px] md:text-[24px] mb-2">{lang==="zh"?t.label_zh:t.label_en}</h3>
                <p className="text-[12px] text-[#BBB5AD] mb-4">
                  {lang==="zh"
                    ? `額外送 ${t.gifts.reduce((a,b)=>a+b.qty,0)}件皇牌修護禮遇 • 贈品總值約 HK$${t.giftValueHKD}`
                    : `${t.gifts.reduce((a,b)=>a+b.qty,0)} complimentary deluxe items • Total gift value approx. HK$${t.giftValueHKD}`
                  }
                </p>
                <img src={t.id.includes("2000") ? "https://cs12skincare.com.hk/wp-content/uploads/2026/07/202607_2000-free-gift_1.png" : "https://cs12skincare.com.hk/wp-content/uploads/2026/07/202607_3000-free-gift_2.png"} alt="gift tier" className="w-full bg-white rounded mb-4"/>
                <ul className="text-[12px] leading-relaxed text-[#BBB5AD]">
                  {t.gifts.map((g,i)=><li key={i}>• {lang==="zh"?g.name_zh:g.name_en} x{g.qty}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-center text-[11px] text-[#8F8881] mt-8">
            {lang==="zh"
              ? "滿購禮遇數量有限，送完即止 • 優惠期內每張訂單按最終付款金額計算"
              : "Gifts are limited and available while stocks last • Calculated based on final order total during promotion period"
            }
          </p>
        </div>
      </section>
    </main>
  )
}
