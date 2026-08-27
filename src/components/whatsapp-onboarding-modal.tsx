'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  TbBrandWhatsapp,
  TbCheck,
  TbLoaderQuarter,
  TbX,
  TbShieldCheck,
  TbExternalLink,
  TbFlame,
  TbBellRinging,
} from 'react-icons/tb'
import { toast } from 'sonner'

interface WhatsAppOnboardingModalProps {
  user?: {
    id?: string
    email?: string
  } | null
}

const BENEFIT_CHIPS = [
  {
    icon: TbExternalLink,
    title: 'Live Preview URLs',
    desc: 'Direct links delivered to your chat the second code ships',
    color: 'text-[var(--brand)] bg-[var(--brand-soft)]',
  },
  {
    icon: TbBellRinging,
    title: 'Out-of-Band Alerts',
    desc: 'Stay informed without keeping the laptop or browser open',
    color: 'text-[#25D366] bg-[#25D366]/10',
  },
  {
    icon: TbShieldCheck,
    title: 'Zero Noise Guarantee',
    desc: 'Only pings for tasks and deployments you explicitly approve',
    color: 'text-amber-500 bg-amber-500/10',
  },
]

export function WhatsAppOnboardingModal({ user }: WhatsAppOnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [phone, setPhone] = useState('')
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const raw = phone.trim()
    if (!raw) {
      toast.warning('Please enter your phone number with country code')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/settings/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappNumber: raw }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        if (user?.id) {
          localStorage.setItem(`waycode_whatsapp_prompted_${user.id}`, 'configured')
        }
        setIsOpen(false)
        toast.success('WhatsApp deploy receipts enabled!', {
          description: `Connected to ${data.whatsappNumber}`,
        })
      } else {
        toast.error('Could not save WhatsApp number', {
          description: data.error || 'Please include your country code (e.g. +91 or +1).',
        })
      }
    } catch {
      toast.error('Network error while saving WhatsApp number')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop with rich blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md transition-all"
          />

          {/* Modal Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ scale: 0.94, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="relative w-full max-w-[440px] overflow-hidden rounded-[32px] border border-black/[0.08] bg-white/95 p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.22)] backdrop-blur-xl dark:border-white/[0.12] dark:bg-slate-900/95"
          >
            {/* Ambient Top Glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-gradient-to-br from-[#25D366]/20 via-[#0066FF]/15 to-transparent blur-3xl"
            />

            {/* Header */}
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#25D366]/30 bg-gradient-to-br from-[#25D366]/20 to-[#128C7E]/10 text-[#25D366] shadow-[0_4px_16px_-2px_rgba(37,211,102,0.35)]">
                  <TbBrandWhatsapp className="h-6 w-6" />
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#25D366] ring-2 ring-white dark:ring-slate-900">
                    <TbFlame className="h-2 w-2 text-white" />
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[17px] font-extrabold tracking-tight text-[var(--foreground)]">
                      WhatsApp Receipts
                    </h3>
                    <span className="inline-flex items-center rounded-full bg-[#25D366]/10 px-2 py-0.5 text-[9.5px] font-bold text-[#25D366] ring-1 ring-inset ring-[#25D366]/25">
                      LIVE ALERTS
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] font-medium text-[var(--muted-foreground)]">
                    Get instant deploy URLs right to your phone
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDismiss}
                className="pressable -mr-1 -mt-1 rounded-full p-2 text-[var(--muted-foreground)] transition-colors hover:bg-black/5 hover:text-[var(--foreground)] dark:hover:bg-white/10"
                aria-label="Close"
              >
                <TbX className="h-4 w-4" />
              </button>
            </div>

            {/* Feature Chips */}
            <div className="relative mt-5 space-y-2">
              {BENEFIT_CHIPS.map((chip, i) => {
                const Icon = chip.icon
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-2xl border border-black/[0.04] bg-black/[0.02] p-2.5 transition-colors dark:border-white/[0.06] dark:bg-white/[0.03]"
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${chip.color}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold tracking-tight text-[var(--foreground)]">
                        {chip.title}
                      </p>
                      <p className="truncate text-[10.5px] text-[var(--muted-foreground)]">
                        {chip.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="relative mt-5 space-y-4">
              <div>
                <label className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                  <span>Your WhatsApp Number</span>
                  <span className="font-normal lowercase tracking-normal text-[10px] text-[var(--muted-foreground)]">
                    country code required
                  </span>
                </label>

                <div className="group relative flex items-center rounded-2xl border border-black/10 bg-white shadow-[var(--shadow-sm)] transition-all focus-within:border-[#25D366] focus-within:ring-4 focus-within:ring-[#25D366]/15 dark:border-white/10 dark:bg-slate-950">
                  <span className="flex items-center pl-3.5 pr-2 text-sm text-[var(--muted-foreground)]">
                    <TbBrandWhatsapp className="h-4 w-4 text-[#25D366]" />
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210 or +1 555 0199"
                    className="h-11 w-full rounded-2xl bg-transparent pr-3.5 font-mono-code text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 outline-none"
                    autoFocus
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="submit"
                  disabled={loading || !phone.trim()}
                  className="pressable flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#25D366] to-[#1ebe5d] py-3 text-[12.5px] font-bold text-white shadow-[0_4px_18px_-2px_rgba(37,211,102,0.4)] transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  {loading ? (
                    <TbLoaderQuarter className="h-4 w-4 animate-spin" />
                  ) : (
                    <TbCheck className="h-4 w-4 stroke-[2.5]" />
                  )}
                  Enable WhatsApp Alerts
                </button>

                <button
                  type="button"
                  onClick={handleDismiss}
                  disabled={loading}
                  className="pressable rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-[12.5px] font-semibold text-[var(--foreground-secondary)] transition-all hover:bg-black/5 hover:text-[var(--foreground)] dark:border-white/10 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  Later
                </button>
              </div>
            </form>

            {/* Footer Notice */}
            <div className="relative mt-4 flex items-center justify-center gap-1.5 text-[10.5px] text-[var(--muted-foreground)]">
              <TbShieldCheck className="h-3.5 w-3.5 shrink-0 text-[var(--success)]" />
              <span>Encrypted at rest. Change or remove anytime in Profile.</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
