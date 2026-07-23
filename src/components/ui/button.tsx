import React from "react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...c: any[]) { return twMerge(clsx(c)) }

export function Button({ className, variant="primary", size="default", ...props }: any) {
  const base = "inline-flex items-center justify-center font-medium tracking-[0.18em] uppercase text-[11px] transition-all duration-300"
  const variants: any = {
    primary: "bg-[#9E7428] text-white hover:bg-[#8F6824] hover:-translate-y-[1px] min-h-[46px] px-8 border border-[#9E7428]",
    ghost: "bg-transparent border border-[#9E7428] text-[#9E7428] hover:bg-[#9E7428] hover:text-white min-h-[46px] px-8",
    soft: "bg-[#F7F3EB] text-[#9E7428] hover:bg-[#EFE8DA] min-h-[42px] px-6"
  }
  const sizes: any = { default: "", sm: "min-h-[36px] px-5 text-[10px]", lg: "min-h-[54px] px-10 text-[12px]" }
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />
}
