import { Link } from "react-router-dom"
import { useAppStore } from "../../stores/useAppStore"
import { useThemeStore } from "../../stores/useThemeStore"
import { showToast } from "../ui/Toast"
import { useState } from "react"
import { subscribeToNewsletter } from "../../lib/newsletter/subscribe"

export function Footer() {
  const { lang } = useAppStore()
  const { settings } = useThemeStore()
  const [newsletterEmail, setNewsletterEmail] = useState("")

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newsletterEmail.trim()) return

    try {
      const email = newsletterEmail.trim()
      const result = await subscribeToNewsletter(email, "footer")
      showToast(
        "success",
        result === "already-subscribed"
          ? (lang === "zh" ? "此電郵已訂閱電子報" : "This email is already subscribed.")
          : (lang === "zh" ? `已訂閱！感謝 ${email} 的訂閱` : `Subscribed! Thank you ${email}`)
      )
      setNewsletterEmail("")
    } catch {
      showToast("error", lang === "zh" ? "暫時未能完成訂閱，請稍後再試" : "Could not subscribe. Please try again.")
    }
  }

  return (
    <footer className="border-t border-[#ECE6DF] mt-20 bg-white">
      <div className="w-[min(calc(100%-24px),1440px)] mx-auto py-16 grid md:grid-cols-4 gap-12 text-[13px] leading-relaxed">
        <div>
          <h4 className="font-serif text-[22px] tracking-[0.12em] mb-4">CS12</h4>
          <p className="text-[#5C5651]">{lang==="zh"?"敏感肌修復專家，為敏感肌而生的溫和醫研修護。有效療癒敏感肌、濕疹、玫瑰痤瘡。":"Sensitive skin repair specialist. Gentle medical-grade care for eczema, rosacea, redness."}</p>
        </div>
        <div>
          <h5 className="text-[10px] tracking-[0.2em] uppercase font-semibold text-[#8F8881] mb-4">{lang==="zh"?"選購":"Shop"}</h5>
          <ul className="space-y-2 text-[#3A3734]">
            <li><Link to="/exclusive">{lang==="zh"?"官網限定":"Exclusive"}</Link></li>
            <li><Link to="/shop?cat=暢銷產品">{lang==="zh"?"暢銷產品":"Bestsellers"}</Link></li>
            <li><Link to="/shop?series=CalmEX">CalmEX</Link></li>
            <li><Link to="/shop?series=SoCalm">SoCalm</Link></li>
            <li><Link to="/shop?series=CellRevEX">CellRevEX</Link></li>
            <li><Link to="/shop?cat=面膜">{lang==="zh"?"面膜":"Masks"}</Link></li>
            <li><Link to="/shop?cat=防曬">{lang==="zh"?"防曬":"Sun Care"}</Link></li>
          </ul>
        </div>
        <div>
          <h5 className="text-[10px] tracking-[0.2em] uppercase font-semibold text-[#8F8881] mb-4">{lang==="zh"?"幫助":"Help"}</h5>
          <ul className="space-y-2 text-[#3A3734]">
            <li><Link to="/shop">{lang==="zh"?"配送及退貨":"Shipping & Returns"}</Link></li>
            <li><Link to="/shop">{lang==="zh"?"常見問題":"FAQ"}</Link></li>
            <li><Link to="/#sensitive-skin-tips">{lang==="zh"?"敏感肌須知":"Sensitive Skin Guide"}</Link></li>
            <li><Link to="/shop">{lang==="zh"?"私隱政策":"Privacy Policy"}</Link></li>
            <li><Link to="/account">{lang==="zh"?"我的帳戶":"My Account"}</Link></li>
            <li><Link to="/wishlist">{lang==="zh"?"願望清單":"Wishlist"}</Link></li>
          </ul>
          <div className="mt-6 text-[11px] text-[#8F8881] space-y-1">
            <p>📧 {settings.contactEmail}</p>
            <p>📞 {settings.contactPhone}</p>
            <p>📍 {lang === "zh" ? settings.address_zh : settings.address_en}</p>
          </div>
        </div>
        <div>
          <h5 className="text-[10px] tracking-[0.2em] uppercase font-semibold text-[#8F8881] mb-4">Newsletter</h5>
          <p className="text-[#5C5651] text-[12px] mb-3">{lang==="zh"?"訂閱獲取最新優惠及抗敏護膚技巧":"Get offers & repair tips."}</p>
          <form onSubmit={handleNewsletter} className="flex border border-[#111]">
            <input
              type="email"
              value={newsletterEmail}
              onChange={e=>setNewsletterEmail(e.target.value)}
              placeholder={lang==="zh"?"輸入您的電郵":"Your email"}
              className="flex-1 px-3 py-2 text-[12px] outline-none"
              required
            />
            <button type="submit" className="bg-[#111] text-white px-4 text-[10px] tracking-[0.18em] uppercase">→</button>
          </form>
          <div className="mt-6 flex gap-3 text-[11px]">
            <a href={settings.instagramUrl} target="_blank" rel="noopener" className="border border-[#ECE6DF] px-3 py-1 hover:bg-[#FBF6F0] transition">Instagram</a>
            <a href={settings.whatsappUrl} target="_blank" rel="noopener" className="border border-[#ECE6DF] px-3 py-1 hover:bg-[#FBF6F0] transition">WhatsApp CS</a>
          </div>
        </div>
      </div>
      <div className="border-t border-[#F2ECE4] py-6 text-center text-[10px] tracking-[0.14em] uppercase text-[#8F8881]">
        © {new Date().getFullYear()} CS12 Skin Experts Limited. All rights reserved.
      </div>
    </footer>
  )
}
