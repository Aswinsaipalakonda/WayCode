'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
  TbTrash,
  TbListDetails,
} from 'react-icons/tb'

interface SettingsDrawerProps {
  isOpen: boolean
  onClose: () => void
}

type Provider = 'openrouter' | 'gemini' | 'custom'
type VaultStage = 'idle' | 'validating' | 'connected' | 'error'

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
    hint: '400+ models · live catalog',
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
    label: 'Custom / Claude',
    hint: 'Any OpenAI-compatible URL · sk-ant keys',
    color: '#0a66ff',
    tint: 'rgba(10, 102, 255, 0.1)',
    Icon: TbApi,
  },
]

const KEY_PLACEHOLDER: Record<Provider, string> = {
  openrouter: 'sk-or-v1-…',
  gemini: 'AIza…',
  custom: 'sk-ant-… · sk-… · any OpenAI-compatible key',
}

interface ModelEntry {
  id: string
  name: string
  free: boolean
}

/** Server-side vault snapshot — the key itself never leaves the backend. */
interface SavedVault {
  provider: Provider
  model: string
  customBaseUrl: string | null
  hasKey: boolean
  keyHint: string | null
  keyReadable: boolean
  lastTestStatus: string | null
}

export function SettingsDrawer({ isOpen, onClose }: SettingsDrawerProps) {
  const [provider, setProvider] = useState<Provider>('openrouter')
  const [credentials, setCredentials] = useState<Record<Provider, { apiKey: string; baseUrl: string }>>({
    openrouter: { apiKey: '', baseUrl: '' },
    gemini: { apiKey: '', baseUrl: '' },
    custom: { apiKey: '', baseUrl: '' },
  })
  const [showKey, setShowKey] = useState(false)
  const [model, setModel] = useState('')
  const [search, setSearch] = useState('')
  const [copiedModel, setCopiedModel] = useState<string | null>(null)

  const [stage, setStage] = useState<VaultStage>('idle')
  const [statusMsg, setStatusMsg] = useState<string>('')
  const [latency, setLatency] = useState<string | null>(null)
  const [detectedProvider, setDetectedProvider] = useState<string | null>(null)
  const [catalog, setCatalog] = useState<ModelEntry[]>([])
  const [catalogMeta, setCatalogMeta] = useState<{ total: number; free: number }>({ total: 0, free: 0 })
  const [loadingModels, setLoadingModels] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [savedVault, setSavedVault] = useState<SavedVault | null>(null)
  const [replacingKey, setReplacingKey] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [modelPicker, setModelPicker] = useState<null | 'free' | 'all'>(null)

  const meta = PROVIDERS.find((p) => p.id === provider)!
  const { apiKey, baseUrl } = credentials[provider]

  const fetchVault = useCallback(async (): Promise<SavedVault | null> => {
    try {
      const res = await fetch('/api/settings/load')
      if (!res.ok) return null
      const data = await res.json()
      if (!data.success) return null
      return {
        provider: (['openrouter', 'gemini', 'custom'].includes(data.provider) ? data.provider : 'openrouter') as Provider,
        model: typeof data.model === 'string' ? data.model : '',
        customBaseUrl: data.customBaseUrl ?? null,
        hasKey: Boolean(data.hasKey),
        keyHint: data.keyHint ?? null,
        keyReadable: Boolean(data.keyReadable),
        lastTestStatus: data.lastTestStatus ?? null,
      }
    } catch {
      return null
    }
  }, [])

  const loadVaultModels = useCallback(async (targetProvider?: Provider, preferredModel?: string) => {
    setLoadingModels(true)
    setModelsError(null)
    try {
      const res = await fetch('/api/settings/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useVault: true, provider: targetProvider ?? provider }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        const list: ModelEntry[] = data.models ?? []
        setCatalog(list)
        setCatalogMeta({ total: data.total ?? list.length, free: data.free ?? 0 })
        setModelsError(null)
        const targetModel = preferredModel || model
        if (targetModel && list.some((m) => m.id === targetModel)) {
          setModel(targetModel)
        } else if (list.length > 0 && !targetModel) {
          setModel(list[0]?.id ?? '')
        }
      } else {
        setModelsError(data.error || 'Could not load the model catalog from vault.')
      }
    } catch {
      setModelsError('Network error while fetching models from vault.')
    } finally {
      setLoadingModels(false)
    }
  }, [provider, model])

  // Every open restores the persisted vault — provider, model, and proof of
  // the stored key (masked). The key stays encrypted server-side forever.
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    ;(async () => {
      const vault = await fetchVault()
      if (cancelled) return
      setSavedVault(vault)
      setReplacingKey(false)
      setLatency(null)
      setDetectedProvider(null)
      setCatalog([])
      setCatalogMeta({ total: 0, free: 0 })
      setModelsError(null)
      if (vault) {
        const label = PROVIDERS.find((p) => p.id === vault.provider)?.label ?? vault.provider
        setProvider(vault.provider)
        if (vault.model) setModel(vault.model)
        setShowKey(false)
        setSearch('')
        if (vault.hasKey && vault.lastTestStatus === 'connected') {
          setStage('connected')
          setStatusMsg(`${label} vault restored`)
          await loadVaultModels(vault.provider, vault.model)
        } else {
          setStage('idle')
          setStatusMsg('')
        }
      } else {
        setStage('idle')
        setStatusMsg('')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isOpen, fetchVault, loadVaultModels])

  const updateCredentials = (patch: Partial<{ apiKey: string; baseUrl: string }>) => {
    setCredentials((prev) => ({ ...prev, [provider]: { ...prev[provider], ...patch } }))
    // Any credential edit invalidates the previous validation.
    setStage('idle')
    setStatusMsg('')
    setLatency(null)
    setDetectedProvider(null)
    setCatalog([])
    setCatalogMeta({ total: 0, free: 0 })
    setModelsError(null)
  }

  const switchProvider = async (id: Provider) => {
    setProvider(id)
    setShowKey(false)
    setSearch('')
    setLatency(null)
    setDetectedProvider(null)
    setCatalog([])
    setCatalogMeta({ total: 0, free: 0 })
    setModelsError(null)
    // Returning to the provider with a validated stored key restores it.
    if (savedVault?.provider === id && savedVault.hasKey && savedVault.lastTestStatus === 'connected') {
      setStage('connected')
      setStatusMsg(`${PROVIDERS.find((p) => p.id === id)?.label ?? id} vault restored`)
      await loadVaultModels(id, savedVault.model)
    } else {
      setStage('idle')
      setStatusMsg('')
    }
  }

  const freeModels = useMemo(
    () =>
      catalog.filter(
        (m) => m.free && m.name.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [catalog, search],
  )
  const otherModels = useMemo(
    () =>
      catalog.filter(
        (m) =>
          !m.free &&
          m.name.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [catalog, search],
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

  const loadModels = async (key: string, base: string) => {
    setLoadingModels(true)
    try {
      const res = await fetch('/api/settings/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: key, customBaseUrl: base }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        const list: ModelEntry[] = data.models ?? []
        setCatalog(list)
        setCatalogMeta({ total: data.total ?? list.length, free: data.free ?? 0 })
        setModelsError(null)
        if (!list.some((m) => m.id === model)) {
          setModel(list[0]?.id ?? '')
        }
      } else {
        setModelsError(data.error || 'Could not load the model catalog — try Re-validate.')
        toast.error('Could not load models', { description: data.error || 'Try re-validating.' })
      }
    } catch {
      setModelsError('Network error while fetching models.')
      toast.error('Network error', { description: 'Could not reach the catalog endpoint.' })
    } finally {
      setLoadingModels(false)
    }
  }

  const handleValidate = async () => {
    if (!apiKey.trim()) {
      toast.warning('API key required', {
        description: `Paste your ${meta.label} key first.`,
      })
      return
    }

    setStage('validating')
    setStatusMsg(`Validating ${meta.label} key…`)
    setLatency(null)

    try {
      const res = await fetch('/api/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, customBaseUrl: baseUrl }),
      })
      const data = await res.json()

      if (data.success) {
        setStage('connected')
        setLatency(data.latency || null)
        setDetectedProvider(data.provider || null)
        setStatusMsg(`${meta.label} key verified`)
        await loadModels(apiKey.trim(), baseUrl)
      } else {
        setStage('error')
        setStatusMsg(data.error || 'The provider rejected this key.')
        toast.error('Validation failed', {
          description: data.error || 'Check the key and try again.',
        })
      }
    } catch {
      setStage('error')
      setStatusMsg('Network error — could not reach the validation endpoint.')
      toast.error('Network error', { description: 'Could not reach the validation endpoint.' })
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/settings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: apiKey.trim() || undefined,
          model,
          customBaseUrl: baseUrl,
          testStatus: 'connected',
        }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        toast.success('Vault updated', {
          description: `${meta.label} · ${model}${data.keyReplaced ? '' : ' · key kept from vault'}`,
        })
        setReplacingKey(false)
        // Re-read the vault so the masked hint / status stay in sync.
        const fresh = await fetchVault()
        if (fresh) {
          setSavedVault(fresh)
          if (fresh.hasKey && fresh.lastTestStatus === 'connected') {
            setStatusMsg(`${PROVIDERS.find((p) => p.id === fresh.provider)?.label ?? fresh.provider} vault restored`)
          }
        }
        onClose()
      } else {
        toast.error('Could not save vault', { description: data.error || 'Try again in a moment.' })
      }
    } catch {
      toast.error('Network error', { description: 'Could not reach the save endpoint.' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveKey = async () => {
    setIsRemoving(true)
    try {
      const res = await fetch('/api/settings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removeKey: true }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('API key removed', {
          description: 'Paste a new key and validate to reconnect the vault.',
        })
        setCredentials((prev) => ({
          openrouter: { apiKey: '', baseUrl: prev.openrouter.baseUrl },
          gemini: { apiKey: '', baseUrl: prev.gemini.baseUrl },
          custom: { apiKey: '', baseUrl: prev.custom.baseUrl },
        }))
        setStage('idle')
        setStatusMsg('')
        setCatalog([])
        setCatalogMeta({ total: 0, free: 0 })
        setReplacingKey(false)
        const fresh = await fetchVault()
        setSavedVault(fresh)
      } else {
        toast.error('Could not remove key', { description: data.error || 'Try again in a moment.' })
      }
    } catch {
      toast.error('Network error', { description: 'Could not reach the save endpoint.' })
    } finally {
      setIsRemoving(false)
    }
  }

  const canValidate = apiKey.trim().length > 0 && stage !== 'validating'
  const canSave = stage === 'connected' && !!model && !isSaving

  return (
    <>
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
              {/* Live status strip */}
              <motion.div
                initial={false}
                animate={{
                  backgroundColor:
                    stage === 'connected'
                      ? 'rgba(20, 158, 83, 0.09)'
                      : stage === 'error'
                        ? 'rgba(220, 54, 46, 0.08)'
                        : stage === 'validating'
                          ? 'rgba(10, 102, 255, 0.06)'
                          : 'rgba(24, 28, 38, 0.04)',
                  borderColor:
                    stage === 'connected'
                      ? 'rgba(20, 158, 83, 0.3)'
                      : stage === 'error'
                        ? 'rgba(220, 54, 46, 0.28)'
                        : stage === 'validating'
                          ? 'rgba(10, 102, 255, 0.25)'
                          : 'var(--border)',
                }}
                transition={{ duration: 0.35 }}
                className="flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5"
              >
                <StatusIcon stage={stage} />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs font-bold ${
                      stage === 'connected'
                        ? 'text-[var(--success)]'
                        : stage === 'error'
                          ? 'text-[var(--error)]'
                          : 'text-[var(--foreground-secondary)]'
                    }`}
                  >
                    {stage === 'connected' && statusMsg}
                    {stage === 'validating' && statusMsg}
                    {stage === 'error' && 'Connection failed'}
                    {stage === 'idle' && 'Not validated'}
                  </p>
                  <p className="truncate text-[10.5px] text-[var(--muted-foreground)]">
                    {stage === 'connected' &&
                      `${latency ? `${latency} round-trip` : 'verified'}${detectedProvider ? ` · routed via ${detectedProvider}` : ''}`}
                    {(stage === 'idle' || stage === 'validating') &&
                      (stage === 'validating' ? 'Handshaking with the provider…' : 'Paste your key, then validate to unlock live models.')}
                    {stage === 'error' && statusMsg}
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
                      <p className="text-[10px] text-[var(--muted-foreground)]">
                        Leave empty when pasting an Anthropic (<code className="font-mono-code">sk-ant-</code>) or OpenRouter key — we detect it automatically.
                      </p>
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
                {savedVault?.hasKey && !replacingKey ? (
                  savedVault.keyReadable ? (
                    <div className="flex items-center gap-2 rounded-xl border border-[var(--success)]/25 bg-[var(--success-soft)] px-3.5 py-2.5">
                      <TbShieldLock className="h-4 w-4 shrink-0 text-[var(--success)]" />
                      <code
                        className="min-w-0 flex-1 truncate font-mono-code text-xs text-[var(--foreground-secondary)]"
                        title="Stored key (encrypted at rest)"
                      >
                        {savedVault.keyHint}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          setReplacingKey(true)
                          updateCredentials({ apiKey: '' })
                        }}
                        className="pressable shrink-0 rounded-lg px-2 py-1 text-[10.5px] font-bold text-[var(--brand)] hover:bg-[var(--brand-soft)]"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveKey}
                        disabled={isRemoving}
                        aria-label="Remove stored API key"
                        title="Remove key from vault"
                        className="pressable shrink-0 rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--error-soft)] hover:text-[var(--error)] disabled:opacity-50"
                      >
                        {isRemoving ? (
                          <TbLoaderQuarter className="h-4 w-4 animate-spin" />
                        ) : (
                          <TbTrash className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl border border-[var(--warning, #b45309)]/30 px-3.5 py-2.5" style={{ background: 'rgba(180, 83, 9, 0.08)' }}>
                      <TbAlertTriangleFilled className="h-4 w-4 shrink-0" style={{ color: '#b45309' }} />
                      <p className="min-w-0 flex-1 text-[11px] font-medium text-[var(--foreground-secondary)]">
                        Stored key exists but can&apos;t be decrypted with the current server key.
                      </p>
                      <button
                        type="button"
                        onClick={handleRemoveKey}
                        disabled={isRemoving}
                        className="pressable shrink-0 rounded-lg px-2 py-1 text-[10.5px] font-bold text-[var(--brand)] hover:bg-[var(--brand-soft)] disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  )
                ) : (
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
                )}
                {savedVault?.hasKey && replacingKey && (
                  <p className="px-1 text-[10px] font-medium text-[var(--muted-foreground)]">
                    Saving a new key replaces the one in the vault — the old ciphertext is discarded.
                  </p>
                )}
              </section>

              {/* Model routing — fully dynamic */}
              <section className="space-y-2">
                <SectionLabel
                  icon={<TbCpu className="h-3 w-3" />}
                  aside={
                    catalog.length > 0 ? (
                      <span className="normal-case tracking-normal font-semibold text-[var(--muted-foreground)]">
                        {catalogMeta.free} free · {catalogMeta.total} total
                      </span>
                    ) : undefined
                  }
                >
                  Model Routing
                </SectionLabel>

                {stage !== 'connected' && (
                  <div className="rounded-xl border border-dashed border-[var(--border-strong)] px-3 py-5 text-center">
                    <TbCpu className="mx-auto h-5 w-5 text-[var(--muted-foreground)] opacity-60" />
                    <p className="mt-1.5 text-[11.5px] font-medium text-[var(--muted-foreground)]">
                      Validate your key below to load the{' '}
                      <span className="font-bold text-[var(--foreground-secondary)]">live model catalog</span>
                    </p>
                  </div>
                )}

                {loadingModels && (
                  <div className="space-y-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-9 animate-pulse rounded-xl bg-[var(--brand-soft)]"
                        style={{ animationDelay: `${i * 120}ms`, opacity: 1 - i * 0.18 }}
                      />
                    ))}
                    <p className="pt-1 text-center text-[11px] font-medium text-[var(--brand)]">
                      Fetching live models…
                    </p>
                  </div>
                )}

                {stage === 'connected' && !loadingModels && catalog.length > 0 && (
                  <>
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

                    {freeModels.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--success)]">
                          <TbBolt className="h-3 w-3" /> FREE MODELS FIRST
                        </p>
                        {freeModels.slice(0, 8).map((m) => (
                          <ModelRow
                            key={m.id}
                            entry={m}
                            selected={model === m.id}
                            onSelect={() => setModel(m.id)}
                            copied={copiedModel === m.id}
                            onCopy={() => handleCopyModel(m.id)}
                          />
                        ))}
                        {freeModels.length > 8 && (
                          <button
                            type="button"
                            onClick={() => setModelPicker('free')}
                            className="pressable flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--brand)]/35 py-2 text-[11px] font-bold text-[var(--brand)] transition-colors hover:bg-[var(--brand-soft)]"
                          >
                            <TbListDetails className="h-3.5 w-3.5" />
                            See all {freeModels.length} free models
                          </button>
                        )}
                      </div>
                    )}

                    {otherModels.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <p className="text-[10px] font-bold text-[var(--muted-foreground)]">
                          ALL MODELS{freeModels.length > 0 && search ? '' : ' · PAID / STANDARD'}
                        </p>
                        {otherModels.slice(0, 40).map((m) => (
                          <ModelRow
                            key={m.id}
                            entry={m}
                            selected={model === m.id}
                            onSelect={() => setModel(m.id)}
                            copied={copiedModel === m.id}
                            onCopy={() => handleCopyModel(m.id)}
                          />
                        ))}
                        {otherModels.length > 40 && (
                          <button
                            type="button"
                            onClick={() => setModelPicker('all')}
                            className="pressable flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--border-strong)] py-2 text-[11px] font-bold text-[var(--foreground-secondary)] transition-colors hover:bg-[var(--card-hover)]"
                          >
                            <TbListDetails className="h-3.5 w-3.5" />
                            See all {otherModels.length} models
                          </button>
                        )}
                      </div>
                    )}

                    {freeModels.length === 0 && otherModels.length === 0 && (
                      <p className="anim-fade-in rounded-xl border border-dashed border-[var(--border-strong)] px-3 py-4 text-center text-[11px] text-[var(--muted-foreground)]">
                        No models match “{search.trim()}”.
                      </p>
                    )}
                  </>
                )}

                {modelsError && stage === 'connected' && (
                  <div className="flex items-center gap-2 rounded-xl border border-[var(--error)]/25 bg-[var(--error-soft)] px-3 py-2.5">
                    <TbAlertTriangleFilled className="h-4 w-4 shrink-0 text-[var(--error)]" />
                    <p className="min-w-0 flex-1 truncate text-[11px] font-medium text-[var(--error)]">{modelsError}</p>
                  </div>
                )}

                {model && stage === 'connected' && catalog.length > 0 && (
                  <p className="flex items-center gap-1.5 px-1 pt-1 font-mono-code text-[10px] text-[var(--muted-foreground)]">
                    <TbCheck className="h-3 w-3 shrink-0 text-[var(--success)]" />
                    routing tasks via <span className="truncate font-semibold text-[var(--foreground-secondary)]">{model}</span>
                  </p>
                )}
              </section>
            </div>

            {/* Footer actions */}
            <div className="flex gap-2.5 border-t border-[var(--border)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                onClick={handleValidate}
                disabled={!canValidate}
                title={!apiKey.trim() ? 'Paste your API key first' : undefined}
                className="pressable flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] py-2.5 text-xs font-semibold text-[var(--foreground)] hover:border-[var(--brand)] disabled:opacity-50"
              >
                {stage === 'validating' ? (
                  <TbLoaderQuarter className="h-4 w-4 animate-spin text-[var(--brand)]" />
                ) : (
                  <TbActivity className="h-4 w-4 text-[var(--brand)]" />
                )}
                {stage === 'connected' ? 'Re-validate' : 'Validate Key'}
              </button>

              <button
                onClick={handleSave}
                disabled={!canSave}
                title={!canSave ? (stage !== 'connected' ? 'Validate the key first' : 'Pick a model') : undefined}
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

      <ModelPickerModal
        key={modelPicker ?? 'closed'}
        mode={modelPicker}
        onClose={() => setModelPicker(null)}
        catalog={catalog}
        selected={model}
        onSelect={(id) => {
          setModel(id)
          setModelPicker(null)
        }}
        copiedModel={copiedModel}
        onCopy={handleCopyModel}
      />
    </>
  )

  async function handleCopyModel(id: string) {
    try {
      await navigator.clipboard.writeText(id)
      setCopiedModel(id)
      window.setTimeout(() => {
        setCopiedModel((cur) => (cur === id ? null : cur))
      }, 1600)
    } catch {
      /* clipboard unavailable */
    }
  }
}

function StatusIcon({ stage }: { stage: VaultStage }) {
  if (stage === 'connected') {
    return <span className="live-dot mx-1.5" aria-hidden />
  }
  if (stage === 'validating') {
    return <TbLoaderQuarter className="h-4.5 w-4.5 shrink-0 animate-spin text-[var(--brand)]" />
  }
  if (stage === 'error') {
    return <TbAlertTriangleFilled className="h-4.5 w-4.5 shrink-0 text-[var(--error)]" />
  }
  return <span className="mx-1.5 block h-2 w-2 shrink-0 rounded-full bg-[var(--muted-foreground)]" aria-hidden />
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
  entry,
  selected,
  onSelect,
  copied,
  onCopy,
}: {
  entry: ModelEntry
  selected: boolean
  onSelect: () => void
  copied: boolean
  onCopy: () => void
}) {
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
          title={entry.name}
        >
          {entry.name}
        </code>
        {entry.free && !selected && (
          <span className="shrink-0 rounded-full bg-[var(--success-soft)] px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-[var(--success)]">
            Free
          </span>
        )}
      </span>

      <span className="ml-2 flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label={copied ? 'Copied' : `Copy ${entry.id}`}
          onClick={(e) => {
            e.stopPropagation()
            onCopy()
          }}
          className={`pressable rounded-md p-1 transition-opacity ${
            copied
              ? 'text-[var(--success)] opacity-100'
              : 'text-[var(--muted-foreground)] opacity-60 hover:text-[var(--foreground)] group-hover:opacity-100'
          }`}
        >
          {copied ? <TbCheck className="h-3.5 w-3.5" /> : <TbCopy className="h-3.5 w-3.5" />}
        </button>
        {selected && <TbCircleCheckFilled className="h-4 w-4 shrink-0 text-[var(--brand)]" />}
      </span>
    </div>
  )
}

/**
 * Full-catalog picker — RepoPicker-style bottom sheet listing every free
 * (or every) model for the connected provider, with its own search.
 */
function ModelPickerModal({
  mode,
  onClose,
  catalog,
  selected,
  onSelect,
  copiedModel,
  onCopy,
}: {
  mode: 'free' | 'all' | null
  onClose: () => void
  catalog: ModelEntry[]
  selected: string
  onSelect: (id: string) => void
  copiedModel: string | null
  onCopy: (id: string) => void
}) {
  const [query, setQuery] = useState('')

  const list = useMemo(() => {
    const base = mode === 'free' ? catalog.filter((m) => m.free) : catalog
    const q = query.trim().toLowerCase()
    if (!q) return base
    return base.filter((m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q))
  }, [mode, catalog, query])

  return (
    <AnimatePresence>
      {mode && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center sm:justify-center sm:p-6">
          <motion.button
            aria-label="Close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-[rgba(24,30,44,0.35)] backdrop-blur-[4px]"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={mode === 'free' ? 'All free models' : 'All models'}
            initial={{ y: '42%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '55%', opacity: 0.4 }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="relative flex max-h-[76vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[var(--shadow-lg)] sm:max-w-md sm:rounded-[28px]"
          >
            {/* Grab handle (mobile) */}
            <div className="flex justify-center pb-1 pt-3 sm:hidden">
              <span className="h-1 w-9 rounded-full bg-[rgba(18,22,33,0.14)]" />
            </div>

            <div className="flex items-center justify-between px-5 pb-3 pt-1 sm:pt-5">
              <div>
                <h2 className="flex items-center gap-1.5 text-[15px] font-bold tracking-tight">
                  {mode === 'free' ? (
                    <>
                      <TbBolt className="h-4 w-4 text-[var(--success)]" /> Free models
                    </>
                  ) : (
                    'All models'
                  )}
                </h2>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                  {list.length} of {mode === 'free' ? catalog.filter((m) => m.free).length : catalog.length} models
                  {selected && ' · tap one to route tasks through it'}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="pressable rounded-full p-2 text-[var(--muted-foreground)] hover:bg-[var(--brand-soft)] hover:text-[var(--foreground)]"
              >
                <TbX className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 pb-3">
              <div className="relative">
                <TbSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={mode === 'free' ? 'Filter free models…' : 'Filter models…'}
                  className={`${inputCls} py-2 pl-9 pr-9 text-[13px]`}
                  spellCheck={false}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Clear filter"
                    className="pressable absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    <TbX className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 pb-4">
              {list.length === 0 ? (
                <p className="anim-fade-in rounded-xl border border-dashed border-[var(--border-strong)] px-3 py-6 text-center text-[11.5px] text-[var(--muted-foreground)]">
                  No models match “{query.trim()}”.
                </p>
              ) : (
                list.map((m) => (
                  <ModelRow
                    key={m.id}
                    entry={m}
                    selected={selected === m.id}
                    onSelect={() => onSelect(m.id)}
                    copied={copiedModel === m.id}
                    onCopy={() => onCopy(m.id)}
                  />
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
