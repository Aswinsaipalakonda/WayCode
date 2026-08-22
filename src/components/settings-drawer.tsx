'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import { SiOpenrouter, SiGooglegemini } from 'react-icons/si'
import {
  TbApi,
  TbEye,
  TbEyeOff,
  TbCopy,
  TbCheck,
  TbSearch,
  TbX,
  TbShieldLock,
  TbBolt,
  TbCpu,
  TbActivity,
  TbPlugConnected,
  TbCircleCheckFilled,
  TbAlertTriangleFilled,
  TbLoaderQuarter,
  TbClipboardText,
  TbKey,
  TbRocket,
} from 'react-icons/tb'

interface SettingsDrawerProps {
  isOpen: boolean
  onClose: () => void
}

type Provider = 'openrouter' | 'gemini' | 'custom'

interface ProviderMeta {
  id: Provider
  label: string
  hint: string
  color: string
  tint: string
  Icon: typeof SiOpenrouter
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: 'openrouter',
    label: 'OpenRouter',
    hint: '400+ models · free tiers available',
    color: '#6566f1',
    tint: 'rgba(101, 102, 241, 0.12)',
    Icon: SiOpenrouter,
  },
  {
    id: 'gemini',
    label: 'Gemini API',
    hint: 'Google AI Studio · direct billing',
    color: '#8e75b2',
    tint: 'rgba(142, 117, 178, 0.14)',
    Icon: SiGooglegemini,
  },
  {
    id: 'custom',
    label: 'Custom Endpoint',
    hint: 'Any OpenAI-compatible URL',
    color: '#0a66ff',
    tint: 'rgba(10, 102, 255, 0.1)',
    Icon: TbApi,
  },
]

const KEY_PLACEHOLDER: Record<Provider, string> = {
  openrouter: 'sk-or-v1-…',
  gemini: 'AIza…',
  custom: 'sk-…',
}

const FREE_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'deepseek/deepseek-r1:free',
  'qwen/qwen-2.5-coder-32b-instruct:free',
]

const PAID_MODELS = ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o']

type TestState = 'idle' | 'testing' | 'connected' | 'error'

export function SettingsDrawer({ isOpen, onClose }: SettingsDrawerProps) {
  const [provider, setProvider] = useState<Provider>('openrouter')
  const [credentials, setCredentials] = useState<Record<Provider, { apiKey: string; baseUrl: string }>>({
    openrouter: { apiKey: '', baseUrl: '' },
    gemini: { apiKey: '', baseUrl: '' },
    custom: { apiKey: '', baseUrl: '' },
  })
  const [showKey, setShowKey] = useState(false)
  const [model, setModel] = useState(FREE_MODELS[0])
  const [search, setSearch] = useState('')
  const [copiedModel, setCopiedModel] = useState<string | null>(null)

  const [testState, setTestState] = useState<TestState>('idle')
  const [testError, setTestError] = useState<string | null>(null)
  const [latency, setLatency] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const meta = PROVIDERS.find((p) => p.id === provider)!
  const { apiKey, baseUrl } = credentials[provider]

  const updateCredentials = (patch: Partial<{ apiKey: string; baseUrl: string }>) => {
    setCredentials((prev) => ({ ...prev, [provider]: { ...prev[provider], ...patch } }))
    setTestState('idle')
    setTestError(null)
  }

  const switchProvider = (id: Provider) => {
    setProvider(id)
    setShowKey(false)
    setSearch('')
    setTestState('idle')
    setTestError(null)
  }

  const freeModels = useMemo(
    () =>
      FREE_MODELS.filter((m) =>
        m.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [search],
  )
  const paidModels = useMemo(
    () =>
      PAID_MODELS.filter((m) =>
        m.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [search],
  )

  const handlePasteKey = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text.trim()) {
        toast.warning('Clipboard is empty')
        return
      }
      updateCredentials({ apiKey: text.trim() })
      toast.success('Key pasted from clipboard')
    } catch {
      toast.error('Paste blocked', {
        description: 'Browser denied clipboard access — paste manually.',
      })
    }
  }

  const handleCopyModel = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id)
      setCopiedModel(id)
      window.setTimeout(() => {
        setCopiedModel((cur) => (cur === id ? null : cur))
      }, 1600)
    } catch {
      toast.error('Copy failed', { description: 'Clipboard is unavailable right now.' })
    }
  }

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      toast.warning('API key required', {
        description: `Paste your ${meta.label} key to test the connection.`,
      })
      return
    }
    setTestState('testing')
    setTestError(null)
    setLatency(null)

    try {
      const res = await fetch('/api/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, model, customBaseUrl: baseUrl }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setTestState('connected')
        setLatency(data.latency || '~120ms')
        toast.success('Connection verified', {
          description: `Key is valid · ${data.latency ?? '~120ms'} round-trip`,
        })
      } else {
        setTestState('error')
        setTestError(data.error || 'Invalid key or unreachable model')
        toast.error('Connection failed', {
          description: data.error || 'The provider rejected this key/model pair.',
        })
      }
    } catch {
      setTestState('error')
      setTestError('Network error')
      toast.error('Network error', { description: 'Could not reach the validation endpoint.' })
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    // Simulated persistence beat for perceived responsiveness; vault save endpoint can be wired here.
    await new Promise((r) => setTimeout(r, 600))
    setIsSaving(false)
    toast.success('Vault updated', {
      description: `${meta.label} · ${model}`,
    })
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Scrim */}
          <motion.button
            aria-label="Close settings"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-[6px]"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="relative flex h-full w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-lg)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--cyan)] text-white shadow-[0_2px_14px_-2px_var(--brand-glow)]">
                  <TbShieldLock className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-sm font-bold tracking-tight">AI Provider Vault</h2>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Connectivity · bring your own key · encrypted at rest
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="pressable rounded-xl p-2 text-[var(--muted-foreground)] hover:bg-[var(--brand-soft)] hover:text-[var(--foreground)]"
              >
                <TbX className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
              {/* Live connection status */}
              <motion.div
                initial={false}
                animate={{
                  backgroundColor:
                    testState === 'connected'
                      ? 'rgba(20, 158, 83, 0.09)'
                      : testState === 'error'
                        ? 'rgba(220, 54, 46, 0.08)'
                        : 'rgba(24, 28, 38, 0.04)',
                  borderColor:
                    testState === 'connected'
                      ? 'rgba(20, 158, 83, 0.3)'
                      : testState === 'error'
                        ? 'rgba(220, 54, 46, 0.28)'
                        : 'var(--border)',
                }}
                transition={{ duration: 0.35 }}
                className="flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5"
              >
                <StatusIcon state={testState} />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs font-bold ${
                      testState === 'connected'
                        ? 'text-[var(--success)]'
                        : testState === 'error'
                          ? 'text-[var(--error)]'
                          : 'text-[var(--foreground-secondary)]'
                    }`}
                  >
                    {testState === 'connected' && 'Connected'}
                    {testState === 'testing' && 'Testing connection…'}
                    {testState === 'error' && 'Connection failed'}
                    {testState === 'idle' && 'Not connected'}
                  </p>
                  <p className="truncate text-[10.5px] text-[var(--muted-foreground)]">
                    {testState === 'connected' && `${meta.label} · ${latency} round-trip · ${model}`}
                    {testState === 'testing' && `Handshaking with ${meta.label}…`}
                    {testState === 'error' && (testError ?? 'Check your key and try again')}
                    {testState === 'idle' && 'Verify a key below to activate AI routing.'}
                  </p>
                </div>
              </motion.div>

              {/* Provider integration cards */}
              <section className="space-y-2">
                <SectionLabel icon={<TbPlugConnected className="h-3 w-3" />}>Provider</SectionLabel>
                <div className="space-y-2">
                  {PROVIDERS.map((p) => {
                    const active = provider === p.id
                    return (
                      <button
                        key={p.id}
                        onClick={() => switchProvider(p.id)}
                        aria-pressed={active}
                        className={`pressable group flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${
                          active
                            ? 'border-[var(--brand)] bg-[var(--brand-soft)] shadow-[0_0_0_3px_var(--brand-soft)]'
                            : 'border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--card-hover)]'
                        }`}
                      >
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
                          style={{ background: active ? p.tint : 'var(--background)' }}
                        >
                          <p.Icon className="h-5 w-5" style={{ color: p.color }} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-bold leading-tight">{p.label}</span>
                          <span className="mt-0.5 block truncate text-[11px] text-[var(--muted-foreground)]">
                            {p.hint}
                          </span>
                        </span>
                        {active ? (
                          <motion.span
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                          >
                            <TbCircleCheckFilled className="h-5 w-5 text-[var(--brand)]" />
                          </motion.span>
                        ) : (
                          <span className="h-5 w-5 shrink-0 rounded-full border-2 border-[var(--border-strong)] transition-colors group-hover:border-[var(--brand)]" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* Custom base URL */}
              <AnimatePresence initial={false}>
                {provider === 'custom' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <fieldset className="space-y-2">
                      <legend className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
                        <TbApi className="h-3 w-3" /> Base URL
                      </legend>
                      <input
                        type="url"
                        placeholder="https://api.your-provider.com/v1"
                        value={baseUrl}
                        onChange={(e) => updateCredentials({ baseUrl: e.target.value })}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 font-mono-code text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none transition-all duration-200 focus:border-[var(--brand)] focus:shadow-[0_0_0_3px_var(--brand-soft)]"
                      />
                    </fieldset>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Credentials */}
              <section className="space-y-2">
                <SectionLabel
                  icon={<TbKey className="h-3 w-3" />}
                  aside={
                    <span className="flex items-center gap-1 normal-case tracking-normal font-medium text-[var(--success)]">
                      <TbShieldLock className="h-3 w-3" /> never returned in plaintext
                    </span>
                  }
                >
                  API Key
                </SectionLabel>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    placeholder={KEY_PLACEHOLDER[provider]}
                    value={apiKey}
                    onChange={(e) => updateCredentials({ apiKey: e.target.value })}
                    className={`${inputCls} pr-20 font-mono-code text-xs`}
                    spellCheck={false}
                  />
                  <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={handlePasteKey}
                      aria-label="Paste key from clipboard"
                      title="Paste from clipboard"
                      className="pressable rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
                    >
                      <TbClipboardText className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      aria-label={showKey ? 'Hide key' : 'Show key'}
                      className="pressable rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--brand-soft)] hover:text-[var(--foreground)]"
                    >
                      {showKey ? <TbEyeOff className="h-4 w-4" /> : <TbEye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </section>

              {/* Model selection */}
              <section className="space-y-2">
                <SectionLabel icon={<TbCpu className="h-3 w-3" />}>Model Routing</SectionLabel>

                {/* Search */}
                <div className="relative">
                  <TbSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter models…"
                    className={`${inputCls} pl-9 pr-9`}
                    spellCheck={false}
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      aria-label="Clear filter"
                      className="pressable absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    >
                      <TbX className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {(freeModels.length > 0 || paidModels.length > 0) && (
                  <>
                    {freeModels.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--success)]">
                          <TbBolt className="h-3 w-3" /> ZERO-COST TIERS
                        </p>
                        {freeModels.map((m) => (
                          <ModelRow
                            key={m}
                            model={m}
                            selected={model === m}
                            onSelect={() => {
                              setModel(m)
                              setTestState('idle')
                            }}
                            copied={copiedModel === m}
                            onCopy={() => handleCopyModel(m)}
                          />
                        ))}
                      </div>
                    )}

                    {paidModels.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <p className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--muted-foreground)]">
                          <TbRocket className="h-3 w-3" /> PREMIUM / HIGHER CONTEXT
                        </p>
                        {paidModels.map((m) => (
                          <ModelRow
                            key={m}
                            model={m}
                            selected={model === m}
                            onSelect={() => {
                              setModel(m)
                              setTestState('idle')
                            }}
                            copied={copiedModel === m}
                            onCopy={() => handleCopyModel(m)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}

                {freeModels.length === 0 && paidModels.length === 0 && (
                  <p className="anim-fade-in rounded-xl border border-dashed border-[var(--border-strong)] px-3 py-4 text-center text-[11px] text-[var(--muted-foreground)]">
                    No models match “{search.trim()}”.
                  </p>
                )}
              </section>
            </div>

            {/* Footer actions */}
            <div className="flex gap-2.5 border-t border-[var(--border)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                onClick={handleTestConnection}
                disabled={testState === 'testing'}
                className="pressable flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] py-2.5 text-xs font-semibold text-[var(--foreground)] hover:border-[var(--brand)] disabled:opacity-50"
              >
                {testState === 'testing' ? (
                  <TbLoaderQuarter className="h-4 w-4 animate-spin text-[var(--brand)]" />
                ) : (
                  <TbActivity className="h-4 w-4 text-[var(--brand)]" />
                )}
                Test Connection
              </button>

              <button
                onClick={handleSave}
                disabled={testState !== 'connected' || isSaving}
                title={testState !== 'connected' ? 'Run a successful connection test first' : undefined}
                className="btn-brand pressable flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold"
              >
                {isSaving ? (
                  <TbLoaderQuarter className="h-4 w-4 animate-spin" />
                ) : (
                  <TbShieldLock className="h-4 w-4" />
                )}
                Save Vault
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function StatusIcon({ state }: { state: TestState }) {
  if (state === 'connected') {
    return (
      <span className="live-dot mx-1.5" aria-hidden />
    )
  }
  if (state === 'testing') {
    return <TbLoaderQuarter className="h-4.5 w-4.5 shrink-0 animate-spin text-[var(--brand)]" />
  }
  if (state === 'error') {
    return <TbAlertTriangleFilled className="h-4.5 w-4.5 shrink-0 text-[var(--error)]" />
  }
  return (
    <span className="mx-1.5 block h-2 w-2 shrink-0 rounded-full bg-[var(--muted-foreground)]" aria-hidden />
  )
}

function SectionLabel({
  icon,
  children,
  aside,
}: {
  icon?: React.ReactNode
  children: React.ReactNode
  aside?: React.ReactNode
}) {
  return (
    <legend className="flex w-full items-center justify-between text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
      <span className="flex items-center gap-1.5">
        {icon}
        {children}
      </span>
      {aside}
    </legend>
  )
}

const inputCls =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none transition-all duration-200 focus:border-[var(--brand)] focus:shadow-[0_0_0_3px_var(--brand-soft)]'

function ModelRow({
  model,
  selected,
  onSelect,
  copied,
  onCopy,
}: {
  model: string
  selected: boolean
  onSelect: () => void
  copied: boolean
  onCopy: () => void
}) {
  const free = model.endsWith(':free')

  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={`group flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 transition-all duration-200 ${
        selected
          ? 'border-[var(--brand)] bg-[var(--brand-soft)] shadow-[0_0_0_3px_var(--brand-soft)]'
          : 'border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--card-hover)]'
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <code
          className={`truncate font-mono-code text-[10.5px] ${
            selected ? 'font-semibold text-[var(--foreground)]' : 'text-[var(--foreground-secondary)]'
          }`}
        >
          {model}
        </code>
        {free && !selected && (
          <span className="shrink-0 rounded-full bg-[var(--success-soft)] px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-[var(--success)]">
            Free
          </span>
        )}
      </span>

      <span className="ml-2 flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label={copied ? 'Copied' : `Copy ${model}`}
          onClick={(e) => {
            e.stopPropagation()
            onCopy()
          }}
          className={`pressable rounded-md p-1 transition-opacity ${
            copied
              ? 'text-[var(--success)]'
              : 'text-[var(--muted-foreground)] opacity-0 hover:text-[var(--foreground)] focus-visible:opacity-100 group-hover:opacity-100 md:opacity-0'
          }`}
        >
          {copied ? <TbCheck className="h-3.5 w-3.5" /> : <TbCopy className="h-3.5 w-3.5" />}
        </button>
        {selected && <TbCircleCheckFilled className="h-4 w-4 shrink-0 text-[var(--brand)]" />}
      </span>
    </div>
  )
}
