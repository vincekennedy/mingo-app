import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

/**
 * Simple toast host for replacing window.alert in App flows.
 * @returns {{ showToast: (message: string, opts?: { variant?: 'error'|'success'|'info' }) => void, ToastHost: () => import('react').ReactNode }}
 */
export function useToast() {
  const [toast, setToast] = useState(null)
  const timerRef = useRef(null)

  const clearToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setToast(null)
  }, [])

  const showToast = useCallback(
    (message, opts = {}) => {
      const variant = opts.variant || 'error'
      if (timerRef.current) clearTimeout(timerRef.current)
      setToast({ message: String(message), variant })
      timerRef.current = setTimeout(() => {
        setToast(null)
        timerRef.current = null
      }, opts.durationMs ?? 4500)
    },
    []
  )

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const ToastHost = useCallback(() => {
    if (!toast) return null
    const bg =
      toast.variant === 'success'
        ? 'bg-emerald-600'
        : toast.variant === 'info'
          ? 'bg-slate-800'
          : 'bg-red-600'
    return (
      <div
        className="fixed bottom-20 left-1/2 z-[80] w-[min(92vw,28rem)] -translate-x-1/2 px-4"
        role="status"
        aria-live="polite"
      >
        <div className={`${bg} text-white rounded-xl shadow-2xl px-4 py-3 flex items-start gap-3`}>
          <p className="flex-1 text-sm sm:text-base font-medium whitespace-pre-wrap">{toast.message}</p>
          <button
            type="button"
            onClick={clearToast}
            className="p-1 rounded-lg hover:bg-white/15 flex-shrink-0"
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    )
  }, [toast, clearToast])

  return { showToast, ToastHost }
}
