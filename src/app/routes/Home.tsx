import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getDBClient } from "../../lib/db/client"
import { Product } from "../../lib/db/types"
import { ProductCard } from "../../components/product/ProductCard"
import { useAppStore } from "../../stores/useAppStore"
import { Gift, Truck, BadgePercent, ChevronRight, X, Heart, Star, Check, Sparkles, BookOpen } from "lucide-react"
import { showToast } from "../../components/ui/Toast"
import { subscribeToNewsletter } from "../../lib/newsletter/subscribe"

interface Testimonial {
  name: string
  product_zh: string
  product_en: string
  review_zh: string
  review_en: string
  image: string
}

interface SkinTip {
  title_zh: string
  title_en: string
  desc_zh: string
  desc_en: string
}

export function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const { lang, currency } = useAppStore()

  // State for Special Promotion Pop-up
  const [showPromoPopup, setShowPromoPopup] = useState(false)
  
  // State for Customer Testimonial Lightbox Zoom
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [lightboxName, setLightboxName] = useState<string | null>(null)

  // State for Sensitive Skin Tips Accordion
  const [activeTipIndex, setActiveTipIndex] = useState<number | null>(0)

  // State for Newsletter Subscription
  const [newsletterEmail, setNewsletterEmail] = useState("")
  const [newsletterSuccess, setNewsletterSuccess] = useState(false)

  useEffect(() => {
    getDBClient().getProducts().then(p => setProducts(p))

    // Handle Promo Popup logic: only show once every 24 hours per user preference
    const lastDismissed = localStorage.getItem("cs12_promo_popup_dismissed")
    const now = Date.now()
    const oneDayMs = 24 * 60 * 60 * 1000

    if (!lastDismissed || now - parseInt(lastDismissed) > oneDayMs) {
      // Trigger popup with a small delay for ultra-smooth rendering
      const timer = setTimeout(() => {
        setShowPromoPopup(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleDismissPopup = (dontShowAgain: boolean) => {
    if (dontShowAgain) {
      localStorage.setItem("cs12_promo_popup_dismissed", Date.now().toString())
    }
    setShowPromoPopup(false)
  }

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newsletterEmail.trim()) return

    try {
      const result = await subscribeToNewsletter(newsletterEmail, "homepage")
      setNewsletterSuccess(true)
      showToast(
        "success",
        result === "already-subscribed"
          ? (lang === "zh" ? "此電郵已訂閱電子報" : "This email is already subscribed.")
          : (lang === "zh" ? "感謝訂閱！我們會為您發送最新優惠" : "Thank you for subscribing! We will send you exclusive offers.")
      )
      setNewsletterEmail("")
    } catch {
      showToast("error", lang === "zh" ? "暫時未能完成訂閱，請稍後再試" : "Could not subscribe. Please try again.")
    }
  }

  // Filter products cleanly
  const bestsellers = products.filter(p => p.tags.includes("暢銷產品")).slice(0, 4)
  const bundles = products.filter(p => p.isBundle).slice(0, 4)

  // Testimonials database
  const testimonials: Testimonial[] = [
    {
      name: "Vince",
      product_zh: "奇蹟面膜 Miracle Mask",
      product_en: "Miracle Mask",
      review_zh: "曬傷、起敏感時必備！鍾意每次敷上臉的冰涼感，真的feel到瞬間降溫，鎮靜退紅的效果真的很好！",
      review_en: "A must-have for sunburn and sensitive skin flare-ups. I love the icy-cooling sensation when applying it; you can literally feel the skin cool down instantly. The redness-relieving and calming effect is outstanding!",
      image: "https://cs12skincare.com.hk/wp-content/uploads/2026/03/CS12_Miracle-Mask_%E5%AE%A2%E4%BA%BAA%E5%B0%8F%E5%A7%90.jpg"
    },
    {
      name: "Sabrina",
      product_zh: "奇蹟面膜 Miracle Mask",
      product_en: "Miracle Mask",
      review_zh: "消除紅腫、鎮靜敏感、止痕！術後第3天泛紅退了七成，連脆弱的角質層都覺得強韌了好多。",
      review_en: "Eliminates swelling, calms irritation, and stops itching. By the 3rd day post-laser treatment, my redness subsided by 70%, and my fragile skin barrier felt noticeably stronger.",
      image: "https://cs12skincare.com.hk/wp-content/uploads/2026/03/CS12-Before-After_2021-Salon-Customer-Sabrina.png"
    },
    {
      name: "Yan",
      product_zh: "奇蹟面膜 Miracle Mask",
      product_en: "Miracle Mask",
      review_zh: "每個月經期時肌膚都會突發乾燥、痕癢。奇蹟面膜可以成功止痕，同埋好補水！連之前抓傷的凹凸洞也修復到，現在的肌膚變得更有光澤！",
      review_en: "Every month during my period, my skin experiences sudden dryness and itchiness. The Miracle Mask successfully stops the itching and is incredibly hydrating! It even repaired dry acne scars, leaving my skin glowing.",
      image: "https://cs12skincare.com.hk/wp-content/uploads/2026/03/CS12_Miracle-Mask_Pansy.jpg"
    },
    {
      name: "Ting Ting",
      product_zh: "奇蹟面膜 Miracle Mask",
      product_en: "Miracle Mask",
      review_zh: "沙漠肌終於得到滋潤，更有光澤！毛孔也細咗，個面膜cutting好好，連眼周的細紋都修復到。以上係我用完1片奇蹟面膜後的效果喔。",
      review_en: "My desert-dry skin is finally deeply moisturized and glowing. My pores are noticeably finer! The sheet mask cutting is excellent, even smoothing out the fine lines around my eyes. This is my result after just one sheet!",
      image: "https://cs12skincare.com.hk/wp-content/uploads/2026/03/CS12_Ting-Ting-1.jpg"
    }
  ]

  // Sensitive Skin Tips database
  const skinTips: SkinTip[] = [
    {
      title_zh: "01 / 選擇微酸溫和潔面",
      title_en: "01 / Opt for Low-pH, Gentle Cleansers",
      desc_zh: "避免使用含有強鹼性皂基的潔面產品。選擇接近皮膚天然弱酸性 (pH 5.5) 的氨基酸潔面乳，能保護脆弱的皮脂膜，減少洗臉後的緊繃感。",
      desc_en: "Avoid harsh alkaline soap-based cleansers. Choose amino acid cleansers close to the skin's natural low pH (pH 5.5) to protect the delicate sebum barrier and prevent dryness after washing."
    },
    {
      title_zh: "02 / 避免過度去角質",
      title_en: "02 / Avoid Over-Exfoliating",
      desc_zh: "敏感肌的角質層通常偏薄。去角質次數應控制在每月最多 1-2 次，並避免使用粗糙磨砂膏，改用性質溫和的醫美級微精華或純露。",
      desc_en: "Sensitive skin usually has a thin stratum corneum. Limit exfoliation to 1-2 times a month, avoiding rough physical scrubs; use gentle medical-grade micro essence or soothing hydrosols instead."
    },
    {
      title_zh: "03 / 日常注重物理性防曬",
      title_en: "03 / Prioritize Physical Sunscreens",
      desc_zh: "紫外線是突發敏感的重要誘因。建議選擇透氣性高、低刺激的物理性防曬（如二氧化鈦、氧化鋅），避免化學防曬劑可能引起的皮膚不適。",
      desc_en: "UV rays are major triggers for sensitivity. Opt for lightweight, non-irritating physical sunscreens (containing Titanium Dioxide or Zinc Oxide) rather than chemical filters that might irritate skin."
    },
    {
      title_zh: "04 / 慎用高活性抗衰老成分",
      title_en: "04 / Be Cautious with High-Activity Active Ingredients",
      desc_zh: "當肌膚處於不穩定狀態時，應暫停使用高濃度視黃醇 (A醇)、高濃度維他命C或強酸。優先使用含有積雪草、神經醯胺和舒緩多肽等以屏障修復為主的手部或面部精華產品。",
      desc_en: "When skin is unstable, temporarily halt high-concentration Retinol, Vitamin C, or strong exfoliating acids. Prioritize barrier-repair formulas containing Centella, Ceramides, or Calming Peptides."
    },
    {
      title_zh: "05 / 冰感膠囊科技即時鎮靜",
      title_en: "05 / Utilize Ice-Cooling Technology for Instant Calming",
      desc_zh: "當肌膚突發泛紅、發熱或刺痛時，不宜強行塗抹厚重乳霜。使用具備冰感降溫功效的蠶絲面膜，可在不堵塞毛孔的情況下快速冷卻收縮微血管，退紅舒敏。",
      desc_en: "In case of sudden redness, heat, or stinging, avoid heavy lipid-clogging creams. Applying an icy-cooling silk mask can immediately cool the skin by 5°C, calming microvessels and relieving irritation."
    }
  ]

  return (
    <main className="bg-paper min-h-screen text-ink overflow-x-clip">
      
      {/* 1. Campaign Announcement & GWP Benefit Tiers Section */}
      <section className="bg-gradient-to-br from-[#FDFBF8] via-[#FAF4ED] to-[#EAD8BE]/30 border-b border-[#ECE6DF] relative py-12 md:py-20">
        <div className="w-[min(calc(100%-24px),1440px)] mx-auto grid md:grid-cols-2 gap-12 items-center">
          
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-[#825F59]/10 text-[#825F59] text-[10px] tracking-[0.20em] uppercase px-3 py-1 font-semibold rounded-full">
              <Sparkles size={11} />
              {lang === "zh" ? "2026 夏季修護焦點" : "Summer Restorative Focus"}
            </div>
            
            <h1 className="font-serif text-[42px] sm:text-[54px] md:text-[62px] leading-[1.05] tracking-tight text-[#9E7428]">
              {lang === "zh" ? <>開啟冰涼<br/>盛夏護膚之旅</> : <>Begin Your Summer<br/>Icy Cooling Ritual</>}
            </h1>
            
            <p className="text-[14px] sm:text-[15px] text-[#5C5651] leading-relaxed max-w-[500px]">
              {lang === "zh" 
                ? "官網限定修護套裝低至 HK$1,198 起 · 滿額即送奢華療敏禮包。讓肌膚在烈日下重回澄淨、冰涼、無刺激狀態。" 
                : "Exclusive summer sets from HK$1,198. Elevate your barrier defense with deluxe Gifts-With-Purchase (GWP). Restore clarity under the sun."
              }
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link 
                to="/exclusive" 
                className="bg-[#9E7428] text-white px-8 py-3.5 text-[10.5px] tracking-[0.2em] uppercase font-bold hover:bg-[#8F6824] transition-all duration-300 shadow-md rounded-[3px]"
              >
                {lang === "zh" ? "立即選購限定套裝" : "Shop Exclusive Sets"}
              </Link>
              <Link 
                to="/shop" 
                className="border border-[#9E7428] bg-transparent text-[#9E7428] px-8 py-3.5 text-[10.5px] tracking-[0.2em] uppercase font-bold hover:bg-[#9E7428] hover:text-white transition-all duration-300 rounded-[3px]"
              >
                {lang === "zh" ? "探索全線系列" : "Explore Collections"}
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-[#ECE6DF] pt-8 mt-4">
              <div className="flex gap-2.5 items-start">
                <div className="p-1.5 bg-[#825F59]/5 text-[#825F59] rounded-md"><Truck size={16}/></div>
                <span className="text-[11px] leading-tight font-medium text-[#3A3734]">
                  {lang === "zh" ? <>滿 HK$800<br/>免運費送貨</> : <>Free Shipping<br/>Over HK$800</>}
                </span>
              </div>
              <div className="flex gap-2.5 items-start">
                <div className="p-1.5 bg-[#825F59]/5 text-[#825F59] rounded-md"><BadgePercent size={16}/></div>
                <span className="text-[11px] leading-tight font-medium text-[#3A3734]">
                  {lang === "zh" ? <>首購滿 $1500<br/>享 15% OFF</> : <>15% Off First<br/>Order ($1500+)</>}
                </span>
              </div>
              <div className="flex gap-2.5 items-start">
                <div className="p-1.5 bg-[#825F59]/5 text-[#825F59] rounded-md"><Gift size={16}/></div>
                <span className="text-[11px] leading-tight font-medium text-[#3A3734]">
                  {lang === "zh" ? <>買滿額贈<br/>高達10件禮</> : <>Deluxe Gifts<br/>With Purchase</>}
                </span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-[#EAD8BE]/20 rounded-full blur-2xl z-0"></div>
            <div className="relative z-10 border border-[#ECE6DF] bg-white p-3 rounded-[4px] shadow-lg transition-transform duration-500 hover:scale-[1.01]">
              <img 
                src="https://cs12skincare.com.hk/wp-content/uploads/2026/07/CS12-202607-Banner-1.png" 
                alt="Summer Campaign" 
                className="w-full rounded-[2px]" 
              />
              <div className="p-4 bg-[#FBF6F0] mt-3 rounded-[3px] border border-[#F2ECE4]">
                <p className="text-[11px] tracking-widest text-[#8F8881] uppercase font-bold mb-1">
                  {lang === "zh" ? "限時禮遇 7.7 – 7.31" : "Limited Time GWP Tiers 7.7 – 7.31"}
                </p>
                <div className="space-y-3 mt-2 text-[12px] text-[#3A3734]">
                  <div className="flex items-start gap-2 border-b border-[#ECE6DF] pb-2">
                    <span className="text-[#825F59] font-bold">●</span>
                    <div>
                      <p className="font-semibold text-[#9E7428]">{lang === "zh" ? "滿 HK$2,000 即贈 6 件療敏禮品" : "Spend HK$2,000, get 6-pc Deluxe Set"}</p>
                      <p className="text-[11px] text-[#8F8881] mt-0.5">{lang === "zh" ? "包括：奇蹟面膜3片、抗敏安瓶5ml、#SOCALM 1精華水5ml、水漾防曬6ml" : "Incl: Miracle Mask x3, Ampoule 5ml, #SOCALM 1 5ml, Sun Protect 6ml"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#825F59] font-bold">●</span>
                    <div>
                      <p className="font-semibold text-[#9E7428]">{lang === "zh" ? "滿 HK$3,000 即贈 10 件療敏禮品" : "Spend HK$3,000, get 10-pc Deluxe Set"}</p>
                      <p className="text-[11px] text-[#8F8881] mt-0.5">{lang === "zh" ? "包括：奇蹟面膜6片、抗敏安瓶5mlx2粒、#SOCALM 1精華水5ml、水漾防曬6ml" : "Incl: Miracle Mask x6, Ampoule 5ml x2, #SOCALM 1 5ml, Sun Protect 6ml"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. Seasonal Hero Full Bleed Banner */}
      <section className="relative h-[65vh] md:h-[80vh] overflow-hidden flex items-end">
        <img 
          src="https://cs12skincare.com.hk/wp-content/uploads/2025/03/March-2025-Banner-1400x788.jpg" 
          alt="Seasonal Skin Treatment" 
          className="absolute inset-0 w-full h-full object-cover select-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/15"></div>
        <div className="relative z-10 w-[min(calc(100%-24px),1440px)] mx-auto pb-12 md:pb-20 text-white">
          <div className="max-w-[600px] space-y-4">
            <p className="text-[10px] tracking-[0.25em] uppercase text-[#D8C6A6] font-bold">Seasonal Focus</p>
            <h2 className="font-serif text-[44px] sm:text-[56px] md:text-[68px] leading-[1.0] tracking-tight font-medium">
              {lang === "zh" ? <>敏感肌<br/>轉季必備</> : <>Sensitive Skin<br/>Seasonal Focus</>}
            </h2>
            <p className="text-[13px] sm:text-[14.5px] leading-relaxed text-white/90">
              {lang === "zh"
                ? "針對突發性泛紅、痕癢、乾澀不適，為你量身編排一套極簡、安全、醫美級的角質層修護程序。"
                : "Target sudden redness, itchiness, and severe dry irritation. Specially curated clinical-grade routine to reconstruct skin elasticity."
              }
            </p>
            <div className="pt-2">
              <Link 
                to="/shop" 
                className="inline-flex border border-white text-white px-9 h-[48px] items-center text-[10px] tracking-[0.2em] uppercase font-bold hover:bg-white hover:text-[#9E7428] transition-all duration-300 rounded-[2px]"
              >
                {lang === "zh" ? "立即選購" : "Shop Now"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Product Stories Section: Miracle Mask & #SOCALM */}
      <section className="border-b border-[#ECE6DF]">
        {/* Miracle Mask Section */}
        <div className="grid md:grid-cols-2">
          <div className="relative aspect-[4/5] md:aspect-auto md:h-[90vh] overflow-hidden bg-white group">
            <img
              src="https://cs12skincare.com.hk/wp-content/uploads/2026/03/cs-12-253-E-720x1080.jpg"
              alt="CS12 Miracle Mask"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1500ms] ease-out group-hover:scale-[1.03]"
              loading="lazy"
            />
            <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-sm px-4 py-2 border border-[#ECE6DF] text-[9.5px] tracking-[0.16em] uppercase font-bold z-10">
              {lang === "zh" ? "獨家 CalmEX 療敏配方" : "Exclusive CalmEX Formula"}
            </div>
          </div>
          <div className="flex items-center bg-white p-8 sm:p-12 md:p-24">
            <div className="max-w-[480px] space-y-6">
              <p className="text-[10px] tracking-[0.25em] uppercase text-[#8F8881] font-bold">Hero 01 — CalmEX Series</p>
              <h3 className="font-serif text-[38px] sm:text-[46px] leading-[1.1] text-[#9E7428]">
                {lang === "zh" ? <>抗敏奇蹟面膜<br/>Miracle Mask</> : <>Miracle Mask<br/>Anti-Allergy</>}
              </h3>
              <p className="text-[#3A3734] text-[13.5px] sm:text-[14.5px] leading-relaxed">
                {lang === "zh"
                  ? "CS12 品牌開山之作，累計銷量突破百萬片。革命性冰感膠囊釋放技術，上臉即時降溫 5°C，5分鐘內迅速退紅消炎、舒緩日曬及醫美微創術後的突發敏感刺痛。"
                  : "CS12's signature masterpiece. Formulated with state-of-the-art capsule cooling technology, it instantly lowers skin surface temperature by 5°C. Rapidly relieves redness, burning sensations, and post-laser skin irritation."
                }
              </p>
              <ul className="space-y-2.5 text-[12px] text-[#5C5651] list-none pl-0">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#825F59]" />
                  <span>{lang === "zh" ? "瞬間冰感降溫 5°C，迅速止癢退紅" : "Instant 5°C skin-cooling effect to calm irritation"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#825F59]" />
                  <span>{lang === "zh" ? "日本頂級無刺激天然蠶絲膜布，服貼度極佳" : "Japanese medical-grade silk, highly biocompatible"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[#825F59]" />
                  <span>{lang === "zh" ? "深層透明質酸補水 + 維他命 B3 煥亮黯沉" : "Hyaluronic Acid hydration + Niacinamide radiance"}</span>
                </li>
              </ul>
              <div className="pt-3">
                <Link 
                  to="/product/cs12-miracle-mask-zh" 
                  className="inline-flex text-[11px] tracking-[0.18em] uppercase font-bold border-b border-[#9E7428] pb-1 hover:text-[#825F59] hover:border-[#825F59] transition duration-200"
                >
                  {lang === "zh" ? "查看奇蹟面膜詳情 ↗" : "View Miracle Mask Detail ↗"}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* #SOCALM Section */}
        <div className="grid md:grid-cols-2 bg-[#FBF6F0]">
          <div className="flex items-center p-8 sm:p-12 md:p-24 order-2 md:order-1">
            <div className="max-w-[480px] space-y-6">
              <p className="text-[10px] tracking-[0.25em] uppercase text-[#8F8881] font-bold">Hero 02 — Barrier Defense</p>
              <h3 className="font-serif text-[38px] sm:text-[46px] leading-[1.1] text-[#9E7428]">
                {lang === "zh" ? <>強韌屏障 3 步曲<br/>#SOCALM Ritual</> : <>3-Step Barrier Ritual<br/>#SOCALM Series</>}
              </h3>
              <p className="text-[#3A3734] text-[13.5px] sm:text-[14.5px] leading-relaxed">
                {lang === "zh"
                  ? "敏感肌的根源在於皮膚屏障受損。#SOCALM 系列是不添加任何香精、酒精、化學防腐劑的屏障重建儀式。透過喚醒、精華導入、鎖水，層層重建角質層健康油脂網。"
                  : "Reconstruct your lipid network from within. The #SOCALM series is formulated completely free of synthetic fragrances, drying alcohols, and toxic preservatives. Systematically strengthens dry, irritated skin."
                }
              </p>
              <div className="grid grid-cols-3 gap-3 text-center border-t border-[#ECE6DF] pt-6 mt-6">
                <div className="bg-white/50 p-3 rounded-[3px] border border-[#ECE6DF]/40">
                  <em className="font-serif text-[24px] text-[#825F59] block font-semibold">01</em>
                  <label className="text-[10px] tracking-[0.1em] uppercase font-bold text-[#4A4642] block mt-1">
                    {lang === "zh" ? "1號 喚醒" : "1 Awaken"}
                  </label>
                </div>
                <div className="bg-white/50 p-3 rounded-[3px] border border-[#ECE6DF]/40">
                  <em className="font-serif text-[24px] text-[#825F59] block font-semibold">02</em>
                  <label className="text-[10px] tracking-[0.1em] uppercase font-bold text-[#4A4642] block mt-1">
                    {lang === "zh" ? "2號 導入" : "2 Boost"}
                  </label>
                </div>
                <div className="bg-white/50 p-3 rounded-[3px] border border-[#ECE6DF]/40">
                  <em className="font-serif text-[24px] text-[#825F59] block font-semibold">03</em>
                  <label className="text-[10px] tracking-[0.1em] uppercase font-bold text-[#4A4642] block mt-1">
                    {lang === "zh" ? "3號 鎖水" : "3 Soothe"}
                  </label>
                </div>
              </div>
              <div className="pt-3">
                <Link 
                  to="/shop?series=SoCalm" 
                  className="inline-flex text-[11px] tracking-[0.18em] uppercase font-bold border-b border-[#9E7428] pb-1 hover:text-[#825F59] hover:border-[#825F59] transition duration-200"
                >
                  {lang === "zh" ? "選購 #SOCALM 系列 ↗" : "Shop #SOCALM Range ↗"}
                </Link>
              </div>
            </div>
          </div>
          <div className="relative aspect-[4/5] md:aspect-auto md:h-[90vh] overflow-hidden order-1 md:order-2 bg-white group">
            <img
              src="https://cs12skincare.com.hk/wp-content/uploads/2026/03/1O1A7491-E-scaled.jpg"
              alt="CS12 #SOCALM"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1500ms] ease-out group-hover:scale-[1.03]"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* 4. Brand Philosophy / About Section (Restored & Managed) */}
      <section id="about-section" className="py-20 md:py-28 bg-[#FDFBF8] text-center border-b border-[#ECE6DF]">
        <div className="w-[min(calc(100%-24px),960px)] mx-auto space-y-6">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#8F8881] font-bold">
            {lang === "zh" ? "敏感肌修復專家" : "Sensitive Skin Repair Specialist"}
          </p>
          <h2 className="font-serif text-[38px] sm:text-[48px] md:text-[54px] leading-[1.1] font-light text-[#9E7428] tracking-tight">
            {lang === "zh" ? "為敏感肌而生的溫和醫研修護" : "Gentle Clinical Care Crafted for Sensitive Skin"}
          </h2>
          <div className="w-16 h-[1.5px] bg-[#825F59] mx-auto my-6"></div>
          <p className="text-[#3A3734] text-[14px] sm:text-[15.5px] leading-relaxed max-w-[72ch] mx-auto font-light">
            {lang === "zh"
              ? "自 2010 年創立以來，CS12 始終堅守一個簡單的哲學：引進德國頂尖醫美配方科技，精選大自然純淨無污染的修護成分，專為亞洲人脆弱的肌膚量身定製。我們不追求速效刺激，只專注於最溫和、安全、臨床實證的方式，為深受濕疹、玫瑰痤瘡、突發泛紅困擾的敏感肌，重塑強韌光澤。"
              : "Founded in 2010, CS12 combines advanced German skincare technology with the purest natural botanical extracts. We curate clinical-grade, gentle skincare rituals optimized for Asian skin. We do not chase temporary fixes; we provide dermatologist-tested, continuous repair for eczema, rosacea, redness, and extreme irritation."
            }
          </p>
          <div className="pt-6">
            <Link 
              to="/shop" 
              className="inline-flex bg-[#9E7428] text-white px-9 py-3.5 text-[10px] tracking-[0.2em] uppercase font-bold hover:bg-[#8F6824] transition rounded-[2px]"
            >
              {lang === "zh" ? "探索我們的保養方案" : "Discover Our Solutions"}
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Featured Curated Collections Grid */}
      <section className="bg-white border-b border-[#ECE6DF] py-20 md:py-24">
        <div className="w-[min(calc(100%-24px),1440px)] mx-auto">
          <div className="text-center mb-16 space-y-3">
            <p className="text-[10px] tracking-[0.25em] uppercase text-[#8F8881] font-bold">Selected Collections</p>
            <h2 className="font-serif text-[34px] sm:text-[44px] tracking-tight">{lang === "zh" ? "精選修護系列" : "Prestige Collections"}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            
            <Link to="/shop?series=CalmEX" className="group block space-y-4">
              <div className="aspect-square bg-[#FDFBF8] border border-[#ECE6DF] overflow-hidden rounded-[3px] relative shadow-sm">
                <img 
                  src="https://cs12skincare.com.hk/wp-content/uploads/2026/03/CalmEX1200-1-1200x1200.png" 
                  className="w-full h-full object-cover group-hover:scale-[1.05] transition duration-700"
                  alt="CalmEX"
                  loading="lazy"
                />
              </div>
              <div>
                <h4 className="font-serif text-[22px] text-[#9E7428]">#CalmEX</h4>
                <p className="text-[11.5px] text-[#8F8881] mt-1 font-medium">{lang === "zh" ? "奇蹟修護 · 冰感鎮靜" : "Miracle Repair · Ice Soothing"}</p>
              </div>
            </Link>

            <Link to="/shop?series=SoCalm" className="group block space-y-4">
              <div className="aspect-square bg-[#FDFBF8] border border-[#ECE6DF] overflow-hidden rounded-[3px] relative shadow-sm">
                <img 
                  src="https://cs12skincare.com.hk/wp-content/uploads/2026/03/SoClam1200-1200x1200.png" 
                  className="w-full h-full object-cover group-hover:scale-[1.05] transition duration-700"
                  alt="SoCalm"
                  loading="lazy"
                />
              </div>
              <div>
                <h4 className="font-serif text-[22px] text-[#9E7428]">#SoCalm</h4>
                <p className="text-[11.5px] text-[#8F8881] mt-1 font-medium">{lang === "zh" ? "3步強韌屏障" : "3-Step Barrier Strengthening"}</p>
              </div>
            </Link>

            <Link to="/shop?series=CellRevEX" className="group block space-y-4">
              <div className="aspect-square bg-[#FDFBF8] border border-[#ECE6DF] overflow-hidden rounded-[3px] relative shadow-sm">
                <img 
                  src="https://cs12skincare.com.hk/wp-content/uploads/2025/01/CNY-banner-1-1-scaled.jpg" 
                  className="w-full h-full object-cover group-hover:scale-[1.05] transition duration-700"
                  alt="CellRevEX"
                  loading="lazy"
                />
              </div>
              <div>
                <h4 className="font-serif text-[22px] text-[#9E7428]">#CellRevEX</h4>
                <p className="text-[11.5px] text-[#8F8881] mt-1 font-medium">{lang === "zh" ? "逆齡緊緻 · 活細胞更新" : "Anti-Aging · Cell Renewal"}</p>
              </div>
            </Link>

            <Link to="/shop?cat=防曬" className="group block space-y-4">
              <div className="aspect-square bg-[#FDFBF8] border border-[#ECE6DF] overflow-hidden rounded-[3px] relative shadow-sm">
                <img 
                  src="https://cs12skincare.com.hk/wp-content/uploads/2024/03/CS12-SUN-CUSHION-IVORY-PINK-7-SAND-BEIGE-9-scaled.jpg" 
                  className="w-full h-full object-cover group-hover:scale-[1.05] transition duration-700"
                  alt="Sunscreen"
                  loading="lazy"
                />
              </div>
              <div>
                <h4 className="font-serif text-[22px] text-[#9E7428]">{lang === "zh" ? "防曬護理" : "Sun Care"}</h4>
                <p className="text-[11.5px] text-[#8F8881] mt-1 font-medium">{lang === "zh" ? "透氣物理防曬 · 零負擔" : "Lightweight Physical Defense"}</p>
              </div>
            </Link>

          </div>
        </div>
      </section>

      {/* 6. Refined & Elegantly Managed Product Recommendations */}
      <section className="w-[min(calc(100%-24px),1440px)] mx-auto py-20 md:py-24">
        <div className="flex justify-between items-end mb-12">
          <div>
            <p className="text-[10px] tracking-[0.25em] uppercase text-[#8F8881] font-bold mb-2">Summer Essentials</p>
            <h2 className="font-serif text-[34px] sm:text-[42px] leading-none tracking-tight">{lang === "zh" ? "官網限定修護套裝" : "Exclusive Bundles"}</h2>
          </div>
          <Link 
            to="/exclusive" 
            className="text-[11px] tracking-[0.18em] uppercase font-bold border-b border-[#9E7428] pb-1 hover:text-[#825F59] hover:border-[#825F59] transition"
          >
            {lang === "zh" ? "查看全部限定" : "View All"}
          </Link>
        </div>
        
        {/* Curated bundles displayed with luxurious, highly managed Product Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {bundles.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* 7. Real Testimonials / Social Proof with Lightbox Images (Restored & Highly Interactive) */}
      <section className="bg-[#9E7428] text-[#FDFBF8] py-20 md:py-28">
        <div className="w-[min(calc(100%-24px),1440px)] mx-auto space-y-12">
          <div className="text-center md:text-left space-y-3">
            <p className="text-[10px] tracking-[0.25em] uppercase text-white/80 font-bold">Dermatological Proof</p>
            <h2 className="font-serif text-[36px] sm:text-[46px] leading-[1.1] text-white">
              {lang === "zh" ? <>真實用家｜如實分享</> : <>Real Results, Real Customers</>}
            </h2>
            <p className="text-white/85 text-[13px] sm:text-[14px] max-w-[500px]">
              {lang === "zh" ? "我們相信真實的改變。點擊下方用家相片可放大查看肌膚修護前後細節。" : "We believe in transparency. Click on any picture to zoom and inspect closely."}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {testimonials.map((t) => {
              const reviewText = lang === "zh" ? t.review_zh : t.review_en
              const productName = lang === "zh" ? t.product_zh : t.product_en

              return (
                <div 
                  key={t.name} 
                  className="bg-white/10 border border-white/20 p-5 rounded-[4px] flex flex-col justify-between hover:bg-white/[0.14] hover:border-white/35 transition-all duration-300"
                >
                  <div className="space-y-4">
                    {/* Interactive Customer Image Card with Hover Magnify */}
                    <div 
                      onClick={() => {
                        setLightboxImage(t.image)
                        setLightboxName(t.name)
                      }}
                      className="aspect-[4/3] rounded-[2px] overflow-hidden bg-[#9E7428]/20 border border-white/10 cursor-pointer relative group"
                    >
                      <img 
                        src={t.image} 
                        alt={t.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" 
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-[#9E7428]/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-300">
                        <span className="text-[10px] bg-white text-[#9E7428] font-semibold tracking-wider uppercase px-3 py-1.5 rounded-[2px] shadow-lg">
                          {lang === "zh" ? "點擊放大" : "Zoom In"}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1 text-[#FFF3D7]">
                      {[...Array(5)].map((_, i) => <Star key={i} size={13} fill="currentColor" className="stroke-none" />)}
                    </div>

                    <p className="text-white font-serif text-[18px] tracking-wide mt-2">{t.name}</p>
                    <p className="text-white/85 text-[12px] leading-relaxed line-clamp-5 hover:line-clamp-none transition-all duration-300">
                      &ldquo;{reviewText}&rdquo;
                    </p>
                  </div>

                  <div className="border-t border-white/20 pt-4 mt-4">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-white/65 block font-semibold">
                      {lang === "zh" ? "使用產品" : "Product Used"}
                    </span>
                    <span className="text-[11.5px] text-[#FFF3D7] mt-1 block font-medium">
                      {productName}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 8. Sensitive Skin Tips / Interactive Education Accordion (敏感肌須知) */}
      <section id="sensitive-skin-tips" className="py-20 md:py-24 bg-[#FBF6F0] border-b border-[#ECE6DF]">
        <div className="w-[min(calc(100%-24px),1100px)] mx-auto grid md:grid-cols-[1fr_1.3fr] gap-12 items-center">
          
          <div className="space-y-5 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 text-[#825F59] text-[10px] tracking-[0.2em] uppercase font-bold">
              <BookOpen size={13} />
              {lang === "zh" ? "敏感肌修復指南" : "Sensitive Skin Care Tips"}
            </div>
            <h2 className="font-serif text-[36px] sm:text-[46px] leading-[1.1] text-[#9E7428]">
              {lang === "zh" ? <>敏感肌護膚<br/>黃金法則</> : <>The Golden Rules<br/>for Sensitive Skin</>}
            </h2>
            <p className="text-[#5C5651] text-[13.5px] sm:text-[14.5px] leading-relaxed">
              {lang === "zh" 
                ? "敏感並非無藥可醫。遵循 CS12 專家團隊整理的黃金護膚守則，避開不當護理雷區，系統性重建健康肌底。" 
                : "Sensitivity is manageable. Follow CS12's clinical-grade care guidelines, stop over-washing, and safely rebuild your protective lipid coat."
              }
            </p>
            <div className="pt-2">
              <Link 
                to="/shop?skin=敏感肌" 
                className="bg-[#9E7428] hover:bg-[#8F6824] text-white text-[11px] font-bold tracking-[0.18em] uppercase px-7 py-3 inline-flex rounded-[2px] transition duration-300"
              >
                {lang === "zh" ? "選購敏感肌專屬保養" : "Shop Sensitive Essentials"}
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            {skinTips.map((tip, index) => {
              const active = activeTipIndex === index
              const title = lang === "zh" ? tip.title_zh : tip.title_en
              const desc = lang === "zh" ? tip.desc_zh : tip.desc_en

              return (
                <div 
                  key={index}
                  className="bg-white border border-[#ECE6DF] rounded-[4px] transition-all duration-300 overflow-hidden shadow-sm"
                >
                  <button
                    onClick={() => setActiveTipIndex(active ? null : index)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left focus:outline-none"
                  >
                    <span className="font-serif text-[16px] sm:text-[18px] font-semibold text-[#9E7428] tracking-wide">
                      {title}
                    </span>
                    <span className={`text-[18px] text-[#8F8881] font-light transition-transform duration-300 ${active ? "rotate-45" : ""}`}>
                      ＋
                    </span>
                  </button>

                  <div 
                    className={`transition-all duration-300 ease-in-out ${
                      active ? "max-h-[180px] border-t border-[#ECE6DF]/50 py-4 px-6 bg-[#FDFBF8]/70" : "max-h-0 py-0 px-6 opacity-0"
                    }`}
                  >
                    <p className="text-[#3A3734] text-[12.5px] sm:text-[13.5px] leading-relaxed">
                      {desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </section>

      {/* 9. Prestige Newsletter Form with Layout Mockup */}
      <section className="bg-white py-16 md:py-24 border-b border-[#ECE6DF]">
        <div className="w-[min(calc(100%-24px),1440px)] mx-auto grid md:grid-cols-2 gap-12 items-center">
          
          {/* Form left */}
          <div className="space-y-6 md:pr-12">
            <h3 className="font-serif text-[32px] sm:text-[42px] leading-tight text-[#9E7428]">
              {lang === "zh" ? <>訂閱 PRESTIGE<br/>Newsletter</> : <>Subscribe to our<br/>PRESTIGE Newsletter</>}
            </h3>
            <p className="text-[#5C5651] text-[13.5px] sm:text-[14.5px] leading-relaxed">
              {lang === "zh"
                ? "想要第一時間獲得 CS12 最新產品發佈、官網限定折扣代碼及專業抗敏護膚技巧嗎？立即加入我們，一同見證肌膚健康奇蹟。"
                : "Gain instant, first-look access to private product launches, member-only coupon codes, and dermatologist-crafted tips for barrier repair."
              }
            </p>

            {newsletterSuccess ? (
              <div className="bg-[#FAF3E9] border border-[#EAD8BE] p-6 rounded-[3px] space-y-2 text-center md:text-left">
                <div className="inline-flex p-1 bg-green-100 text-green-700 rounded-full mb-1"><Check size={16}/></div>
                <h4 className="font-serif text-[18px] text-[#9E7428] font-semibold">{lang === "zh" ? "訂閱成功！" : "Successfully Subscribed!"}</h4>
                <p className="text-[12px] text-[#5C5651]">
                  {lang === "zh" ? "我們已將獨家迎新優惠碼發送至您的電郵。首次購物滿 $1500 輸入 NEWCS12 即享 15% OFF！" : "Your unique welcome code has been sent. Enter NEWCS12 on first orders above $1500 to enjoy 15% OFF."}
                </p>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                <div className="flex border border-[#9E7428] rounded-[3px] overflow-hidden focus-within:ring-1 focus-within:ring-[#9E7428]">
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={e => setNewsletterEmail(e.target.value)}
                    placeholder={lang === "zh" ? "輸入您的電郵地址" : "Enter your email address"}
                    className="flex-1 px-4 py-3 text-[13px] bg-white outline-none"
                  />
                  <button 
                    type="submit" 
                    className="bg-[#9E7428] text-white px-6 text-[11px] tracking-[0.18em] uppercase font-bold hover:bg-[#8F6824] transition duration-200"
                  >
                    {lang === "zh" ? "訂閱" : "Subscribe"}
                  </button>
                </div>
                <p className="text-[10px] text-[#8F8881] leading-relaxed">
                  {lang === "zh" 
                    ? "*隨訂閱即表示您同意 CS12 Skincare Hong Kong (CS12 Skin Experts Limited) 的隱私政策和服務條款。" 
                    : "*By clicking Subscribe, you agree to receive emails and accept CS12 Skin Experts Limited's Privacy Policy & Terms."
                  }
                </p>
              </form>
            )}
          </div>

          {/* Graphic mockup right */}
          <div className="flex justify-center">
            <div className="relative max-w-[450px] w-full">
              <div className="absolute inset-0 bg-[#FBF6F0] rounded-2xl transform rotate-3 scale-95 border border-[#ECE6DF]"></div>
              <img 
                src="https://cs12skincare.com.hk/wp-content/uploads/2026/03/2026-WEBSITE-MOCKUP.png" 
                alt="CS12 Prestige Newsletter Mockup" 
                className="w-full relative z-10 transition-transform duration-500 hover:translate-y-[-4px]"
                loading="lazy"
              />
            </div>
          </div>

        </div>
      </section>

      {/* 10. Official Retailer / Static Support Banner */}
      <section className="w-[min(calc(100%-24px),1440px)] mx-auto py-16 grid md:grid-cols-3 gap-6 sm:gap-8">
        <div className="bg-white border border-[#ECE6DF] p-8 text-center rounded-[3px] shadow-sm flex flex-col justify-between h-full">
          <div>
            <img src="https://cs12skincare.com.hk/wp-content/uploads/2026/03/1.png" className="w-14 h-16 mx-auto mb-4 object-contain" alt="15% Off"/>
            <h4 className="font-serif text-[22px] text-[#9E7428] font-semibold">
              {lang === "zh" ? "享 15% OFF" : "Save 15% OFF"}
            </h4>
            <p className="text-[12px] text-[#5C5651] mt-2.5 leading-relaxed max-w-[28ch] mx-auto">
              {lang === "zh" ? "首次購物滿 HK$1,500 即享！\n優惠代碼：NEWCS12" : "First time order over HK$1,500.\nCode: NEWCS12"}
            </p>
          </div>
          <div className="pt-4">
            <Link to="/shop" className="text-[10px] tracking-[0.16em] uppercase font-bold text-[#9E7428] border-b border-[#9E7428] pb-0.5 hover:text-[#825F59] hover:border-[#825F59] transition">
              {lang === "zh" ? "立即選購" : "Shop Now"}
            </Link>
          </div>
        </div>

        <div className="bg-white border border-[#ECE6DF] p-8 text-center rounded-[3px] shadow-sm flex flex-col justify-between h-full">
          <div>
            <img src="https://cs12skincare.com.hk/wp-content/uploads/2026/03/2.png" className="w-14 h-16 mx-auto mb-4 object-contain" alt="Free Shipping"/>
            <h4 className="font-serif text-[22px] text-[#9E7428] font-semibold">
              {lang === "zh" ? "全官網免運費" : "Free Worldwide Shipping"}
            </h4>
            <p className="text-[12px] text-[#5C5651] mt-2.5 leading-relaxed max-w-[28ch] mx-auto">
              {lang === "zh" ? "購買任何精選產品滿 HK$800，免費配送到您的指定地址。" : "Free local & regional shipment to your door for orders over HK$800."}
            </p>
          </div>
          <div className="pt-4">
            <Link to="/shop" className="text-[10px] tracking-[0.16em] uppercase font-bold text-[#9E7428] border-b border-[#9E7428] pb-0.5 hover:text-[#825F59] hover:border-[#825F59] transition">
              {lang === "zh" ? "立即選購" : "Shop Now"}
            </Link>
          </div>
        </div>

        <div className="bg-[#9E7428] text-[#FDFBF8] border border-[#9E7428] p-8 text-center rounded-[3px] shadow-md flex flex-col justify-between h-full">
          <div>
            <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center font-serif text-[22px] font-bold mx-auto mb-6 text-[#EAD8BE]">
              M
            </div>
            <h4 className="font-serif text-[22px] text-white font-semibold">
              {lang === "zh" ? "會員積分系統" : "Prestige Points Club"}
            </h4>
            <p className="text-[12px] text-white/85 mt-2.5 leading-relaxed max-w-[28ch] mx-auto">
              {lang === "zh" ? "每 HK$1 累積 1 積分。100 積分折抵 HK$1，生日享雙倍積分與限時 10% OFF 禮遇。" : "Spend HK$1 = earn 1 point. 100 points = HK$1 credit. Double points on your Birthday Month + 10% OFF."}
            </p>
          </div>
          <div className="pt-4">
            <Link to="/account" className="text-[10px] tracking-[0.16em] uppercase font-bold text-[#EAD8BE] border-b border-[#EAD8BE] pb-0.5 hover:text-white hover:border-white transition">
              {lang === "zh" ? "進入會員中心" : "Enter Member Portal"}
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================================== */}
      {/* Testimonial Photo Lightbox Zoom Overlay Modal */}
      {/* ============================================================================== */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-[#9E7428]/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setLightboxImage(null)}
        >
          <div 
            className="bg-white/5 border border-white/10 p-2.5 rounded-[4px] relative max-w-[90vw] max-h-[85vh] flex flex-col animate-scaleUp shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 bg-white/10 text-white w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/20 transition duration-200"
              aria-label="Close zoomed view"
            >
              <X size={18} />
            </button>
            <div className="overflow-hidden bg-[#9E7428]/20 rounded-[2px]">
              <img 
                src={lightboxImage} 
                alt={lightboxName || "Zoomed skin comparison"} 
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
            {lightboxName && (
              <div className="text-center pt-3 text-white text-[12px] tracking-wider uppercase font-medium">
                {lang === "zh" ? `用家效果：${lightboxName}` : `Customer Case: ${lightboxName}`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* Special Promotion Pop-up Banner Modal (Restored & Managed) */}
      {/* ============================================================================== */}
      {showPromoPopup && (
        <div 
          className="fixed inset-0 z-50 bg-[#9E7428]/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => handleDismissPopup(false)}
        >
          <div 
            className="bg-[#FDFBF8] border border-[#ECE6DF] max-w-[440px] w-full p-4 rounded-[6px] relative shadow-2xl animate-scaleUp"
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button "×" */}
            <button 
              onClick={() => handleDismissPopup(false)}
              className="absolute -top-3 -right-3 bg-[#9E7428] text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#8F6824] transition duration-200 border-2 border-[#FDFBF8] shadow-md z-30"
              aria-label="Close promotion dialog"
            >
              <X size={15} />
            </button>

            <div className="space-y-4">
              <Link 
                to="/exclusive"
                onClick={() => handleDismissPopup(false)}
                className="block overflow-hidden rounded-[4px] border border-[#ECE6DF] relative group"
              >
                <img 
                  src="https://cs12skincare.com.hk/wp-content/uploads/2026/03/202607_Pop-Up-Banner.png" 
                  alt="Summer Special Promotion Banner" 
                  className="w-full transition-transform duration-[1.2s] group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-[#9E7428]/10 group-hover:bg-transparent transition duration-300"></div>
              </Link>

              <div className="text-center space-y-2 px-2">
                <h4 className="font-serif text-[20px] text-[#9E7428] font-semibold">
                  {lang === "zh" ? "夏季官網限定優惠" : "Summer Limited Offer"}
                </h4>
                <p className="text-[12px] text-[#5C5651] leading-relaxed">
                  {lang === "zh"
                    ? "冰涼修護面膜套裝、限時買多送多贈禮遇！"
                    : "Icy restorative sets, maximum gift-with-purchases available!"
                  }
                </p>
                <div className="pt-2">
                  <Link 
                    to="/exclusive"
                    onClick={() => handleDismissPopup(false)}
                    className="w-full bg-[#9E7428] text-white py-2.5 text-[11px] tracking-[0.18em] uppercase font-bold hover:bg-[#8F6824] transition duration-200 block text-center rounded-[3px] shadow"
                  >
                    {lang === "zh" ? "立即前往選購 ↗" : "Shop Specials Now ↗"}
                  </Link>
                </div>
              </div>

              {/* Keep Silent Option: Don't show again today */}
              <div className="flex items-center justify-center gap-2 border-t border-[#ECE6DF] pt-3 mt-2 text-[11px] text-[#8F8881]">
                <input 
                  type="checkbox" 
                  id="dontShowAgain"
                  onChange={e => handleDismissPopup(e.target.checked)}
                  className="w-3.5 h-3.5 border-[#ECE6DF] rounded focus:ring-0 text-[#9E7428] cursor-pointer"
                />
                <label htmlFor="dontShowAgain" className="cursor-pointer select-none font-medium">
                  {lang === "zh" ? "今日不再顯示此優惠" : "Don't show this again today"}
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
