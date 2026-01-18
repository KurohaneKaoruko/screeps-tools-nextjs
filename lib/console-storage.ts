export interface PersistedConsoleLog {
  message: string
  error?: boolean
  timestamp: number
  shard?: string
}

function fnv1a32(input: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

async function sha256Base64Url(input: string): Promise<string | null> {
  try {
    if (!globalThis.crypto?.subtle) return null
    const data = new TextEncoder().encode(input)
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data)
    const bytes = new Uint8Array(digest)
    let binary = ''
    for (const b of bytes) binary += String.fromCharCode(b)
    const base64 = btoa(binary)
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  } catch {
    return null
  }
}

export async function computeConsoleIdentityKey(input: string): Promise<string> {
  const sha = await sha256Base64Url(input)
  if (sha) return `sha256:${sha}`
  return `fnv1a32:${fnv1a32(input)}`
}

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function pruneTail<T>(items: T[], maxItems: number): T[] {
  if (maxItems <= 0) return []
  if (items.length <= maxItems) return items
  return items.slice(items.length - maxItems)
}

export function getConsoleHistoryStorageKey(identityKey: string): string {
  return `screeps_console_history_v1:${identityKey}`
}

export function readConsoleHistory(identityKey: string, maxItems: number): PersistedConsoleLog[] {
  if (!identityKey) return []
  const key = getConsoleHistoryStorageKey(identityKey)
  const logs = safeJsonParse<PersistedConsoleLog[]>(localStorage.getItem(key), [])
  const normalized = Array.isArray(logs) ? logs : []
  return pruneTail(normalized, maxItems)
}

export function writeConsoleHistory(identityKey: string, logs: PersistedConsoleLog[], maxItems: number): void {
  if (!identityKey) return
  const key = getConsoleHistoryStorageKey(identityKey)
  const pruned = pruneTail(logs, maxItems)
  try {
    localStorage.setItem(key, JSON.stringify(pruned))
  } catch {
    try {
      localStorage.setItem(key, JSON.stringify(pruneTail(pruned, Math.floor(maxItems / 2))))
    } catch {
      localStorage.removeItem(key)
    }
  }
}

export function clearConsoleHistory(identityKey: string): void {
  if (!identityKey) return
  const key = getConsoleHistoryStorageKey(identityKey)
  localStorage.removeItem(key)
}

export function getCommandHistoryStorageKey(identityKey: string): string {
  return `screeps_console_command_history_v1:${identityKey}`
}

export function readCommandHistory(identityKey: string, maxItems: number): string[] {
  if (!identityKey) return []
  const key = getCommandHistoryStorageKey(identityKey)
  const items = safeJsonParse<string[]>(localStorage.getItem(key), [])
  const normalized = Array.isArray(items) ? items.filter(v => typeof v === 'string') : []
  return pruneTail(normalized, maxItems)
}

export function addCommandToHistory(identityKey: string, command: string, maxItems: number): string[] {
  if (!identityKey) return []
  const trimmed = command.trim()
  if (!trimmed) return readCommandHistory(identityKey, maxItems)
  const existing = readCommandHistory(identityKey, maxItems)
  const deduped = [trimmed, ...existing.filter(c => c !== trimmed)]
  const pruned = pruneTail(deduped, maxItems)
  try {
    localStorage.setItem(getCommandHistoryStorageKey(identityKey), JSON.stringify(pruned))
  } catch {
    localStorage.removeItem(getCommandHistoryStorageKey(identityKey))
  }
  return pruned
}
