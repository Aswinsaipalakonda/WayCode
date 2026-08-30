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
  TbRocket,
  TbBrandGithub,
  TbTerminal2,
  TbRefresh,
} from 'react-icons/tb'
import { useAppChrome } from '@/components/app-chrome'

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
    hint: '400+ models · Free Gemini, Llama, Qwen, DeepSeek with 1 key',
    color: '#6566f1',
    tint: 'rgba(101, 102, 241, 0.12)',
    Icon: SiOpenrouter,
  },
  {
    id: 'gemini',
    label: 'Google Gemini API',
    hint: 'Direct Google AI Studio billing (AIza... key)',
    color: '#8e75b2',
    tint: 'rgba(142, 117, 178, 0.14)',
    Icon: SiGooglegemini,
  },
  {
    id: 'custom',
    label: 'Custom / Claude',
    hint: 'Anthropic (sk-ant-...) or any OpenAI-compatible Base URL',
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

const QUICK_PICKS: Record<Provider, Array<{ id: string; label: string; tag: string; desc: string }>> = {
  openrouter: [
    {
      id: 'google/gemini-2.0-flash-exp:free',
      label: 'Gemini 2.0 Flash (Free)',
      tag: '100% FREE',
      desc: 'Ultra-fast, massive 1M context, state-of-the-art code generation.',
    },
    {
      id: 'meta-llama/llama-3.3-70b-instruct:free',
      label: 'Llama 3.3 70B (Free)',
      tag: '100% FREE',
      desc: 'Top open-weights coding model with deep architectural reasoning.',
    },
    {
      id: 'qwen/qwen-2.5-coder-32b-instruct:free',
      label: 'Qwen 2.5 Coder 32B (Free)',
      tag: '100% FREE',
      desc: 'Specialized for code review, TypeScript/Python, and AST transformations.',
    },
    {
      id: 'deepseek/deepseek-r1:free',
      label: 'DeepSeek R1 (Free)',
      tag: 'REASONING',
      desc: 'Advanced chain-of-thought logic synthesis and debugging.',
    },
  ],
  gemini: [
    {
      id: 'gemini-2.0-flash',
      label: 'Gemini 2.0 Flash',
      tag: 'GOOGLE API',
      desc: 'Direct Google AI Studio endpoint with high rate limits.',
    },
    {
      id: 'gemini-1.5-pro',
      label: 'Gemini 1.5 Pro',
      tag: '2M CONTEXT',
      desc: 'Deep multi-file analysis across massive repository trees.',
    },
  ],
  custom: [
    {
      id: 'claude-3-5-sonnet-20241022',
      label: 'Claude 3.5 Sonnet',
      tag: 'ANTHROPIC',
      desc: 'Industry benchmark for precise coding, diffing, and system design.',
    },
    {
      id: 'claude-3-5-haiku-20241022',
      label: 'Claude 3.5 Haiku',
      tag: 'FAST & CHEAP',
      desc: 'Low-latency code generation for rapid iteration loops.',
    },
  ],
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

  const chrome = useAppChrome()
  const repositories = useMemo(() => chrome?.repositories ?? [], [chrome?.repositories])
  const selectedRepo = chrome?.selectedRepo ?? null
  const syncRepos = chrome?.syncRepos
  const isSyncing = chrome?.isSyncing ?? false

  const [activeTab, setActiveTab] = useState<'vault' | 'deploy'>('vault')
  const [selectedDeployRepoId, setSelectedDeployRepoId] = useState<string>('')
  const [deployHookUrl, setDeployHookUrl] = useState<string>('')
  const [isSavingHook, setIsSavingHook] = useState(false)
  const [isDeletingHook, setIsDeletingHook] = useState(false)
  const [copiedInbound, setCopiedInbound] = useState(false)
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null)
  const [inboundSnippetTab, setInboundSnippetTab] = useState<'curl' | 'github'>('curl')
  const [repoHooks, setRepoHooks] = useState<Record<string, string>>({})
  const [showPayloadSchema, setShowPayloadSchema] = useState(false)

  const activeDeployRepoId = selectedDeployRepoId || selectedRepo?.id || repositories[0]?.id || ''

  useEffect(() => {
    if (!activeDeployRepoId) return
    let ignore = false
    fetch(`/api/repos/deploy-hook?repoId=${activeDeployRepoId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!ignore && d.success) {
          const val = d.deployWebhookUrl || ''
          setDeployHookUrl(val)
          setRepoHooks((prev) => ({ ...prev, [activeDeployRepoId]: val }))
        }
      })
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [activeDeployRepoId])

  const handleSelectDeployRepo = (id: string) => {
    setSelectedDeployRepoId(id)
    const cached = repoHooks[id]
    if (cached !== undefined) {
      setDeployHookUrl(cached)
    } else {
      const matched = repositories.find((r) => r.id === id)
      setDeployHookUrl(matched?.deploy_webhook_url || '')
    }
  }

  const handleSaveHook = async () => {
    if (!activeDeployRepoId) return
    setIsSavingHook(true)
    try {
      const res = await fetch('/api/repos/deploy-hook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoId: activeDeployRepoId,
          webhookUrl: deployHookUrl.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        toast.error('Failed to save deploy hook', {
          description: data.error || 'Check that the URL is valid and reachable.',
        })
        return
      }
      setRepoHooks((prev) => ({ ...prev, [activeDeployRepoId]: data.deployWebhookUrl || '' }))
      toast.success(data.deployWebhookUrl ? 'Deploy webhook saved' : 'Deploy webhook cleared', {
        description: data.deployWebhookUrl
          ? 'WayCode will POST to this hook whenever approved tasks ship.'
          : 'Webhook removed for this repository.',
      })
    } catch {
      toast.error('Failed to save deploy hook')
    } finally {
      setIsSavingHook(false)
    }
  }

  const handleDeleteHook = async () => {
    if (!activeDeployRepoId) return
    setIsDeletingHook(true)
    try {
      const res = await fetch(`/api/repos/deploy-hook?repoId=${activeDeployRepoId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setDeployHookUrl('')
        setRepoHooks((prev) => ({ ...prev, [activeDeployRepoId]: '' }))
        toast.success('Deploy webhook removed')
      } else {
        toast.error('Failed to remove deploy hook')
      }
    } catch {
      toast.error('Failed to remove deploy hook')
    } finally {
      setIsDeletingHook(false)
    }
  }

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
            <div className="border-b border-[var(--border)] px-5 pt-4">
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--cyan)] text-white shadow-[0_2px_14px_-2px_var(--brand-glow)]">
                    {activeTab === 'vault' ? <TbShieldLock className="h-5 w-5" /> : <TbRocket className="h-5 w-5" />}
                  </span>
                  <div>
                    <h2 className="text-sm font-bold tracking-tight">
                      {activeTab === 'vault' ? 'AI Provider Vault' : 'Deploy Webhooks'}
                    </h2>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      {activeTab === 'vault'
                        ? 'Connectivity · bring your own key · encrypted at rest'
                        : 'Platform-agnostic push-to-deploy · Dokku, Coolify, VPS & AWS'}
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

              {/* Navigation Tabs */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('vault')}
                  className={`pressable flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
                    activeTab === 'vault'
                      ? 'border-[var(--brand)] text-[var(--brand)]'
                      : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  <TbShieldLock className="h-4 w-4" /> AI Vault
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('deploy')}
                  className={`pressable flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
                    activeTab === 'deploy'
                      ? 'border-[var(--brand)] text-[var(--brand)]'
                      : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  <TbRocket className="h-4 w-4" /> Deploy Hooks
                </button>
              </div>
            </div>

            {/* Body */}
            {activeTab === 'vault' ? (
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

                  {/* Contextual guidance when switching to Gemini */}
                  {provider === 'gemini' && (!savedVault?.hasKey || savedVault.provider !== 'gemini') && (
                    <div className="mt-2 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-3 text-[11px] text-purple-950">
                      <div className="flex items-center gap-1.5 font-bold text-purple-700">
                        <SiGooglegemini className="h-3.5 w-3.5" />
                        Google AI Studio API Key
                      </div>
                      <p className="mt-1 text-[10.5px] leading-relaxed text-purple-900/80">
                        Paste your Google Gemini API key (<code className="font-mono-code font-semibold">AIza...</code>) below to connect direct Google billing.
                      </p>
                      <p className="mt-1.5 text-[10px] text-purple-700 font-medium">
                        💡 <strong>Pro-tip:</strong> You can also access Gemini models for free by choosing <strong>OpenRouter</strong> above.
                      </p>
                    </div>
                  )}
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

                {/* Key management */}
                <section className="space-y-2">
                  <SectionLabel
                    icon={<TbKey className="h-3 w-3" />}
                    aside={
                      savedVault?.hasKey ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--success)]">
                          <TbCircleCheckFilled className="h-3.5 w-3.5" /> vault key active
                        </span>
                      ) : undefined
                    }
                  >
                    API Key
                  </SectionLabel>

                  {savedVault?.hasKey && !replacingKey ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="font-mono-code text-xs text-[var(--foreground)]">
                            {savedVault.keyHint ? `••••••••••••${savedVault.keyHint}` : '••••••••••••••••••••••••'}
                          </p>
                          <p className="mt-0.5 text-[10.5px] text-[var(--muted-foreground)]">
                            Encrypted server-side with AES-256-GCM.
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 pl-2">
                          <button
                            type="button"
                            onClick={() => {
                              setReplacingKey(true)
                              updateCredentials({ apiKey: '' })
                            }}
                            className="pressable rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[11px] font-semibold text-[var(--foreground-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveKey}
                            disabled={isRemoving}
                            title="Remove key from vault"
                            className="pressable rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--error-soft)] hover:text-[var(--error)]"
                          >
                            {isRemoving ? (
                              <TbLoaderQuarter className="h-4 w-4 animate-spin" />
                            ) : (
                              <TbTrash className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => updateCredentials({ apiKey: e.target.value })}
                        placeholder={KEY_PLACEHOLDER[provider]}
                        autoComplete="off"
                        spellCheck={false}
                        className={`${inputCls} pr-20 font-mono-code text-xs`}
                      />
                      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={handlePasteKey}
                          aria-label="Paste from clipboard"
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

                {/* Model routing — fully dynamic with Active Hero & Quick-Picks */}
                <section className="space-y-3">
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

                  {/* Active Model Hero Card — Always visible when a model is selected or connected */}
                  {model && (
                    <div className="relative overflow-hidden rounded-2xl border border-[var(--brand)]/30 bg-gradient-to-br from-[var(--brand)]/10 via-[var(--card)] to-[var(--cyan)]/5 p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#10b981]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#10b981]">
                              <TbCircleCheckFilled className="h-3 w-3" />
                              Current Selected Model
                            </span>
                            {model.endsWith(':free') && (
                              <span className="rounded-full bg-[var(--success-soft)] px-2 py-0.5 text-[9.5px] font-bold text-[var(--success)]">
                                100% Free
                              </span>
                            )}
                            <span className="text-[10px] font-semibold text-[var(--muted-foreground)]">
                              via {PROVIDERS.find((p) => p.id === provider)?.label ?? provider}
                            </span>
                          </div>

                          <h3 className="mt-2 font-mono-code text-[13.5px] font-bold text-[var(--foreground)] break-all leading-snug">
                            {model}
                          </h3>

                          <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                            All autonomous agent tasks & code modifications will execute using this engine.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Curated Quick-Picks for Instant 1-Tap Switch */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-0.5">
                      <span className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                        <TbBolt className="h-3 w-3 text-amber-500" />
                        Recommended Models
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {(QUICK_PICKS[provider] || []).map((pick) => {
                        const isSelected = model === pick.id
                        return (
                          <button
                            key={pick.id}
                            type="button"
                            onClick={() => setModel(pick.id)}
                            className={`pressable flex flex-col justify-between rounded-xl border p-2.5 text-left transition-all ${
                              isSelected
                                ? 'border-[var(--brand)] bg-[var(--brand-soft)] shadow-[0_0_0_2px_var(--brand)]'
                                : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--card-hover)]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="text-xs font-bold text-[var(--foreground)] leading-tight">
                                {pick.label}
                              </span>
                              {isSelected ? (
                                <TbCircleCheckFilled className="h-4 w-4 shrink-0 text-[var(--brand)]" />
                              ) : (
                                <span className="rounded bg-black/5 px-1.5 py-0.5 font-mono-code text-[8px] font-bold text-[var(--muted-foreground)]">
                                  {pick.tag}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-[10px] text-[var(--muted-foreground)] leading-snug line-clamp-2">
                              {pick.desc}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {stage !== 'connected' && (
                    <div className="rounded-xl border border-dashed border-[var(--border-strong)] px-3 py-4 text-center">
                      <TbCpu className="mx-auto h-5 w-5 text-[var(--muted-foreground)] opacity-60" />
                      <p className="mt-1.5 text-[11.5px] font-medium text-[var(--muted-foreground)]">
                        Validate your key to load the{' '}
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
                          placeholder="Search 400+ models…"
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

                      {/* Free models preview */}
                      {freeModels.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between px-1">
                            <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--success)]">
                              <TbBolt className="h-3.5 w-3.5" /> Free Models ({freeModels.length})
                            </span>
                            {freeModels.length > 5 && (
                              <button
                                type="button"
                                onClick={() => setModelPicker('free')}
                                className="pressable flex items-center gap-1 text-[10.5px] font-semibold text-[var(--brand)] hover:underline"
                              >
                                View all {freeModels.length}
                              </button>
                            )}
                          </div>
                          <div className="space-y-1">
                            {freeModels.slice(0, 5).map((m) => (
                              <ModelRow
                                key={m.id}
                                entry={m}
                                selected={model === m.id}
                                onSelect={() => setModel(m.id)}
                                copied={copiedModel === m.id}
                                onCopy={() => handleCopyModel(m.id)}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* All models preview */}
                      {otherModels.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[11px] font-bold text-[var(--foreground-secondary)]">
                              All Models ({otherModels.length})
                            </span>
                            {otherModels.length > 5 && (
                              <button
                                type="button"
                                onClick={() => setModelPicker('all')}
                                className="pressable flex items-center gap-1 text-[10.5px] font-semibold text-[var(--brand)] hover:underline"
                              >
                                View all {catalog.length}
                              </button>
                            )}
                          </div>
                          <div className="space-y-1">
                            {otherModels.slice(0, 5).map((m) => (
                              <ModelRow
                                key={m.id}
                                entry={m}
                                selected={model === m.id}
                                onSelect={() => setModel(m.id)}
                                copied={copiedModel === m.id}
                                onCopy={() => handleCopyModel(m.id)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {modelsError && stage === 'connected' && (
                    <div className="flex items-center gap-2 rounded-xl border border-[var(--error)]/25 bg-[var(--error-soft)] px-3 py-2.5">
                      <TbAlertTriangleFilled className="h-4 w-4 shrink-0 text-[var(--error)]" />
                      <p className="min-w-0 flex-1 truncate text-[11px] font-medium text-[var(--error)]">{modelsError}</p>
                    </div>
                  )}
                </section>
              </div>
            ) : (
              /* Deploy Webhooks Panel */
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                {/* Outbound Webhook Section */}
                <section className="space-y-3">
                  <SectionLabel icon={<TbRocket className="h-3 w-3" />}>
                    Outbound Deploy Trigger (Per-Repo)
                  </SectionLabel>

                  <p className="text-[11.5px] text-[var(--muted-foreground)] leading-relaxed">
                    WayCode sends an HTTP POST immediately after you review and approve changes on a task branch.
                  </p>

                  {repositories.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-4 text-center">
                      <TbBrandGithub className="mx-auto h-6 w-6 text-[var(--muted-foreground)] opacity-60" />
                      <p className="mt-2 text-xs font-semibold text-[var(--foreground)]">No repositories connected</p>
                      <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                        Sync your GitHub repositories to configure custom deploy hooks.
                      </p>
                      {syncRepos && (
                        <button
                          type="button"
                          onClick={() => syncRepos()}
                          disabled={isSyncing}
                          className="btn-brand pressable mt-3 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold"
                        >
                          <TbRefresh className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                          {isSyncing ? 'Syncing…' : 'Sync GitHub Repos'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
                          Select Repository
                        </label>
                        <select
                          value={activeDeployRepoId}
                          onChange={(e) => handleSelectDeployRepo(e.target.value)}
                          className={inputCls}
                        >
                          {repositories.map((r) => {
                            const isConfigured = Boolean(repoHooks[r.id] || r.deploy_webhook_url)
                            return (
                              <option key={r.id} value={r.id}>
                                {r.repo_name} {isConfigured ? '✓ (configured)' : ''}
                              </option>
                            )
                          })}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
                          Webhook Target URL
                        </label>
                        <input
                          type="url"
                          value={deployHookUrl}
                          onChange={(e) => setDeployHookUrl(e.target.value)}
                          placeholder="https://dokku.example.com/app/deploy"
                          className={`${inputCls} font-mono-code text-xs`}
                          spellCheck={false}
                        />
                        <p className="mt-1.5 text-[10.5px] text-[var(--muted-foreground)]">
                          Supports Dokku, Coolify, AWS CodePipeline, Render, or any custom webhook receiver.
                        </p>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleSaveHook}
                          disabled={isSavingHook || !activeDeployRepoId}
                          className="btn-brand pressable flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold"
                        >
                          {isSavingHook ? (
                            <TbLoaderQuarter className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <TbCheck className="h-3.5 w-3.5" />
                          )}
                          Save Hook
                        </button>
                        {repoHooks[activeDeployRepoId] && (
                          <button
                            type="button"
                            onClick={handleDeleteHook}
                            disabled={isDeletingHook}
                            className="pressable flex items-center justify-center gap-1.5 rounded-xl border border-[var(--error)]/30 bg-[var(--error-soft)] px-3 py-2 text-xs font-semibold text-[var(--error)] hover:bg-[var(--error-soft)]/80"
                          >
                            {isDeletingHook ? (
                              <TbLoaderQuarter className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <TbTrash className="h-3.5 w-3.5" />
                            )}
                            Remove
                          </button>
                        )}
                      </div>

                      {/* Payload Schema Preview */}
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                        <button
                          type="button"
                          onClick={() => setShowPayloadSchema((v) => !v)}
                          className="flex w-full items-center justify-between text-left text-[11px] font-bold text-[var(--foreground-secondary)]"
                        >
                          <span className="flex items-center gap-1.5">
                            <TbTerminal2 className="h-3.5 w-3.5 text-[var(--brand)]" />
                            Outbound Payload Schema
                          </span>
                          <span className="text-[10px] text-[var(--muted-foreground)]">
                            {showPayloadSchema ? 'Hide' : 'View JSON'}
                          </span>
                        </button>

                        {showPayloadSchema && (
                          <pre className="mt-2.5 overflow-x-auto rounded-lg bg-[var(--card)] p-2.5 font-mono-code text-[10px] text-[var(--muted-foreground)]">
{JSON.stringify(
  {
    event: 'waycode.task.shipped',
    taskId: 'c9b4e28f-...',
    repo: repositories.find((r) => r.id === activeDeployRepoId)?.repo_name || 'owner/repo',
    branch: 'waycode/add-auth-flow',
    prompt: 'Implement auth with session checks',
    pullRequestUrl: 'https://github.com/owner/repo/pull/12',
    timestamp: new Date().toISOString(),
  },
  null,
  2
)}
                          </pre>
                        )}
                      </div>
                    </div>
                  )}
                </section>

                <hr className="border-[var(--border)]" />

                {/* Inbound Webhook Section */}
                <section className="space-y-3">
                  <SectionLabel icon={<TbPlugConnected className="h-3 w-3" />}>
                    Inbound Webhook (Build Status)
                  </SectionLabel>

                  <p className="text-[11.5px] text-[var(--muted-foreground)] leading-relaxed">
                    When your CI/CD or VPS finishes deploying, POST to WayCode to receive live URL confirmations via WhatsApp and Web Push.
                  </p>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
                      Webhook URL
                    </label>
                    <div className="flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-1.5 pl-3">
                      <code className="min-w-0 flex-1 truncate font-mono-code text-[11px] text-[var(--foreground)]">
                        {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/deploy` : '/api/webhooks/deploy'}
                      </code>
                      <button
                        type="button"
                        onClick={async () => {
                          const url = `${window.location.origin}/api/webhooks/deploy`
                          await navigator.clipboard.writeText(url)
                          setCopiedInbound(true)
                          setTimeout(() => setCopiedInbound(false), 1600)
                        }}
                        className="pressable flex items-center gap-1 rounded-lg bg-[var(--card)] px-2.5 py-1 text-[11px] font-semibold text-[var(--foreground-secondary)] shadow-sm hover:text-[var(--brand)]"
                      >
                        {copiedInbound ? <TbCheck className="h-3.5 w-3.5 text-[var(--success)]" /> : <TbCopy className="h-3.5 w-3.5" />}
                        {copiedInbound ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* Snippets */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
                        Example Integration
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setInboundSnippetTab('curl')}
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                            inboundSnippetTab === 'curl'
                              ? 'bg-[var(--brand-soft)] text-[var(--brand)]'
                              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                          }`}
                        >
                          cURL
                        </button>
                        <button
                          type="button"
                          onClick={() => setInboundSnippetTab('github')}
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                            inboundSnippetTab === 'github'
                              ? 'bg-[var(--brand-soft)] text-[var(--brand)]'
                              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                          }`}
                        >
                          GitHub Actions
                        </button>
                      </div>
                    </div>

                    <div className="relative rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                      <button
                        type="button"
                        onClick={async () => {
                          const snippet =
                            inboundSnippetTab === 'curl'
                              ? `curl -X POST "${window.location.origin}/api/webhooks/deploy" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "branch": "waycode/feature-name",\n    "status": "success",\n    "url": "https://my-app.example.com",\n    "source": "Dokku"\n  }'`
                              : `- name: Notify WayCode\n  if: always()\n  run: |\n    curl -X POST "${window.location.origin}/api/webhooks/deploy" \\\n      -H "Content-Type: application/json" \\\n      -d '{\n        "branch": "\${{ github.head_ref || github.ref_name }}",\n        "status": "\${{ job.status }}",\n        "url": "https://preview.example.com",\n        "source": "GitHub Actions"\n      }'`
                          await navigator.clipboard.writeText(snippet)
                          setCopiedSnippet(inboundSnippetTab)
                          setTimeout(() => setCopiedSnippet(null), 1600)
                        }}
                        className="absolute right-2.5 top-2.5 pressable rounded-md bg-[var(--card)] p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        title="Copy snippet"
                      >
                        {copiedSnippet === inboundSnippetTab ? (
                          <TbCheck className="h-3.5 w-3.5 text-[var(--success)]" />
                        ) : (
                          <TbCopy className="h-3.5 w-3.5" />
                        )}
                      </button>

                      <pre className="overflow-x-auto font-mono-code text-[10px] text-[var(--foreground-secondary)] pr-6 leading-relaxed">
                        {inboundSnippetTab === 'curl' ? (
                          `curl -X POST "${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/deploy" \\
  -H "Content-Type: application/json" \\
  -d '{
    "branch": "waycode/feature-name",
    "status": "success",
    "url": "https://my-app.example.com",
    "source": "Dokku"
  }'`
                        ) : (
                          `- name: Notify WayCode
  if: always()
  run: |
    curl -X POST "${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/deploy" \\
      -H "Content-Type: application/json" \\
      -d '{
        "branch": "\${{ github.head_ref || github.ref_name }}",
        "status": "\${{ job.status }}",
        "url": "https://preview.example.com",
        "source": "GitHub Actions"
      }'`
                        )}
                      </pre>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* Footer actions */}
            {activeTab === 'vault' ? (
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
                  Save & Route Tasks
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between border-t border-[var(--border)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <span className="text-[11px] text-[var(--muted-foreground)]">
                  {repoHooks[selectedDeployRepoId] ? 'Hook active for selected repo' : 'No hook configured'}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="pressable rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--card-hover)]"
                >
                  Done
                </button>
              </div>
            )}
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
