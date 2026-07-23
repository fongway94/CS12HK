import { useEffect, useState, useCallback } from "react"
import { X, CheckCircle, ShoppingCart, AlertCircle, Info } from "lucide-react"

export type ToastType = "success" | "cart" | "error" | "info"

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
  duration?: number
}

// Global toast state
let _toasts: ToastMessage[] = []
let _listeners: Array<(toasts: ToastMessage[]) => void> = []

function notify() {
  for (const l of _listeners) l([..._toasts])
}

export function showToast(type: ToastType, message: string, duration = 3000) {
  const id = "t_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6)
  const toast: ToastMessage = { id, type, message, duration }
  _toasts = [..._toasts, toast]
  notify()
  if (duration > 0) {
    setTimeout(() => {
      _toasts = _toasts.filter(t => t.id !== id)
      notify()
    }, duration)
  }
}

export function dismissToast(id: string) {
  _toasts = _toasts.filter(t => t.id !== id)
  notify()
}

const iconMap = {
  success: <CheckCircle size={16} className="text-green-600" />,
  cart: <ShoppingCart size={16} className="text-[#111]" />,
  error: <AlertCircle size={16} className="text-red-600" />,
  info: <Info size={16} className="text-blue-600" />,
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    _listeners.push(setToasts)
    return () => { _listeners = _listeners.filter(l => l !== setToasts) }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 380 }}>
      {toasts.map(t => (
        <div
          key={t.id}
          className="pointer-events-auto bg-white border border-[#ECE6DF] shadow-lg rounded-sm px-4 py-3 flex items-start gap-3 animate-[slideInRight_0.3s_ease-out]"
          style={{ animationFillMode: "both" }}
        >
          <span className="mt-[2px] shrink-0">{iconMap[t.type]}</span>
          <p className="flex-1 text-[13px] text-[#3A3734] leading-snug">{t.message}</p>
          <button onClick={() => dismissToast(t.id)} className="shrink-0 text-[#BBB5AD] hover:text-[#111] transition mt-[1px]">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
