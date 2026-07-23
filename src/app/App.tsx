import { HashRouter, Routes, Route } from "react-router-dom"
import { Component, type ErrorInfo, type ReactNode, useEffect } from "react"
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

let dbInitialized = false

function ensureDBSync() {
  if (dbInitialized) return
  if (typeof window !== "undefined") {
    const db = initLocalDB()
    setDBClient(db as any)
    dbInitialized = true
  }
}

ensureDBSync()

interface ErrorBoundaryState {
  error: Error | null
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Unhandled app error", error, errorInfo)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#FDFBF8] text-[#111] flex items-center justify-center px-6">
          <div className="max-w-xl rounded-2xl border border-[#D8C6A6] bg-white/80 p-8 text-center shadow-sm">
            <p className="font-serif text-3xl mb-4">Something went wrong</p>
            <p className="text-sm text-neutral-700 mb-6">
              The page could not finish loading. Please refresh, or try again in a few moments.
            </p>
            <pre className="whitespace-pre-wrap rounded bg-neutral-100 p-4 text-left text-xs text-neutral-700 overflow-auto">
              {this.state.error.message}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function AppShell() {
  const fetchMe = useAuthStore(s=>s.fetchMe)
  const lang = useAppStore(s=>s.lang)
  useEffect(()=>{
    ensureDBSync()
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
    <ErrorBoundary>
      {/* HashRouter = works on GitHub Pages + Cloudflare Pages without server config */}
      {/* No 404 on refresh unlike BrowserRouter */}
      <HashRouter>
        <AppShell />
      </HashRouter>
    </ErrorBoundary>
  )
}
