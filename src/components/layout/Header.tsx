import { Link, useNavigate } from "react-router-dom"
import { useCartStore } from "../../stores/useCartStore"
import { useAppStore } from "../../stores/useAppStore"
import { useAuthStore } from "../../stores/useAuthStore"
import { ShoppingBag, User, Menu, X, Search } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { MiniCart } from "../cart/MiniCart"

export function Header() {
  const { items } = useCartStore()
  const { currency, setCurrency, lang, setLang } = useAppStore()
  const { user, logout } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [miniCartOpen, setMiniCartOpen] = useState(false)
  const [badgePop, setBadgePop] = useState(false)
  const prevCount = useRef(items.reduce((a,b)=>a+b.qty,0))
  const nav = useNavigate()
  const count = items.reduce((a,b)=>a+b.qty,0)

  // Animate badge on count change
  useEffect(() => {
    if (count !== prevCount.current && count > 0) {
      setBadgePop(true)
      const t = setTimeout(() => setBadgePop(false), 350)
      prevCount.current = count
      return () => clearTimeout(t)
    }
    prevCount.current = count
  }, [count])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      nav(`/shop?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setSearchQuery("")
    }
  }

  return (
    <>
      <div className="bg-gradient-to-r from-[#F4ECE1] via-[#F7F3EB] to-[#F0E8D8] border-b border-[#ECE6DF] text-center py-[10px]">
        <p className="text-[10px] tracking-[0.18em] uppercase text-[#3A3734] font-medium">
          {lang==="zh" ? "官網限定｜滿 HK$800 免費送貨 · 首購滿 HK$1,500 輸入 NEWCS12 享 15% OFF" : "ONLINE EXCLUSIVE | FREE SHIPPING OVER HK$800 · 15% OFF FIRST ORDER CODE NEWCS12"}
        </p>
      </div>
      <header className="sticky top-0 z-50 bg-[rgba(253,251,248,0.92)] backdrop-blur-[14px] border-b border-[#ECE6DF]">
        <div className="h-[74px] flex items-center">
          <div className="w-[min(calc(100%-48px),1440px)] mx-auto flex items-center justify-between relative h-full">
            <button className="md:hidden w-8 h-8 flex flex-col justify-center gap-[6px]" onClick={()=>setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={18}/> : <><i className="block h-[1px] w-[22px] bg-black"></i><i className="block h-[1px] w-[16px] bg-black"></i></>}
            </button>
            <Link to="/" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center leading-none">
              <span className="font-serif text-[34px] tracking-[0.18em] font-medium">CS12</span>
              <span className="text-[8px] tracking-[0.22em] uppercase text-[#8F8881] font-semibold mt-[3px]">Skin Experts</span>
            </Link>
            <div className="flex items-center gap-6 ml-auto">
              {/* Search toggle */}
              <button onClick={()=>setSearchOpen(!searchOpen)} className="hidden md:flex items-center text-[#8F8881] hover:text-[#111] transition">
                <Search size={16}/>
              </button>
              <div className="hidden md:flex items-center gap-[6px] text-[10px] text-[#BBB5AD]">
                <button onClick={()=>setLang("zh")} className={`${lang==="zh"?"text-black font-bold":""}`}>繁</button>
                <span className="opacity-35">/</span>
                <button onClick={()=>setLang("en")} className={`${lang==="en"?"text-black font-bold":""}`}>EN</button>
              </div>
              <div className="flex items-center gap-1 text-[10px]">
                <button onClick={()=>setCurrency("HKD")} className={`px-2 py-1 border ${currency==="HKD"?"border-black":"border-transparent text-[#8F8881]"}`}>HKD</button>
                <button onClick={()=>setCurrency("USD")} className={`px-2 py-1 border ${currency==="USD"?"border-black":"border-transparent text-[#8F8881]"}`}>USD</button>
              </div>
              <Link to={user?"/account":"/login"} className="hidden md:flex items-center gap-1 text-[10px] tracking-[0.18em] uppercase"><User size={14}/> {user? (lang==="zh"? "帳戶":"Account") : (lang==="zh"?"登入":"Login")}</Link>
              <button onClick={()=>setMiniCartOpen(true)} className="relative flex items-center">
                <ShoppingBag size={18}/>
                {count>0 && <span className={`absolute -top-2 -right-2 bg-black text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center ${badgePop?"badge-pop":""}`}>{count}</span>}
              </button>
            </div>
          </div>
        </div>
        <nav className={`border-t border-[#F2ECE4] ${mobileOpen?"block":"hidden md:block"}`}>
          <div className="w-[min(calc(100%-48px),1440px)] mx-auto flex md:justify-center gap-8 py-4 flex-col md:flex-row text-[10.5px] tracking-[0.18em] uppercase font-medium text-[#3A3734]">
            <Link to="/exclusive" onClick={()=>setMobileOpen(false)}>{lang==="zh"?"官網限定":"Exclusive"}</Link>
            <Link to="/shop" onClick={()=>setMobileOpen(false)}>{lang==="zh"?"暢銷產品":"Bestsellers"}</Link>
            <Link to="/shop?series=CalmEX" onClick={()=>setMobileOpen(false)}>CalmEX</Link>
            <Link to="/shop?series=SoCalm" onClick={()=>setMobileOpen(false)}>SoCalm</Link>
            <Link to="/shop?series=CellRevEX" onClick={()=>setMobileOpen(false)}>CellRevEX</Link>
            <Link to="/shop?cat=面膜">{lang==="zh"?"面膜":"Masks"}</Link>
            <Link to="/shop?cat=安瓶">{lang==="zh"?"安瓶":"Ampoule"}</Link>
            <Link to="/account">{lang==="zh"?"會員中心":"Membership"}</Link>
            {user?.role==="admin" && <Link to="/admin" className="text-[#825F59]">Admin</Link>}
            {user && <button onClick={()=>{logout(); nav("/")}} className="text-left md:hidden opacity-60">{lang==="zh"?"登出":"Logout"}</button>}
          </div>
        </nav>
        {/* Search bar panel */}
        {searchOpen && (
          <div className="border-t border-[#F2ECE4] bg-[#FDFBF8] slide-down">
            <form onSubmit={handleSearch} className="w-[min(calc(100%-48px),1440px)] mx-auto py-4 flex gap-3">
              <input
                autoFocus
                value={searchQuery}
                onChange={e=>setSearchQuery(e.target.value)}
                placeholder={lang==="zh"?"搜尋產品名稱、系列、類別...":"Search products, series, categories..."}
                className="flex-1 border border-[#ECE6DF] h-10 px-4 text-[13px] bg-white outline-none focus:border-[#111] transition"
              />
              <button type="submit" className="bg-[#111] text-white px-6 h-10 text-[10px] tracking-[0.18em] uppercase">{lang==="zh"?"搜尋":"Search"}</button>
              <button type="button" onClick={()=>setSearchOpen(false)} className="border border-[#ECE6DF] px-4 h-10 text-[10px] text-[#8F8881]">{lang==="zh"?"取消":"Cancel"}</button>
            </form>
          </div>
        )}
      </header>
      <MiniCart isOpen={miniCartOpen} onClose={()=>setMiniCartOpen(false)} />
    </>
  )
}
