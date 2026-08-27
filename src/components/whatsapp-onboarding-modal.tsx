'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { TbBrandWhatsapp, TbCheck, TbLoaderQuarter, TbX, TbShieldCheck, TbSparkles } from 'react-icons/tb'
import { toast } from 'sonner'

interface WhatsAppOnboardingModalProps {
  user?: {
    id?: string
    email?: string
  } | null
}

export function WhatsAppOnboardingModal({ user }: WhatsAppOnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [digits, setDigits] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user || !user.id || typeof window === 'undefined') return

    const storageKey = `waycode_whatsapp_prompted_${user.id}`
    const alreadyPrompted = localStorage.getItem(storageKey)
    if (alreadyPrompted) return

    let cancelled = false

    fetch('/api/settings/whatsapp')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data.success && data.whatsappNumber) {
          localStorage.setItem(storageKey, 'configured')
        } else {
          setIsOpen(true)
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [user])

  const handleDismiss = () => {
    if (user?.id) {
      localStorage.setItem(`waycode_whatsapp_prompted_${user.id}`, 'dismissed')
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
          localStorage.setItem(`waycode_whatsapp_prompted_${user.id}`, 'configured')
        }
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Subtle Dim Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="absolute inset-0 bg-[#0f172a]/45 backdrop-blur-[5px] transition-all"
          />

          {/* Modal Card */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[395px] overflow-hidden rounded-[28px] border border-black/[0.08] bg-white p-6 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.15),0_4px_16px_rgba(0,0,0,0.03)]"
          >
            {/* Top Row: Pill Badge & Close */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#25D366]/25 bg-[#25D366]/10 px-2.5 py-1 text-[11px] font-semibold text-[#128C7E]">
                <TbBrandWhatsapp className="h-3.5 w-3.5" />
                <span>Instant Previews</span>
              </div>

              <button
                type="button"
                onClick={handleDismiss}
                className="pressable -mr-1 rounded-full p-1.5 text-[#94a3b8] transition-colors hover:bg-black/5 hover:text-[#0f172a]"
                aria-label="Close"
              >
                <TbX className="h-4 w-4" />
              </button>
            </div>

            {/* Headline */}
            <div className="mt-4">
              <h3 className="text-[20px] font-bold tracking-tight text-[#0f172a] leading-snug">
                Your changes, delivered to your phone.
              </h3>
              <p className="mt-1 text-[13px] text-[#64748b] leading-relaxed">
                Get a tap-to-open preview link the second your approved code is ready to test.
              </p>
            </div>

            {/* Realistic WhatsApp Chat Bubble Mockup */}
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="mt-4 rounded-2xl border border-black/[0.05] bg-[#f8fafc] p-3.5"
            >
              <div className="flex items-center gap-1.5 pb-2 text-[11px] font-medium text-[#64748b]">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#25D366] text-white">
                  <TbCheck className="h-2.5 w-2.5 stroke-[3]" />
                </span>
                <span className="font-semibold text-[#0f172a]">Live Alert Preview</span>
              </div>

              {/* Chat Bubble */}
              <div className="relative rounded-2xl rounded-tl-sm border border-[#c4eec0] bg-[#e7fed9] p-3 text-left shadow-sm">
                <p className="text-[12.5px] font-medium text-[#111827] leading-tight">
                  Your new update is live! 🚀
                </p>
                <div className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-white/80 px-2 py-0.5 text-[11.5px] font-semibold text-[#0a66ff]">
                  <span>👉 tap to view changes</span>
                </div>
                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[#64748b]">
                  <span>Just now</span>
                  <span className="text-[#38bdf8] font-bold">✓✓</span>
                </div>
              </div>
            </motion.div>

            {/* Form */}
            <form onSubmit={handleSave} className="mt-5 space-y-3.5">
              <div>
                <label className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                  <span>Mobile Number</span>
                  <span className="font-normal lowercase tracking-normal text-[10.5px] text-[#94a3b8]">
                    {digits.length}/10 digits
                  </span>
                </label>

                <div className="flex items-center rounded-2xl border border-[#cbd5e1] bg-white px-3 py-2.5 transition-all focus-within:border-[#0f172a] focus-within:shadow-[0_0_0_3px_rgba(15,23,42,0.08)]">
                  {/* Fixed Country Pill */}
                  <div className="flex items-center gap-1.5 rounded-lg bg-[#f1f5f9] px-2 py-1 text-xs font-bold text-[#0f172a]">
                    <span>🇮🇳</span>
                    <span>+91</span>
                  </div>

                  {/* 10 Digit Number Input */}
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formattedDisplay}
                    onChange={(e) => handleDigitsChange(e.target.value)}
                    placeholder="98765 43210"
                    maxLength={11}
                    className="w-full bg-transparent pl-3 font-mono-code text-[14.5px] font-semibold text-[#0f172a] placeholder:text-[#94a3b8]/70 outline-none"
                    autoFocus
                  />

                  {digits.length === 10 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10b981] text-white shrink-0">
                      <TbCheck className="h-3 w-3 stroke-[3]" />
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={loading || digits.length !== 10}
                  className="pressable flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#0f172a] py-3 text-[13px] font-bold text-white shadow-sm transition-all hover:bg-black active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <TbLoaderQuarter className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <TbSparkles className="h-4 w-4 text-[#38bdf8]" />
                      <span>Get WhatsApp Alerts</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDismiss}
                  disabled={loading}
                  className="pressable rounded-2xl px-3.5 py-3 text-[12.5px] font-medium text-[#64748b] hover:bg-black/5 hover:text-[#0f172a]"
                >
                  Not now
                </button>
              </div>
            </form>

            {/* Privacy Assurance */}
            <div className="mt-3.5 flex items-center justify-center gap-1.5 text-[10.5px] text-[#94a3b8]">
              <TbShieldCheck className="h-3.5 w-3.5 text-[#10b981]" />
              <span>Only sent for updates you approve. No spam ever.</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
