import { HashRouter, Routes, Route } from "react-router-dom"
import { useEffect } from "react"
import { Header } from "../components/layout/Header"
import { Footer } from "../components/layout/Footer"
import { HomePage } from "./routes/Home"
import { ShopPage } from "./routes/Shop"
import { ProductDetailPage } from "./routes/ProductDetail"
import { ExclusivePage } from "./routes/Exclusive"
import { CartPage } from "./routes/Cart"
import { LoginPage, RegisterPage } from "./routes/Auth"
import { AccountPage } from "./routes/Account"
import { CheckoutPage } from "./routes/Checkout"
import { AdminPage } from "./routes/Admin"
import { initLocalDB } from "../lib/db/localAdapter"
import { setDBClient } from "../lib/db/client"
import { useAuthStore } from "../stores/useAuthStore"
import { useAppStore } from "../stores/useAppStore"

function AppShell() {
  const fetchMe = useAuthStore(s=>s.fetchMe)
  const lang = useAppStore(s=>s.lang)
  useEffect(()=>{
    const db = initLocalDB()
    setDBClient(db as any)
    fetchMe()
    document.body.dataset.lang = lang
  },[])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/product/:slug" element={<ProductDetailPage />} />
          <Route path="/exclusive" element={<ExclusivePage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<div className="py-20 text-center">404 – Not Found<br/><a href="/" className="underline">Go Home</a></div>} />
        </Routes>
      </div>
      <Footer />
      {/* WhatsApp Float */}
      <a href="https://wa.me/85200000000" target="_blank" className="fixed bottom-6 right-6 bg-[#25D366] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition z-50 text-[12px] font-semibold">WA</a>
    </div>
  )
}

export default function App() {
  return (
    // HashRouter = works on GitHub Pages + Cloudflare Pages without server config
    // No 404 on refresh unlike BrowserRouter
    <HashRouter>
      <AppShell />
    </HashRouter>
  )
}
