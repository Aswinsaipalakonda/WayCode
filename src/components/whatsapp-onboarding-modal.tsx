'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { TbBrandWhatsapp, TbCheck, TbLoaderQuarter, TbX, TbArrowRight } from 'react-icons/tb'
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
    // Only allow digits, max 10 digits
    const cleaned = val.replace(/\D/g, '').slice(0, 10)
    setDigits(cleaned)
  }

  // Format 10 digits into "98765 43210"
  const formattedDisplay = digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (digits.length !== 10) {
      toast.warning('Please enter a valid 10-digit mobile number')
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
        toast.success('WhatsApp notifications connected', {
          description: `Receipts will be sent to +91 ${formattedDisplay}`,
        })
      } else {
        toast.error('Failed to connect WhatsApp', {
          description: data.error || 'Please check your 10-digit phone number.',
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
          {/* Minimalist Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="absolute inset-0 bg-[#090d16]/50 backdrop-blur-sm transition-all"
          />

          {/* Modal Card */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: 6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[390px] overflow-hidden rounded-[26px] border border-black/[0.08] bg-white p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.18)]"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#25D366]/10 text-[#128C7E]">
                  <TbBrandWhatsapp className="h-4 w-4" />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  WhatsApp Alerts
                </span>
              </div>

              <button
                type="button"
                onClick={handleDismiss}
                className="pressable -mr-1 rounded-full p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-black/5 hover:text-[var(--foreground)]"
                aria-label="Close"
              >
                <TbX className="h-4 w-4" />
              </button>
            </div>

            {/* Title & Description */}
            <div className="mt-4">
              <h3 className="text-[19px] font-bold tracking-tight text-[#111827]">
                Never miss a shipped task
              </h3>
              <p className="mt-1 text-[13px] text-[var(--foreground-secondary)] leading-relaxed">
                Get an instant ping on WhatsApp with the live preview link whenever your approved PR lands.
              </p>
            </div>

            {/* Minimalist Message Preview Card */}
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-4 rounded-2xl border border-black/[0.06] bg-[#f8fafc] p-3.5"
            >
              <div className="flex items-center justify-between text-[10.5px] text-[var(--muted-foreground)]">
                <span className="flex items-center gap-1.5 font-medium text-[#111827]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#25D366]" />
                  WayCode Gateway
                </span>
                <span>Just now</span>
              </div>
              <p className="mt-1.5 text-[12px] font-semibold text-[#1e293b]">
                ✅ Task Shipped &bull; <span className="font-normal text-[var(--foreground-secondary)]">feat: add auth flow</span>
              </p>
              <div className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[11px] font-mono-code font-medium text-[var(--brand)] border border-black/[0.04]">
                <span>https://preview.waycode.dev/deploy/8a959</span>
              </div>
            </motion.div>

            {/* Form */}
            <form onSubmit={handleSave} className="mt-5 space-y-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Mobile Number
                </label>

                <div className="flex items-center rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2 transition-all focus-within:border-[var(--brand)] focus-within:ring-2 focus-within:ring-[var(--brand-soft)]">
                  {/* Fixed Country Code */}
                  <div className="flex items-center gap-1.5 border-r border-black/10 pr-2.5 mr-2.5 text-xs font-bold text-[#111827]">
                    <span className="text-sm">🇮🇳</span>
                    <span>+91</span>
                  </div>

                  {/* 10 Digit Input */}
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formattedDisplay}
                    onChange={(e) => handleDigitsChange(e.target.value)}
                    placeholder="98765 43210"
                    maxLength={11}
                    className="w-full bg-transparent font-mono-code text-[14px] font-medium text-[#111827] placeholder:text-[var(--muted-foreground)]/60 outline-none"
                    autoFocus
                  />

                  {digits.length === 10 && (
                    <TbCheck className="h-4 w-4 text-[var(--success)] shrink-0" />
                  )}
                </div>
                <p className="mt-1 text-[10.5px] text-[var(--muted-foreground)]">
                  Enter your 10-digit phone number.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={loading || digits.length !== 10}
                  className="pressable flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#111827] py-2.5 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <TbLoaderQuarter className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>Connect WhatsApp</span>
                      <TbArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDismiss}
                  disabled={loading}
                  className="pressable rounded-xl px-3.5 py-2.5 text-[12.5px] font-medium text-[var(--muted-foreground)] hover:text-[#111827] hover:bg-black/5"
                >
                  Skip
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
