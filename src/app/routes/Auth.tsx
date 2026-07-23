import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuthStore } from "../../stores/useAuthStore"
import { useAppStore } from "../../stores/useAppStore"

export function LoginPage() {
  const [email,setEmail]=useState("")
  const [password,setPassword]=useState("")
  const [error,setError]=useState("")
  const { login, isLoading } = useAuthStore()
  const { lang } = useAppStore()
  const nav = useNavigate()

  const submit = async (e:any)=>{
    e.preventDefault()
    setError("")
    const res = await login(email,password)
    if(res.success) nav("/account")
    else setError(res.error||"Failed")
  }

  return (
    <main className="w-[min(480px,calc(100%-48px))] mx-auto py-16">
      <h1 className="font-serif text-[36px] text-center mb-2">{lang==="zh"?"登入":"Login"}</h1>
      <p className="text-center text-[12px] text-[#8F8881] mb-8">{lang==="zh"?"使用者名稱或電子郵件 *必填":"Username or Email required"}</p>
      <form onSubmit={submit} className="space-y-4 bg-white border border-[#ECE6DF] p-8">
        <div><label className="text-[11px] uppercase tracking-[0.14em]">Email *</label><input value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full border border-[#ECE6DF] h-11 px-3 text-[13px]" required/></div>
        <div><label className="text-[11px] uppercase tracking-[0.14em]">密碼 Password *</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full border border-[#ECE6DF] h-11 px-3 text-[13px]" required/></div>
        <button disabled={isLoading} className="w-full bg-[#111] text-white h-[46px] text-[11px] tracking-[0.18em] uppercase">{isLoading?"...": (lang==="zh"?"登入":"Login")}</button>
        {error && <p className="text-red-600 text-[12px]">{error}</p>}
        <div className="flex justify-between text-[11px] text-[#8F8881]">
          <Link to="/register" className="underline">{lang==="zh"?"還沒有帳號？註冊":"No account? Register"}</Link>
          <span className="cursor-pointer underline">{lang==="zh"?"忘記密碼？":"Forgot?"}</span>
        </div>
        <div className="pt-4 border-t border-[#F2ECE4]">
          <button type="button" className="w-full border border-[#1877F2] text-[#1877F2] h-[42px] text-[11px] tracking-[0.14em] uppercase">Connect with Facebook</button>
        </div>
        <p className="text-[10px] text-[#BBB5AD]">Demo admin: admin@cs12skincare.com.hk / admin123</p>
      </form>
    </main>
  )
}

export function RegisterPage() {
  const [email,setEmail]=useState("")
  const [password,setPassword]=useState("")
  const [birthday,setBirthday]=useState("")
  const [newsletter,setNewsletter]=useState(true)
  const [error,setError]=useState("")
  const { register, isLoading } = useAuthStore()
  const { lang } = useAppStore()
  const nav = useNavigate()

  const submit = async (e:any)=>{
    e.preventDefault()
    setError("")
    const res = await register({ email, password, birthday: birthday||undefined, newsletter })
    if(res.success) nav("/account")
    else setError(res.error||"Failed")
  }

  return (
    <main className="w-[min(480px,calc(100%-48px))] mx-auto py-16">
      <h1 className="font-serif text-[36px] text-center mb-2">{lang==="zh"?"註冊":"Register"}</h1>
      <form onSubmit={submit} className="space-y-4 bg-white border border-[#ECE6DF] p-8">
        <div><label className="text-[11px] uppercase tracking-[0.14em]">電子郵件 *</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full border border-[#ECE6DF] h-11 px-3" required/></div>
        <div><label className="text-[11px] uppercase tracking-[0.14em]">密碼 *</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full border border-[#ECE6DF] h-11 px-3" required/></div>
        <div><label className="text-[11px] uppercase tracking-[0.14em]">生日日期 (選填) - 生日禮遇</label><input type="date" value={birthday} onChange={e=>setBirthday(e.target.value)} className="mt-1 w-full border border-[#ECE6DF] h-11 px-3"/></div>
        <label className="flex gap-2 items-start text-[12px]"><input type="checkbox" checked={newsletter} onChange={e=>setNewsletter(e.target.checked)}/><span>{lang==="zh"?"訂閱我們的電子報":"Subscribe newsletter"} - {lang==="zh"?"生日月份享額外優惠":"Birthday special offers"}</span></label>
        <p className="text-[10px] text-[#8F8881]">您的個人資料將用於提升體驗、管理帳戶及隱私政策所述用途。</p>
        <button disabled={isLoading} className="w-full bg-[#111] text-white h-[46px] text-[11px] tracking-[0.18em] uppercase">{lang==="zh"?"註冊":"Register"}</button>
        {error && <p className="text-red-600 text-[12px]">{error}</p>}
        <Link to="/login" className="block text-center text-[11px] underline text-[#8F8881]">{lang==="zh"?"已有帳號？登入":"Have account? Login"}</Link>
      </form>
    </main>
  )
}
