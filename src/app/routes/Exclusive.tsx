import { useEffect, useState } from "react"
import { getDBClient } from "../../lib/db/client"
import { Product, GiftTier } from "../../lib/db/types"
import { ProductCard } from "../../components/product/ProductCard"
import { useAppStore } from "../../stores/useAppStore"

export function ExclusivePage() {
  const [bundles, setBundles] = useState<Product[]>([])
  const [tiers, setTiers] = useState<GiftTier[]>([])
  const [countdown, setCountdown] = useState("")
  const { lang } = useAppStore()

  useEffect(()=>{
    getDBClient().getProducts().then(all=> setBundles(all.filter(p=>p.isBundle)))
    getDBClient().getGiftTiers().then(setTiers)
    // countdown to 2026-07-31
    const end = new Date("2026-07-31T23:59:59").getTime()
    const iv = setInterval(()=>{
      const diff = end - Date.now()
      if(diff<=0){ setCountdown("已結束"); return}
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
      <section className="bg-[#FBF6F0] border-b border-[#ECE6DF]">
        <div className="w-[min(calc(100%-48px),1440px)] mx-auto py-10 grid md:grid-cols-2 gap-8 items-center">
          <img src="https://cs12skincare.com.hk/wp-content/uploads/2026/07/CS12-202607-Banner-1.png" alt="July" className="w-full"/>
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#8F8881] mb-3">Online Exclusive • 7.7 – 7.31</p>
            <h1 className="font-serif text-[44px] leading-[0.95]">開啟冰涼<br/>盛夏護膚之旅</h1>
            <p className="mt-4 text-[#3A3734] leading-relaxed">官網限定修護套裝低至 HK$1,198 起<br/>購滿 HK$2,000，獲贈6件療敏禮品<br/>購滿 $3000，獲贈10件療敏禮品</p>
            <div className="mt-6 inline-flex gap-2 text-[11px]">
              <span className="bg-[#111] text-white px-3 py-1">倒數: {countdown}</span>
              <span className="border border-[#111] px-3 py-1">限時至 2026-07-31</span>
            </div>
          </div>
        </div>
      </section>

      <section className="w-[min(calc(100%-48px),1440px)] mx-auto py-12">
        <h2 className="font-serif text-[28px] mb-2">如何選擇適合你的套裝？</h2>
        <div className="grid md:grid-cols-4 gap-6 text-[13px] leading-relaxed text-[#3A3734]">
          <div className="border border-[#ECE6DF] p-5 bg-white"><h4 className="font-semibold mb-2">敏感肌首選</h4><p>想初次體驗 CS12 修護系列，建議選擇夏日急救修護套裝。</p></div>
          <div className="border border-[#ECE6DF] p-5 bg-white"><h4 className="font-semibold mb-2">皇牌集中修護</h4><p>肌膚容易泛紅、乾燥或不穩定，建議選擇急救修護套裝。</p></div>
          <div className="border border-[#ECE6DF] p-5 bg-white"><h4 className="font-semibold mb-2">完整舒敏程序</h4><p>想同時擁有面膜、安瓶及肌底精華水，建議選擇全效舒敏修護套裝。</p></div>
          <div className="border border-[#ECE6DF] p-5 bg-white"><h4 className="font-semibold mb-2">最高價值之選</h4><p>想一次入手完整 CS12 修護程序及最多贈品，建議選擇極致冰鎮修護套裝。</p></div>
        </div>
      </section>

      <section className="w-[min(calc(100%-48px),1440px)] mx-auto pb-12">
        <h2 className="font-serif text-[30px] mb-8">7月限定修護套裝</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {bundles.map(b=><ProductCard key={b.id} product={b}/>)}
        </div>
      </section>

      <section className="bg-[#111] text-white py-16">
        <div className="w-[min(calc(100%-48px),1440px)] mx-auto">
          <h2 className="font-serif text-[32px] mb-10 text-center">官網限定滿購禮遇</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {tiers.map(t=>(
              <div key={t.id} className="border border-[#333] p-8">
                <h3 className="font-serif text-[24px] mb-2">{lang==="zh"?t.label_zh:t.label_en}</h3>
                <p className="text-[12px] text-[#BBB5AD] mb-4">額外送 {t.gifts.reduce((a,b)=>a+b.qty,0)}件皇牌修護禮遇 • 贈品總值約 HK${t.giftValueHKD}</p>
                <img src={t.id.includes("2000") ? "https://cs12skincare.com.hk/wp-content/uploads/2026/07/202607_2000-free-gift_1.png" : "https://cs12skincare.com.hk/wp-content/uploads/2026/07/202607_3000-free-gift_2.png"} alt="gift" className="w-full bg-white rounded mb-4"/>
                <ul className="text-[12px] leading-relaxed text-[#BBB5AD]">
                  {t.gifts.map((g,i)=><li key={i}>• {lang==="zh"?g.name_zh:g.name_en} x{g.qty}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-center text-[11px] text-[#8F8881] mt-8">滿購禮遇數量有限，送完即止 • 優惠期內每張訂單按最終付款金額計算</p>
        </div>
      </section>
    </main>
  )
}
