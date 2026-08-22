const KEY = 'waycode_selected_repo_id'

type Listener = () => void
const listeners = new Set<Listener>()

/** Subscribe to repository-selection changes (same tab + cross-tab). */
export function subscribeRepoStore(onChange: Listener): () => void {
  if (typeof window === 'undefined') return () => {}
  listeners.add(onChange)
  const onStorage = () => onChange()
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onStorage)
  }
}

/** Client snapshot for useSyncExternalStore. */
export function getStoredRepoId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(KEY)
  } catch {
    return null
  }
}

/** Server snapshot for useSyncExternalStore. */
export function getServerRepoId(): string | null {
  return null
}

export function setStoredRepoId(id: string | null): void {
  if (typeof window === 'undefined') return
  try {
    if (id) window.localStorage.setItem(KEY, id)
    else window.localStorage.removeItem(KEY)
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((notify) => notify())
}
