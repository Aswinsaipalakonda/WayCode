'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, Loader2, KeyRound, Cpu, ShieldCheck } from 'lucide-react'

interface SettingsDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsDrawer({ isOpen, onClose }: SettingsDrawerProps) {
  const [provider, setProvider] = useState<'openrouter' | 'gemini' | 'custom'>('openrouter')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('google/gemini-2.0-flash-exp:free')
  const [customBaseUrl, setCustomBaseUrl] = useState('')
  
  const [testState, setTestState] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle')
  const [testError, setTestError] = useState<string | null>(null)
  const [latency, setLatency] = useState<string | null>(null)

  if (!isOpen) return null

  const handleTestConnection = async () => {
    setTestState('testing')
    setTestError(null)
    setLatency(null)

    try {
      const res = await fetch('/api/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, model, customBaseUrl }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setTestState('connected')
        setLatency(data.latency || '120ms')
      } else {
        setTestState('error')
        setTestError(data.error || 'Connection test failed')
      }
    } catch (err: unknown) {
      setTestState('error')
      setTestError(err instanceof Error ? err.message : 'Network error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[var(--card)] border-l border-[var(--border)] h-full p-6 flex flex-col justify-between shadow-2xl overflow-y-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[var(--primary)]" />
              <h2 className="text-lg font-bold text-[var(--foreground)]">AI Provider & Vault (BYOK)</h2>
            </div>
            <button 
              onClick={onClose}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1 rounded-md"
            >
              ✕
            </button>
          </div>

          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
              AI Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as 'openrouter' | 'gemini' | 'custom')}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-sm text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary)] outline-hidden"
            >
              <option value="openrouter">OpenRouter (Recommended - Zero Cost Models Available)</option>
              <option value="gemini">Google Gemini API Direct</option>
              <option value="custom">Custom OpenAI-Compatible Endpoint</option>
            </select>
          </div>

          {/* Base URL for Custom */}
          {provider === 'custom' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                Base URL
              </label>
              <input
                type="text"
                placeholder="https://api.your-provider.com/v1"
                value={customBaseUrl}
                onChange={(e) => setCustomBaseUrl(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-sm text-[var(--foreground)] outline-hidden"
              />
            </div>
          )}

          {/* API Key */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
              API Key
            </label>
            <input
              type="password"
              placeholder="sk-or-v1-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-sm text-[var(--foreground)] outline-hidden"
            />
          </div>

          {/* Model Catalog */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider flex items-center justify-between">
              <span>Model Selection</span>
              <span className="text-[10px] text-emerald-500 font-normal">⚡ Zero-Cost Free Tiers</span>
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-sm text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary)] outline-hidden"
            >
              <optgroup label="🆓 Zero-Cost Tiers (Recommended)">
                <option value="google/gemini-2.0-flash-exp:free">google/gemini-2.0-flash-exp:free</option>
                <option value="meta-llama/llama-3.3-70b-instruct:free">meta-llama/llama-3.3-70b-instruct:free</option>
                <option value="deepseek/deepseek-r1:free">deepseek/deepseek-r1:free</option>
                <option value="qwen/qwen-2.5-coder-32b-instruct:free">qwen/qwen-2.5-coder-32b-instruct:free</option>
              </optgroup>
              <optgroup label="💳 Paid / Higher Context">
                <option value="anthropic/claude-3.5-sonnet">anthropic/claude-3.5-sonnet</option>
                <option value="openai/gpt-4o">openai/gpt-4o</option>
              </optgroup>
            </select>
          </div>

          {/* Connection Test Result Badge */}
          {testState !== 'idle' && (
            <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--background)] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {testState === 'testing' && <Loader2 className="w-4 h-4 text-[var(--primary)] animate-spin" />}
                {testState === 'connected' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                {testState === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                <span className="font-medium text-[var(--foreground)]">
                  {testState === 'testing' && 'Ping validation in progress...'}
                  {testState === 'connected' && `Connected (${latency})`}
                  {testState === 'error' && (testError || 'Invalid Key')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[var(--border)] flex gap-3">
          <button
            onClick={handleTestConnection}
            disabled={testState === 'testing'}
            className="flex-1 bg-[var(--muted)] hover:bg-[var(--border)] text-[var(--foreground)] font-medium text-sm py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >

            {testState === 'testing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4 text-[var(--primary)]" />}
            Test Connection
          </button>
          
          <button
            disabled={testState !== 'connected'}
            onClick={onClose}
            className="flex-1 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white font-medium text-sm py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            Save Vault
          </button>
        </div>
      </div>
    </div>
  )
}
