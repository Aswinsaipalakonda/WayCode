'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { TbBrandWhatsapp, TbCheck, TbLoaderQuarter, TbX, TbShieldCheck } from 'react-icons/tb'
import { toast } from 'sonner'

interface WhatsAppOnboardingModalProps {
  user?: {
    id?: string
    email?: string
  } | null
}

export function openWhatsAppModal() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('waycode:open-whatsapp-modal'))
  }
}

export function WhatsAppOnboardingModal({ user }: WhatsAppOnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [digits, setDigits] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handleOpen = () => setIsOpen(true)
    window.addEventListener('waycode:open-whatsapp-modal', handleOpen)
    return () => {
      window.removeEventListener('waycode:open-whatsapp-modal', handleOpen)
    }
  }, [])

  useEffect(() => {
    if (!user || !user.id || typeof window === 'undefined') return

    let cancelled = false

    fetch('/api/settings/whatsapp')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        const hasNumber = Boolean(data.success && data.whatsappNumber)
        
        // Broadcast the initial resolved state so other components stay in sync
        window.dispatchEvent(
          new CustomEvent('waycode:whatsapp-updated', {
            detail: { whatsappNumber: data.whatsappNumber || null },
          })
        )

        // If the user has not connected WhatsApp, prompt them on login
        if (!hasNumber) {
          const sessionDismissed = sessionStorage.getItem(`waycode_wa_dismissed_${user.id}`)
          if (!sessionDismissed) {
            setIsOpen(true)
          }
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [user])

  const handleDismiss = () => {
    if (user?.id) {
      sessionStorage.setItem(`waycode_wa_dismissed_${user.id}`, 'true')
    }
    setIsOpen(false)
  }

  const handleDigitsChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 10)
    setDigits(cleaned)
  }

  const formattedDisplay = digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (digits.length !== 10) {
      toast.warning('Please enter your 10-digit phone number')
      return
    }

    const fullNumber = `+91${digits}`
    setLoading(true)

    try {
      const res = await fetch('/api/settings/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappNumber: fullNumber }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        if (user?.id) {
          sessionStorage.removeItem(`waycode_wa_dismissed_${user.id}`)
        }
        window.dispatchEvent(
          new CustomEvent('waycode:whatsapp-updated', {
            detail: { whatsappNumber: data.whatsappNumber || fullNumber },
          })
        )
        setIsOpen(false)
        toast.success('WhatsApp alerts connected!', {
          description: `Live preview links will be sent to +91 ${formattedDisplay}`,
        })
      } else {
        toast.error('Could not connect WhatsApp', {
          description: data.error || 'Please enter a valid 10-digit number.',
        })
      }
    } catch {
      toast.error('Network error while connecting WhatsApp')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-6 overflow-y-auto">
          {/* Subtle Dim Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="fixed inset-0 bg-[#0f172a]/50 backdrop-blur-[6px] transition-all"
          />

          {/* Modal Card */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[395px] overflow-hidden rounded-[26px] sm:rounded-[30px] border border-black/[0.08] bg-white p-5 sm:p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)]"
          >
            {/* Top Row: Pill Badge & Close */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#25D366]/30 bg-[#25D366]/10 px-2.5 py-1 text-[11px] font-bold text-[#128C7E]">
                <TbBrandWhatsapp className="h-3.5 w-3.5" />
                <span>Instant Previews</span>
              </div>

              <button
                type="button"
                onClick={handleDismiss}
                className="pressable -mr-1 rounded-full p-2 text-[#94a3b8] transition-colors hover:bg-black/5 hover:text-[#0f172a]"
                aria-label="Close"
              >
                <TbX className="h-4 w-4" />
              </button>
            </div>

            {/* Headline */}
            <div className="mt-3.5">
              <h3 className="text-[18.5px] sm:text-[20px] font-extrabold tracking-tight text-[#0f172a] leading-tight">
                Your changes, delivered to your phone.
              </h3>
              <p className="mt-1 text-[12.5px] sm:text-[13px] text-[#64748b] leading-relaxed">
                Get a tap-to-open preview link the second your approved code is ready to test.
              </p>
            </div>

            {/* Realistic WhatsApp Chat Bubble Mockup */}
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="mt-3.5 rounded-2xl border border-black/[0.05] bg-[#f8fafc] p-3 sm:p-3.5"
            >
              <div className="flex items-center gap-1.5 pb-2 text-[11px] font-semibold text-[#0f172a]">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#25D366] text-white">
                  <TbCheck className="h-2.5 w-2.5 stroke-[3]" />
                </span>
                <span>Live Alert Preview</span>
              </div>

              {/* Chat Bubble */}
              <div className="relative rounded-2xl rounded-tl-sm border border-[#c4eec0] bg-[#e7fed9] p-3 text-left shadow-sm">
                <p className="text-[12.5px] font-medium text-[#111827] leading-tight">
                  Your new update is live! 🚀
                </p>
                <div className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-white/90 px-2 py-0.5 text-[11.5px] font-semibold text-[#0a66ff] shadow-xs">
                  <span>👉 tap to view changes</span>
                </div>
                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[#64748b]">
                  <span>Just now</span>
                  <span className="text-[#38bdf8] font-bold">✓✓</span>
                </div>
              </div>
            </motion.div>

            {/* Form */}
            <form onSubmit={handleSave} noValidate className="mt-4 sm:mt-5 space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <span>WhatsApp Mobile Number</span>
                  <span className={`font-mono-code text-[11px] font-semibold lowercase tracking-normal transition-colors ${digits.length === 10 ? 'text-[#10b981]' : 'text-slate-400'}`}>
                    {digits.length}/10 digits
                  </span>
                </div>

                {/* Crispy Modern Input Container */}
                <div className="relative flex h-13 w-full items-center rounded-2xl border border-slate-200/90 bg-slate-50/60 p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 focus-within:border-[#25D366] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#25D366]/12">
                  {/* Fixed Country Pill */}
                  <div className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 shadow-xs select-none">
                    <span className="text-[14px]">🇮🇳</span>
                    <span className="font-mono-code text-[13px] font-bold text-slate-800">+91</span>
                  </div>

                  {/* 10 Digit Number Input — Clean & Borderless */}
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={formattedDisplay}
                    onChange={(e) => handleDigitsChange(e.target.value)}
                    placeholder="98765 43210"
                    maxLength={11}
                    className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 font-mono-code text-[15.5px] font-semibold tracking-wider text-slate-900 placeholder:font-sans placeholder:text-[14px] placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 outline-none focus:outline-none focus:ring-0 [outline:none] focus:[outline:none]"
                    autoFocus
                  />

                  {digits.length === 10 && (
                    <motion.span
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="mr-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#10b981] text-white shadow-xs"
                    >
                      <TbCheck className="h-3.5 w-3.5 stroke-[3]" />
                    </motion.span>
                  )}
                </div>
              </div>

              {/* Action Buttons: WhatsApp Emerald styling & Mobile responsive layout */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={loading || digits.length !== 10}
                  className="pressable flex h-11 w-full sm:flex-1 items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-white font-bold text-[13px] shadow-[0_4px_16px_-2px_rgba(37,211,102,0.4)] transition-all hover:bg-[#20bd5a] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {loading ? (
                    <TbLoaderQuarter className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <TbBrandWhatsapp className="h-4 w-4 stroke-[2.2]" />
                      <span>Connect WhatsApp</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDismiss}
                  disabled={loading}
                  className="pressable flex h-10 sm:h-11 w-full sm:w-auto items-center justify-center rounded-2xl px-4 text-[12.5px] font-semibold text-[#64748b] transition-colors hover:bg-black/5 hover:text-[#0f172a]"
                >
                  Not now
                </button>
              </div>
            </form>

            {/* Privacy Assurance */}
            <div className="mt-3 sm:mt-3.5 flex items-center justify-center gap-1.5 text-[10.5px] text-[#94a3b8]">
              <TbShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#10b981]" />
              <span>Only sent for updates you approve. No spam ever.</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
