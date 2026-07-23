import { useEffect, useState, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { getDBClient } from "../../lib/db/client"
import { Product } from "../../lib/db/types"
import { ProductCard } from "../../components/product/ProductCard"
import { useAppStore } from "../../stores/useAppStore"

export function ShopPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [params, setParams] = useSearchParams()
  const { lang } = useAppStore()

  const series = params.get("series")
  const cat = params.get("cat")
  const skin = params.get("skin")
  const q = params.get("q") || ""
  const sort = params.get("sort") || "popular"

  useEffect(()=>{ getDBClient().getProducts().then(setProducts) },[])

  const filtered = useMemo(()=>{
    let list = [...products]
    if (series) list = list.filter(p=>p.series===series)
    if (cat) list = list.filter(p=>p.category.includes(cat) || p.tags.includes(cat))
    if (skin) list = list.filter(p=>p.skinType.includes(skin))
    if (q) list = list.filter(p=> (p.name_zh+p.name_en).toLowerCase().includes(q.toLowerCase()))
    if (sort==="price_low") list.sort((a,b)=>a.price_hkd-b.price_hkd)
    if (sort==="price_high") list.sort((a,b)=>b.price_hkd-a.price_hkd)
    if (sort==="newest") list.sort((a,b)=> new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime())
    if (sort==="rating") list.sort((a,b)=> b.rating - a.rating)
    return list
  }, [products, series, cat, skin, q, sort])

  return (
    <main className="w-[min(calc(100%-24px),1440px)] mx-auto py-6 md:py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="font-serif text-[40px] leading-[1]">{series||cat||skin|| (lang==="zh"?"選購":"Shop")}</h1>
          <p className="text-[12px] text-[#8F8881] mt-2">{filtered.length} {lang==="zh"?"件產品":"products"} • {series?`Series ${series}`:"All collections"}</p>
        </div>
        <div className="flex gap-2 items-center">
          <select value={sort} onChange={e=>{ params.set("sort", e.target.value); setParams(params)}} className="border border-[#ECE6DF] h-9 px-3 text-[12px]">
            <option value="popular">{lang==="zh"?"預設排序：熱銷度":"Sort: Popular"}</option>
            <option value="rating">{lang==="zh"?"依平均評分":"By Rating"}</option>
            <option value="newest">{lang==="zh"?"最新":"Newest"}</option>
            <option value="price_low">{lang==="zh"?"價格：低至高":"Price: Low to High"}</option>
            <option value="price_high">{lang==="zh"?"價格：高至低":"Price: High to Low"}</option>
          </select>
          <input value={q} onChange={e=>{ if(e.target.value) params.set("q", e.target.value); else params.delete("q"); setParams(params)}} placeholder={lang==="zh"?"搜尋關鍵字":"Search"} className="border border-[#ECE6DF] h-9 px-3 text-[12px] w-[180px]"/>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8">
        <aside className="hidden md:block space-y-8">
          <div>
            <h4 className="text-[10px] tracking-[0.18em] uppercase font-semibold mb-3">系列 Series</h4>
            <ul className="space-y-2 text-[13px]">
              <li><button onClick={()=>{params.delete("series"); setParams(params)}} className={!series?"font-semibold":"text-[#5C5651]"}>全部 All</button></li>
              <li><button onClick={()=>{params.set("series","CalmEX"); setParams(params)}} className={series==="CalmEX"?"font-semibold":"text-[#5C5651]"}>#CalmEX</button></li>
              <li><button onClick={()=>{params.set("series","SoCalm"); setParams(params)}} className={series==="SoCalm"?"font-semibold":"text-[#5C5651]"}>#SoCalm</button></li>
              <li><button onClick={()=>{params.set("series","CellRevEX"); setParams(params)}} className={series==="CellRevEX"?"font-semibold":"text-[#5C5651]"}>#CellRevEX</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] tracking-[0.18em] uppercase font-semibold mb-3">面部護理 Facial</h4>
            <ul className="space-y-2 text-[12px] text-[#5C5651]">
              {["面膜","安瓶","微精華","精華","面霜","防曬","緊緻拉提","煥亮美白"].map(c=>
                <li key={c}><button onClick={()=>{params.set("cat",c); setParams(params)}} className={`${cat===c?"text-black font-semibold":""}`}>{c}</button></li>
              )}
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] tracking-[0.18em] uppercase font-semibold mb-3">肌膚類別 Skin Type</h4>
            <ul className="space-y-2 text-[12px] text-[#5C5651]">
              {["敏感肌","泛紅/玫瑰痤瘡","乾性肌","油性/痘痘/暗瘡","成熟肌","暗沉/不均勻膚色"].map(s=>
                <li key={s}><button onClick={()=>{params.set("skin",s); setParams(params)}} className={`${skin===s?"text-black font-semibold":""}`}>{s}</button></li>
              )}
            </ul>
          </div>
          <div className="border border-[#ECE6DF] p-4 bg-[#FBF6F0] text-[11px] leading-relaxed">
            <p className="font-semibold mb-2">官網禮遇</p>
            <p>• 滿 $800 免運費<br/>• 首購 NEWCS12 享 15% OFF<br/>• 每 $1 = 1 積分</p>
          </div>
        </aside>
        <section>
          {filtered.length===0 ? <p className="py-20 text-center text-[#8F8881]">No products found. / 未找到產品</p> :
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {filtered.map(p=><ProductCard key={p.id} product={p}/>)}
            </div>
          }
        </section>
      </div>
    </main>
  )
}
