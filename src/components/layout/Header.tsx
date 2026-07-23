import { Link, useNavigate } from "react-router-dom"
import { useCartStore } from "../../stores/useCartStore"
import { useAppStore } from "../../stores/useAppStore"
import { useAuthStore } from "../../stores/useAuthStore"
import { useWishlistStore } from "../../stores/useWishlistStore"
import { useThemeStore } from "../../stores/useThemeStore"
import { ShoppingBag, User, X, Search, ChevronDown, Menu, Heart } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { MiniCart } from "../cart/MiniCart"

interface SubMenuItem {
  label_zh: string
  label_en: string
  path: string
}

interface MenuItem {
  label_zh: string
  label_en: string
  path?: string
  children?: SubMenuItem[]
}

export function Header() {
  const { items } = useCartStore()
  const { currency, setCurrency, lang, setLang } = useAppStore()
  const { user, logout } = useAuthStore()
  const { items: wishlistItems } = useWishlistStore()
  const { settings } = useThemeStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [miniCartOpen, setMiniCartOpen] = useState(false)
  const [badgePop, setBadgePop] = useState(false)
  
  // Mobile accordion state: stores label of currently expanded menu
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null)
  
  // Desktop active hover/click menu
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const dropdownTimeout = useRef<NodeJS.Timeout | null>(null)

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

  // Handle smooth scroll or navigation for hash links
  const handleNavigation = (path: string) => {
    setMobileOpen(false)
    setActiveDropdown(null)
    
    if (path.startsWith("/#")) {
      const targetId = path.substring(2)
      // Check if we are currently on the Home page
      const isHome = window.location.hash === "#/" || window.location.hash === "" || window.location.pathname === "/"
      
      if (isHome) {
        const element = document.getElementById(targetId)
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      } else {
        nav("/")
        setTimeout(() => {
          const element = document.getElementById(targetId)
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        }, 300)
      }
    } else {
      nav(path)
    }
  }

  const menuItems: MenuItem[] = [
    {
      label_zh: "官網限定",
      label_en: "Exclusive",
      path: "/exclusive"
    },
    {
      label_zh: "選購",
      label_en: "Shop",
      path: "/shop",
      children: [
        { label_zh: "第一次接觸CS12?", label_en: "About CS12", path: "/#about-section" },
        { label_zh: "暢銷產品", label_en: "Bestsellers", path: "/shop?cat=暢銷產品" },
        { label_zh: "奇蹟面膜", label_en: "Miracle Mask", path: "/product/cs12-miracle-mask-zh" },
        { label_zh: "旅遊必備", label_en: "Travel Essentials", path: "/shop?cat=旅遊必備" },
        { label_zh: "CS12 體驗裝", label_en: "CS12 Trial Kit", path: "/shop?cat=體驗裝" }
      ]
    },
    {
      label_zh: "系列",
      label_en: "Series",
      path: "/shop",
      children: [
        { label_zh: "#CalmEX 系列", label_en: "#CalmEX Series", path: "/shop?series=CalmEX" },
        { label_zh: "#SoCalm 系列", label_en: "#SoCalm Series", path: "/shop?series=SoCalm" },
        { label_zh: "#CellRevEX 系列", label_en: "#CellRevEX Series", path: "/shop?series=CellRevEX" }
      ]
    },
    {
      label_zh: "面部護理",
      label_en: "Facial Care",
      path: "/shop",
      children: [
        { label_zh: "面膜", label_en: "Masks", path: "/shop?cat=面膜" },
        { label_zh: "安瓶", label_en: "Ampoules", path: "/shop?cat=安瓶" },
        { label_zh: "微精華", label_en: "Micro Essence", path: "/shop?cat=微精華" },
        { label_zh: "精華", label_en: "Essence", path: "/shop?cat=精華" },
        { label_zh: "面霜", label_en: "Creams", path: "/shop?cat=面霜" },
        { label_zh: "緊緻拉提", label_en: "Firming & Lifting", path: "/shop?cat=緊緻拉提" },
        { label_zh: "煥亮美白", label_en: "Brightening & Whitening", path: "/shop?cat=煥亮美白" },
        { label_zh: "防曬", label_en: "Sun Protect", path: "/shop?cat=防曬" },
        { label_zh: "去角質", label_en: "Exfoliating", path: "/shop?cat=去角質" },
        { label_zh: "卸妝潔面", label_en: "Cleansing", path: "/shop?cat=卸妝潔面" }
      ]
    },
    {
      label_zh: "肌膚類別",
      label_en: "Skin Type",
      path: "/shop",
      children: [
        { label_zh: "敏感肌", label_en: "Sensitive Skin", path: "/shop?skin=敏感肌" },
        { label_zh: "泛紅 / 玫瑰痤瘡", label_en: "Redness / Rosacea", path: "/shop?skin=泛紅/玫瑰痤瘡" },
        { label_zh: "乾性肌", label_en: "Dry Skin", path: "/shop?skin=乾性肌" },
        { label_zh: "油性 / 痘痘 / 暗瘡", label_en: "Oily / Acne Prone", path: "/shop?skin=油性/痘痘/暗瘡" },
        { label_zh: "成熟肌", label_en: "Mature Skin", path: "/shop?skin=成熟肌" },
        { label_zh: "暗沉 / 不均勻膚色", label_en: "Dullness / Uneven Tone", path: "/shop?skin=暗沉/不均勻膚色" }
      ]
    },
    {
      label_zh: "敏感肌須知",
      label_en: "Skin Tips",
      path: "/#sensitive-skin-tips"
    }
  ]

  const handleMouseEnter = (label: string) => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current)
    setActiveDropdown(label)
  }

  const handleMouseLeave = () => {
    dropdownTimeout.current = setTimeout(() => {
      setActiveDropdown(null)
    }, 150)
  }

  const toggleMobileExpanded = (label: string) => {
    if (mobileExpanded === label) {
      setMobileExpanded(null)
    } else {
      setMobileExpanded(label)
    }
  }

  return (
    <>
      {/* Top Campaign Announcement Bar */}
      {settings.announcementBarActive && (
        <div className="bg-gradient-to-r from-[#F4ECE1] via-[#F7F3EB] to-[#F0E8D8] border-b border-[#ECE6DF] text-center py-[10px] px-4 transition-all duration-300">
          <p className="text-[10px] sm:text-[11px] tracking-[0.18em] uppercase text-[#3A3734] font-medium leading-relaxed">
            {lang === "zh" ? settings.announcementBar_zh : settings.announcementBar_en}
          </p>
        </div>
      )}

      <header className="sticky top-0 z-50 bg-[rgba(253,251,248,0.95)] backdrop-blur-[16px] border-b border-[#ECE6DF]">
        <div className="h-[74px] flex items-center">
          <div className="w-[min(calc(100%-24px),1440px)] mx-auto flex items-center justify-between relative h-full">
            
            {/* Mobile Menu Hamburger */}
            <button 
              className="md:hidden w-8 h-8 flex flex-col justify-center gap-[6px] focus:outline-none relative z-[51]" 
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle Navigation Menu"
            >
              {mobileOpen ? (
                <X size={20} className="text-black" />
              ) : (
                <>
                  <i className="block h-[1.5px] w-[22px] bg-black rounded-full transition-transform"></i>
                  <i className="block h-[1.5px] w-[16px] bg-black rounded-full transition-transform"></i>
                </>
              )}
            </button>

            {/* Premium Logo */}
            <Link to="/" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center leading-none select-none">
              <span className="font-serif text-[34px] sm:text-[38px] tracking-[0.18em] font-light text-black">CS12</span>
              <span className="text-[7.5px] tracking-[0.24em] uppercase text-[#8F8881] font-semibold mt-[2px]">Skin Experts</span>
            </Link>

            {/* Right Action Icons & Utilities */}
            <div className="flex items-center gap-3 sm:gap-6 ml-auto">
              
              {/* Search Toggle Button */}
              <button 
                onClick={() => setSearchOpen(!searchOpen)} 
                className="hidden md:flex items-center text-[#8F8881] hover:text-[#111] transition duration-250"
                aria-label="Search"
              >
                <Search size={17} />
              </button>

              {/* Language Switcher */}
              <div className="hidden md:flex items-center gap-[6px] text-[10px] text-[#BBB5AD] select-none font-medium">
                <button 
                  onClick={() => setLang("zh")} 
                  className={`transition-colors hover:text-black ${lang === "zh" ? "text-black font-semibold" : ""}`}
                >
                  繁
                </button>
                <span className="opacity-35 text-[9px]">/</span>
                <button 
                  onClick={() => setLang("en")} 
                  className={`transition-colors hover:text-black ${lang === "en" ? "text-black font-semibold" : ""}`}
                >
                  EN
                </button>
              </div>

              {/* Currency Selector */}
              <div className="flex items-center gap-1 text-[10.5px]">
                <button 
                  onClick={() => setCurrency("HKD")} 
                  className={`px-2 py-1 rounded-[2px] text-[10px] font-medium transition-all duration-200 border ${
                    currency === "HKD" ? "border-black bg-[#111] text-white" : "border-transparent text-[#8F8881] hover:text-[#111]"
                  }`}
                >
                  HKD
                </button>
                <button 
                  onClick={() => setCurrency("USD")} 
                  className={`px-2 py-1 rounded-[2px] text-[10px] font-medium transition-all duration-200 border ${
                    currency === "USD" ? "border-black bg-[#111] text-white" : "border-transparent text-[#8F8881] hover:text-[#111]"
                  }`}
                >
                  USD
                </button>
              </div>

              {/* User Account / Profile */}
              <Link 
                to={user ? "/account" : "/login"} 
                className="hidden md:inline-flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase text-[#3A3734] hover:text-black transition duration-200 font-medium"
              >
                <User size={15} /> 
                {user ? (lang === "zh" ? "帳戶" : "Account") : (lang === "zh" ? "登入" : "Login")}
              </Link>

              {/* Wishlist Button */}
              <Link 
                to="/wishlist" 
                className="relative flex items-center p-1.5 text-black hover:scale-105 transition"
                aria-label="Wishlist"
              >
                <Heart size={18} />
                {wishlistItems.length > 0 && (
                  <span className="absolute top-0 right-0 bg-[#825F59] text-white text-[8px] w-[15px] h-[15px] rounded-full flex items-center justify-center font-bold">
                    {wishlistItems.length}
                  </span>
                )}
              </Link>

              {/* Shopping Bag Button */}
              <button 
                onClick={() => setMiniCartOpen(true)} 
                className="relative flex items-center p-1.5 text-black hover:scale-105 transition"
                aria-label="Open Shopping Cart"
              >
                <ShoppingBag size={20} />
                {count > 0 && (
                  <span className={`absolute top-0 right-0 bg-black text-white text-[8px] w-[17px] h-[17px] rounded-full flex items-center justify-center font-bold shadow-md ${badgePop ? "badge-pop" : ""}`}>
                    {count}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Sophisticated Navigation Dropdowns */}
        <nav className="hidden md:block border-t border-[#ECE6DF] relative">
          <div className="w-[min(calc(100%-24px),1440px)] mx-auto flex justify-center gap-10 h-12 items-center text-[11px] tracking-[0.2em] uppercase font-semibold text-[#4A4642]">
            {menuItems.map((item) => {
              const label = lang === "zh" ? item.label_zh : item.label_en
              const hasChildren = !!item.children

              return (
                <div 
                  key={label}
                  className="relative h-full flex items-center group"
                  onMouseEnter={() => hasChildren && handleMouseEnter(label)}
                  onMouseLeave={handleMouseLeave}
                >
                  <button 
                    onClick={() => {
                      if (item.path) handleNavigation(item.path)
                    }}
                    className="flex items-center gap-1 hover:text-black transition duration-200 py-3 text-left focus:outline-none"
                  >
                    <span>{label}</span>
                    {hasChildren && <ChevronDown size={12} className="opacity-60 group-hover:rotate-180 transition-transform duration-300" />}
                  </button>

                  {/* Mega Dropdown Pane */}
                  {hasChildren && activeDropdown === label && (
                    <div className="absolute top-[48px] left-1/2 -translate-x-1/2 w-[240px] bg-white border border-[#ECE6DF] shadow-lg py-3 z-50 animate-fadeIn rounded-[2px]">
                      <div className="flex flex-col">
                        {item.children?.map((sub) => {
                          const subLabel = lang === "zh" ? sub.label_zh : sub.label_en
                          return (
                            <button
                              key={subLabel}
                              onClick={() => handleNavigation(sub.path)}
                              className="px-5 py-2.5 text-left text-[11.5px] tracking-[0.14em] text-[#5C5651] hover:text-black hover:bg-[#FDFBF8] transition duration-200 border-l-[2px] border-transparent hover:border-black font-medium"
                            >
                              {subLabel}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {user?.role === "admin" && (
              <Link 
                to="/admin" 
                className="text-[#825F59] hover:text-red-800 transition duration-200 font-semibold"
              >
                Admin
              </Link>
            )}
          </div>
        </nav>

        {/* Mobile Navigation Drawer / Sidebar */}
        {mobileOpen && (
          <div 
            className="md:hidden fixed inset-0 z-[40]"
            onClick={() => setMobileOpen(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            
            {/* Drawer Panel */}
            <div 
              className="absolute top-0 left-0 bg-[#FDFBF8] w-[85vw] max-w-[360px] h-full shadow-2xl border-r border-[#ECE6DF] overflow-y-auto flex flex-col animate-slideRight z-[41]"
              onClick={(e) => e.stopPropagation()}
              style={{ paddingTop: "128px" }}
            >
              <div className="p-6 flex-1 space-y-5">
                
                {/* Search in Mobile Drawer */}
                <form onSubmit={handleSearch} className="relative flex items-center border border-[#ECE6DF] rounded-[4px] bg-white px-3 py-2">
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={lang === "zh" ? "搜尋關鍵字..." : "Search..."}
                    className="flex-1 text-[12px] bg-transparent outline-none text-[#111]"
                  />
                  <button type="submit" className="text-[#8F8881] hover:text-black">
                    <Search size={15} />
                  </button>
                </form>

                {/* Mobile Navigation Links Accordion */}
                <div className="space-y-1">
                  {menuItems.map((item) => {
                    const label = lang === "zh" ? item.label_zh : item.label_en
                    const hasChildren = !!item.children
                    const isExpanded = mobileExpanded === label

                    return (
                      <div key={label} className="border-b border-[#ECE6DF]/50 pb-2 pt-2">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => {
                              if (hasChildren) {
                                toggleMobileExpanded(label)
                              } else if (item.path) {
                                handleNavigation(item.path)
                              }
                            }}
                            className="text-[13px] tracking-[0.12em] uppercase font-semibold text-[#3A3734] hover:text-black text-left flex-1 py-2"
                          >
                            {label}
                          </button>
                          {hasChildren && (
                            <button 
                              onClick={() => toggleMobileExpanded(label)}
                              className="p-2 focus:outline-none"
                            >
                              <ChevronDown 
                                size={16} 
                                className={`text-[#8F8881] transition-transform duration-300 ${isExpanded ? "rotate-180 text-black" : ""}`} 
                              />
                            </button>
                          )}
                        </div>

                        {/* Accordion Children */}
                        {hasChildren && isExpanded && (
                          <div className="mt-1 pl-4 space-y-1 border-l-2 border-[#EAD8BE] ml-1 pb-2">
                            {item.children?.map((sub) => {
                              const subLabel = lang === "zh" ? sub.label_zh : sub.label_en
                              return (
                                <button
                                  key={subLabel}
                                  onClick={() => handleNavigation(sub.path)}
                                  className="block text-left text-[12px] tracking-[0.08em] text-[#5C5651] hover:text-black w-full py-2 font-medium"
                                >
                                  {subLabel}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Wishlist Link */}
                  <div className="border-b border-[#ECE6DF]/50 pb-2 pt-2">
                    <Link
                      to="/wishlist"
                      onClick={() => setMobileOpen(false)}
                      className="block text-[13px] tracking-[0.12em] uppercase font-semibold text-[#3A3734] hover:text-black py-2"
                    >
                      {lang === "zh" ? "願望清單" : "Wishlist"} {wishlistItems.length > 0 && `(${wishlistItems.length})`}
                    </Link>
                  </div>

                  {/* Account Link in Mobile List */}
                  <div className="border-b border-[#ECE6DF]/50 pb-2 pt-2">
                    <Link
                      to={user ? "/account" : "/login"}
                      onClick={() => setMobileOpen(false)}
                      className="block text-[13px] tracking-[0.12em] uppercase font-semibold text-[#3A3734] hover:text-black py-2"
                    >
                      {user ? (lang === "zh" ? "我的會員帳戶" : "My Account") : (lang === "zh" ? "會員登入 / 註冊" : "Login / Register")}
                    </Link>
                  </div>

                  {user?.role === "admin" && (
                    <div className="border-b border-[#ECE6DF]/50 pb-2 pt-2">
                      <Link
                        to="/admin"
                        onClick={() => setMobileOpen(false)}
                        className="block text-[13px] tracking-[0.12em] uppercase font-semibold text-[#825F59] py-2"
                      >
                        Admin Dashboard
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer Footer Utilities */}
              <div className="p-6 bg-[#FBF6F0] border-t border-[#ECE6DF] space-y-4">
                <div className="flex justify-between items-center text-[11px] text-[#8F8881]">
                  <span>{lang === "zh" ? "選擇語言：" : "Language:"}</span>
                  <div className="flex gap-3">
                    <button onClick={() => { setLang("zh"); setMobileOpen(false) }} className={`${lang === "zh" ? "text-black font-bold underline" : ""}`}>繁體中文</button>
                    <button onClick={() => { setLang("en"); setMobileOpen(false) }} className={`${lang === "en" ? "text-black font-bold underline" : ""}`}>English</button>
                  </div>
                </div>

                {user && (
                  <button 
                    onClick={() => {
                      logout()
                      setMobileOpen(false)
                      nav("/")
                    }} 
                    className="w-full text-center py-2 border border-[#825F59] text-[#825F59] text-[11px] tracking-[0.16em] uppercase font-bold hover:bg-[#825F59] hover:text-white transition duration-200"
                  >
                    {lang === "zh" ? "登出帳戶" : "Log Out"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Search Bar Panel Slider */}
        {searchOpen && (
          <div className="border-t border-[#ECE6DF] bg-[#FDFBF8] transition-all duration-300 shadow-md">
            <form onSubmit={handleSearch} className="w-[min(calc(100%-24px),1440px)] mx-auto py-4 flex gap-3">
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={lang === "zh" ? "搜尋產品名稱、系列、護理功效..." : "Search products, series, facial care..."}
                className="flex-1 border border-[#ECE6DF] h-11 px-4 text-[13px] rounded-[3px] bg-white outline-none focus:border-black transition duration-200"
              />
              <button type="submit" className="bg-[#111] text-white px-6 h-11 text-[11px] tracking-[0.18em] uppercase font-semibold hover:bg-black transition duration-200 rounded-[3px]">{lang === "zh" ? "搜尋" : "Search"}</button>
              <button type="button" onClick={() => setSearchOpen(false)} className="border border-[#ECE6DF] px-4 h-11 text-[11px] text-[#8F8881] hover:text-black transition rounded-[3px]">{lang === "zh" ? "取消" : "Cancel"}</button>
            </form>
          </div>
        )}
      </header>
      <MiniCart isOpen={miniCartOpen} onClose={() => setMiniCartOpen(false)} />
    </>
  )
}
