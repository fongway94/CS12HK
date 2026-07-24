import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuthStore } from "../../stores/useAuthStore"
import { useAppStore } from "../../stores/useAppStore"
import { showToast } from "../../components/ui/Toast"
import { getDBClient } from "../../lib/db/client"

export function LoginPage() {
  const [email,setEmail]=useState("")
  const [password,setPassword]=useState("")
  const [error,setError]=useState("")
  const [showForgot,setShowForgot]=useState(false)
  const [forgotEmail,setForgotEmail]=useState("")
  const [forgotMsg,setForgotMsg]=useState("")
  const { login, isLoading } = useAuthStore()
  const { lang } = useAppStore()
  const nav = useNavigate()
  const searchParams = new URLSearchParams(window.location.search)
  const next = searchParams.get("next")

  const submit = async (e:any)=>{
    e.preventDefault()
    setError("")
    const res = await login(email,password)
    if(res.success) {
      showToast("success", lang==="zh"?"登入成功！":"Login successful!")
      // Redirect back to checkout if user came from there
      if (next === "checkout") {
        nav("/checkout")
      } else {
        nav("/account")
      }
    }
    else setError(res.error||"Failed")
  }

  const handleForgotPassword = async () => {
    if (!forgotEmail) return
    const db = getDBClient()
    const user = await db.getUserByEmail(forgotEmail)
    if (user) {
      setForgotMsg(lang==="zh"?`已找到帳號 ${user.email}。此為演示模式，請使用原始密碼登入。密碼重設功能即將推出。`:`Account ${user.email} found. This is a demo - please use your original password. Password reset coming soon.`)
    } else {
      setForgotMsg(lang==="zh"?"找不到此電郵的帳號":"No account found with this email")
    }
  }

  if (showForgot) {
    return (
      <main className="w-[min(480px,calc(100%-24px))] mx-auto py-16">
        <h1 className="font-serif text-[36px] text-center mb-2">{lang==="zh"?"重設密碼":"Reset Password"}</h1>
        <p className="text-center text-[12px] text-[#8F8881] mb-8">{lang==="zh"?"輸入您的電郵地址":"Enter your email address"}</p>
        <div className="space-y-4 bg-white border border-[#ECE6DF] p-8">
          <div><label className="text-[11px] uppercase tracking-[0.14em]">Email *</label><input type="email" value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} className="mt-1 w-full border border-[#ECE6DF] h-11 px-3 text-[13px]" required/></div>
          <button onClick={handleForgotPassword} className="w-full bg-[var(--brand-accent)] text-white h-[46px] text-[11px] tracking-[0.18em] uppercase">{lang==="zh"?"查找帳號":"Find Account"}</button>
          {forgotMsg && <div className="bg-[#FBF6F0] border border-[#ECE6DF] p-4 text-[12px] text-[#3A3734]">{forgotMsg}</div>}
          <button onClick={()=>{setShowForgot(false); setForgotMsg(""); setForgotEmail("")}} className="w-full text-center text-[11px] underline text-[#8F8881]">{lang==="zh"?"返回登入":"Back to Login"}</button>
        </div>
      </main>
    )
  }

  return (
    <main className="w-[min(480px,calc(100%-24px))] mx-auto py-16">
      <h1 className="font-serif text-[36px] text-center mb-2">{lang==="zh"?"登入":"Login"}</h1>
      <p className="text-center text-[12px] text-[#8F8881] mb-8">{lang==="zh"?"歡迎回來！請登入您的帳戶":"Welcome back! Please sign in"}</p>
      <form onSubmit={submit} className="space-y-4 bg-white border border-[#ECE6DF] p-8">
        <div><label className="text-[11px] uppercase tracking-[0.14em]">Email *</label><input value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full border border-[#ECE6DF] h-11 px-3 text-[13px]" required/></div>
        <div><label className="text-[11px] uppercase tracking-[0.14em]">{lang==="zh"?"密碼":"Password"} *</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full border border-[#ECE6DF] h-11 px-3 text-[13px]" required/></div>
        <button disabled={isLoading} className="w-full bg-[var(--brand-accent)] text-white h-[46px] text-[11px] tracking-[0.18em] uppercase disabled:opacity-50">{isLoading?"...": (lang==="zh"?"登入":"Login")}</button>
        {error && <p className="text-red-600 text-[12px]">⚠ {error}</p>}
        <div className="flex justify-between text-[11px] text-[#8F8881]">
          <Link to="/register" className="underline">{lang==="zh"?"還沒有帳號？註冊":"No account? Register"}</Link>
          <button type="button" onClick={()=>setShowForgot(true)} className="underline">{lang==="zh"?"忘記密碼？":"Forgot Password?"}</button>
        </div>
        <div className="pt-4 border-t border-[#F2ECE4]">
          <button type="button" onClick={()=>showToast("info", lang==="zh"?"Facebook 登入即將推出":"Facebook login coming soon")} className="w-full border border-[#1877F2] text-[#1877F2] h-[42px] text-[11px] tracking-[0.14em] uppercase hover:bg-[#1877F2]/5 transition">Connect with Facebook</button>
        </div>
        <div className="bg-[#FBF6F0] border border-[#ECE6DF] p-3 text-[10px] text-[#8F8881]">
          <p className="font-semibold text-[11px] text-[#3A3734] mb-1">Demo Accounts:</p>
          <p>Admin: admin@cs12skincare.com.hk / admin123</p>
          <p className="mt-1">Customer: test@cs12skincare.com.hk / test123</p>
          <p className="mt-1">Or <Link to="/register" className="underline text-[#825F59]">register</Link> a new account</p>
        </div>
      </form>
    </main>
  )
}

export function RegisterPage() {
  const [firstName,setFirstName]=useState("")
  const [lastName,setLastName]=useState("")
  const [email,setEmail]=useState("")
  const [password,setPassword]=useState("")
  const [confirmPassword,setConfirmPassword]=useState("")
  const [birthday,setBirthday]=useState("")
  const [newsletter,setNewsletter]=useState(true)
  const [error,setError]=useState("")
  const { register, isLoading } = useAuthStore()
  const { lang } = useAppStore()
  const nav = useNavigate()

  const submit = async (e:any)=>{
    e.preventDefault()
    setError("")
    if (password.length < 6) {
      setError(lang==="zh"?"密碼至少需要6個字符":"Password must be at least 6 characters")
      return
    }
    if (password !== confirmPassword) {
      setError(lang==="zh"?"密碼不一致":"Passwords do not match")
      return
    }
    const res = await register({ email, password, firstName, lastName, birthday: birthday||undefined, newsletter })
    if(res.success) {
      showToast("success", lang==="zh"?"註冊成功！歡迎加入CS12":"Welcome to CS12! Registration successful.")
      nav("/account")
    }
    else setError(res.error||"Failed")
  }

  return (
    <main className="w-[min(480px,calc(100%-24px))] mx-auto py-16">
      <h1 className="font-serif text-[36px] text-center mb-2">{lang==="zh"?"註冊":"Register"}</h1>
      <p className="text-center text-[12px] text-[#8F8881] mb-8">{lang==="zh"?"建立您的CS12帳戶":"Create your CS12 account"}</p>
      <form onSubmit={submit} className="space-y-4 bg-white border border-[#ECE6DF] p-8">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-[11px] uppercase tracking-[0.14em]">{lang==="zh"?"名字":"First Name"} *</label><input value={firstName} onChange={e=>setFirstName(e.target.value)} className="mt-1 w-full border border-[#ECE6DF] h-11 px-3" required/></div>
          <div><label className="text-[11px] uppercase tracking-[0.14em]">{lang==="zh"?"姓氏":"Last Name"} *</label><input value={lastName} onChange={e=>setLastName(e.target.value)} className="mt-1 w-full border border-[#ECE6DF] h-11 px-3" required/></div>
        </div>
        <div><label className="text-[11px] uppercase tracking-[0.14em]">{lang==="zh"?"電子郵件":"Email"} *</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full border border-[#ECE6DF] h-11 px-3" required/></div>
        <div><label className="text-[11px] uppercase tracking-[0.14em]">{lang==="zh"?"密碼":"Password"} *</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full border border-[#ECE6DF] h-11 px-3" required minLength={6}/><p className="text-[10px] text-[#8F8881] mt-1">{lang==="zh"?"至少6個字符":"At least 6 characters"}</p></div>
        <div><label className="text-[11px] uppercase tracking-[0.14em]">{lang==="zh"?"確認密碼":"Confirm Password"} *</label><input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="mt-1 w-full border border-[#ECE6DF] h-11 px-3" required/></div>
        <div><label className="text-[11px] uppercase tracking-[0.14em]">{lang==="zh"?"生日日期 (選填) - 生日禮遇":"Birthday (optional) - Birthday Rewards"}</label><input type="date" value={birthday} onChange={e=>setBirthday(e.target.value)} className="mt-1 w-full border border-[#ECE6DF] h-11 px-3"/></div>
        <label className="flex gap-2 items-start text-[12px] cursor-pointer"><input type="checkbox" checked={newsletter} onChange={e=>setNewsletter(e.target.checked)} className="mt-[3px] accent-[var(--brand-accent)]"/><span>{lang==="zh"?"訂閱我們的電子報":"Subscribe newsletter"} - {lang==="zh"?"生日月份享額外優惠":"Birthday special offers"}</span></label>
        <p className="text-[10px] text-[#8F8881]">{lang==="zh"?"您的個人資料將用於提升體驗、管理帳戶及隱私政策所述用途。註冊即表示您同意我們的服務條款。":"Your personal data will be used to improve your experience, manage your account, and for purposes described in our privacy policy. By registering, you agree to our terms of service."}</p>
        <button disabled={isLoading} className="w-full bg-[var(--brand-accent)] text-white h-[46px] text-[11px] tracking-[0.18em] uppercase disabled:opacity-50">{isLoading?"...":(lang==="zh"?"註冊":"Register")}</button>
        {error && <p className="text-red-600 text-[12px]">⚠ {error}</p>}
        <Link to="/login" className="block text-center text-[11px] underline text-[#8F8881]">{lang==="zh"?"已有帳號？登入":"Have account? Login"}</Link>
      </form>
    </main>
  )
}
