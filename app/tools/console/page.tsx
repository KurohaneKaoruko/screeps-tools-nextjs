'use client'

import { useState, useEffect, useRef } from 'react'
import { ScreepsApiClient } from '@/lib/screeps-client'
import { useScreepsSocket } from '@/hooks/useScreepsSocket'
import CustomSelect from '@/components/CustomSelect'
import { addCommandToHistory, computeConsoleIdentityKey, readCommandHistory } from '@/lib/console-storage'

interface ConsoleLog {
  _id?: string
  message: string

  error?: boolean
  timestamp: number
  shard?: string
}

interface SavedToken {
  name: string
  token: string
}

interface SavedCommand {
  id: string
  name: string
  command: string
  timestamp: number
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function sanitizeConsoleHtml(raw: string, scopeId: string): string {
  if (!raw) return ''
  if (typeof document === 'undefined') return escapeHtml(raw)
  const looksLikeHtml = /<\/?[a-zA-Z][\s>]/.test(raw) || raw.includes('<style') || raw.includes('<br')
  if (!looksLikeHtml) return escapeHtml(raw)

  const blockedTags = new Set([
    'OBJECT',
    'EMBED',
    'LINK',
    'META',
    'BASE',
    'FORM'
  ])

  const urlAttrs = new Set(['href', 'src', 'xlink:href', 'action', 'formaction', 'poster'])

  const escapeAttrValue = (value: string) => value.replace(/[\u0000-\u001f\u007f]/g, '')

  const isSafeUrl = (value: string): boolean => {
    const v = value.trim()
    if (!v) return false
    if (v.startsWith('#')) return true
    if (v.startsWith('/')) return true
    const lower = v.toLowerCase()
    if (lower.startsWith('http://') || lower.startsWith('https://')) return true
    if (lower.startsWith('mailto:') || lower.startsWith('tel:')) return true
    if (lower.startsWith('data:')) {
      return /^data:image\/(png|jpeg|jpg|gif|webp);base64,[a-z0-9+/=]+$/i.test(v)
    }
    return false
  }

  const sanitizeInlineStyle = (value: string): string => {
    const v = value
    const lowered = v.toLowerCase()
    if (
      lowered.includes('expression') ||
      lowered.includes('javascript:') ||
      lowered.includes('-moz-binding') ||
      lowered.includes('behavior:')
    ) {
      return ''
    }
    return v.replace(/[\u0000-\u001f\u007f]/g, '')
  }

  const cssScopePrefix = `[data-console-scope="${scopeId.replace(/["\\]/g, '\\$&')}"]`

  const scopeSelectors = (selectors: string): string => {
    return selectors
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => (s.includes(cssScopePrefix) ? s : `${cssScopePrefix} ${s}`))
      .join(', ')
  }

  const scopeCss = (css: string): string => {
    const process = (input: string): string => {
      let i = 0
      const n = input.length
      let out = ''

      const consumeTrivia = () => {
        while (i < n) {
          const ch = input[i]!
          if (/\s/.test(ch)) {
            out += ch
            i++
            continue
          }
          if (ch === '/' && input[i + 1] === '*') {
            const start = i
            i += 2
            while (i < n && !(input[i] === '*' && input[i + 1] === '/')) i++
            i = Math.min(n, i + 2)
            out += input.slice(start, i)
            continue
          }
          break
        }
      }

      const readUntilStop = (stops: Set<string>): string => {
        let start = i
        while (i < n) {
          const ch = input[i]!
          if (stops.has(ch)) break
          if (ch === '"' || ch === "'") {
            const quote = ch
            i++
            while (i < n) {
              const qch = input[i]!
              if (qch === '\\') {
                i += 2
                continue
              }
              i++
              if (qch === quote) break
            }
            continue
          }
          if (ch === '/' && input[i + 1] === '*') {
            i += 2
            while (i < n && !(input[i] === '*' && input[i + 1] === '/')) i++
            i = Math.min(n, i + 2)
            continue
          }
          i++
        }
        return input.slice(start, i)
      }

      const readBlockRaw = (): string => {
        const start = i
        let depth = 0
        while (i < n) {
          const ch = input[i]!
          if (ch === '{') {
            depth++
            i++
            continue
          }
          if (ch === '}') {
            depth--
            i++
            if (depth === 0) return input.slice(start, i)
            continue
          }
          if (ch === '"' || ch === "'") {
            const quote = ch
            i++
            while (i < n) {
              const qch = input[i]!
              if (qch === '\\') {
                i += 2
                continue
              }
              i++
              if (qch === quote) break
            }
            continue
          }
          if (ch === '/' && input[i + 1] === '*') {
            i += 2
            while (i < n && !(input[i] === '*' && input[i + 1] === '/')) i++
            i = Math.min(n, i + 2)
            continue
          }
          i++
        }
        return input.slice(start)
      }

      while (i < n) {
        consumeTrivia()
        if (i >= n) break

        if (input[i] === '@') {
          const atStart = i
          i++
          const name = readUntilStop(new Set([' ', '\t', '\r', '\n', '{', ';'])).trim().toLowerCase()
          const prelude = readUntilStop(new Set(['{', ';']))
          if (i < n && input[i] === ';') {
            i++
            out += input.slice(atStart, i)
            continue
          }
          if (i < n && input[i] === '{') {
            const header = input.slice(atStart, i + 1)
            const block = readBlockRaw()
            const inner = block.slice(1, -1)
            if (name.endsWith('keyframes')) {
              out += header + inner + '}'
            } else {
              out += header + process(inner) + '}'
            }
            continue
          }
          out += '@' + name + prelude
          continue
        }

        const selectorText = readUntilStop(new Set(['{']))
        if (i >= n || input[i] !== '{') {
          out += selectorText
          break
        }
        const scoped = scopeSelectors(selectorText)
        out += scoped
        const block = readBlockRaw()
        out += block
      }
      return out
    }

    return process(css)
  }

  const template = document.createElement('template')
  template.innerHTML = raw

  const sanitizeElement = (el: Element) => {
    const tag = el.tagName.toUpperCase()
    if (tag === 'SCRIPT') {
      const scriptEl = el as HTMLScriptElement
      const pre = document.createElement('pre')
      pre.setAttribute('style', 'white-space:pre-wrap;overflow:auto;max-height:240px;')
      const header = scriptEl.src ? `/* src: ${scriptEl.src} */\n` : ''
      pre.textContent = header + (scriptEl.textContent || '')
      el.replaceWith(pre)
      return
    }
    if (tag === 'IFRAME') {
      ;(el as HTMLIFrameElement).setAttribute('sandbox', '')
      ;(el as HTMLIFrameElement).setAttribute('referrerpolicy', 'no-referrer')
      ;(el as HTMLIFrameElement).setAttribute('loading', 'lazy')
      el.removeAttribute('srcdoc')
    }
    if (blockedTags.has(tag)) {
      el.parentNode?.removeChild(el)
      return
    }

    if (tag === 'STYLE') {
      const css = el.textContent || ''
      const lowered = css.toLowerCase()
      if (
        lowered.includes('@import') ||
        lowered.includes('expression') ||
        lowered.includes('javascript:')
      ) {
        el.parentNode?.removeChild(el)
        return
      }
      el.textContent = scopeCss(css)
      return
    }

    for (const attr of Array.from(el.attributes)) {
      const name = attr.name
      const value = attr.value
      const lowerName = name.toLowerCase()

      if (lowerName.startsWith('on')) {
        el.removeAttribute(name)
        continue
      }

      if (urlAttrs.has(lowerName)) {
        if (isSafeUrl(value)) {
          el.setAttribute(name, escapeAttrValue(value))
        } else {
          el.removeAttribute(name)
        }
        continue
      }

      if (lowerName === 'style') {
        const sanitized = sanitizeInlineStyle(value)
        if (sanitized) el.setAttribute('style', sanitized)
        else el.removeAttribute(name)
        continue
      }

      if (lowerName === 'srcset') {
        el.removeAttribute(name)
        continue
      }

      el.setAttribute(name, escapeAttrValue(value))
    }

    if (tag === 'A') {
      const target = (el as HTMLAnchorElement).getAttribute('target')
      if (target && target.toLowerCase() === '_blank') {
        const rel = (el as HTMLAnchorElement).getAttribute('rel') || ''
        const tokens = new Set(rel.split(/\s+/).filter(Boolean).map(t => t.toLowerCase()))
        tokens.add('noopener')
        tokens.add('noreferrer')
        ;(el as HTMLAnchorElement).setAttribute('rel', Array.from(tokens).join(' '))
      }
    }
  }

  const walk = (node: Node) => {
    if (node.nodeType === Node.COMMENT_NODE) {
      node.parentNode?.removeChild(node)
      return
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      const children = Array.from(el.childNodes)
      sanitizeElement(el)
      if (!el.isConnected) return
      for (const child of children) walk(child)
    }
  }

  for (const child of Array.from(template.content.childNodes)) walk(child)
  return template.innerHTML
}

export default function ConsolePage() {
  const MAX_COMMAND_HISTORY = 200
  const MAX_SUGGESTIONS = 8
  const COMMAND_INPUT_MIN_HEIGHT = 44
  const COMMAND_INPUT_MAX_HEIGHT = 180
  const MAX_HTML_IFRAME_HEIGHT = 320

  const looksLikeHtmlMessage = (raw: string) =>
    /<\/?[a-zA-Z][\s>]/.test(raw) || raw.includes('<style') || raw.includes('<br')

  const buildSandboxSrcDoc = (html: string, id: string) => {
    const safeId = id.replace(/["\\]/g, '\\$&')
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <base target="_blank" />
    <style>
      html, body { margin: 0; padding: 0; background: transparent; }
      body {
        color: #e5e7eb;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 12px;
        line-height: 1.25;
        white-space: pre-wrap;
        overflow: auto;
      }
      a { color: #5973ff; }
    </style>
  </head>
  <body>
    <div id="root">${html}</div>
    <script>
      (function () {
        var id = "${safeId}";
        function postHeight() {
          try {
            var h = Math.max(
              document.documentElement.scrollHeight || 0,
              document.body.scrollHeight || 0
            );
            window.parent.postMessage({ type: "console-html-height", id: id, height: h }, "*");
          } catch (e) {}
        }
        var ro = null;
        if (typeof ResizeObserver !== "undefined") {
          ro = new ResizeObserver(function () { postHeight(); });
          ro.observe(document.documentElement);
        } else {
          var mo = new MutationObserver(function () { postHeight(); });
          mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
        }
        window.addEventListener("load", postHeight);
        postHeight();
        setInterval(postHeight, 500);
      })();
    </script>
  </body>
</html>`
  }

  const [htmlIframeHeights, setHtmlIframeHeights] = useState<Record<string, number>>({})

  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isSavedCommandsOpen, setIsSavedCommandsOpen] = useState(false)
  const [token, setToken] = useState('')
  const [savedTokens, setSavedTokens] = useState<SavedToken[]>([])
  const [savedCommands, setSavedCommands] = useState<SavedCommand[]>([])
  const [tokenName, setTokenName] = useState('')
  const [commandName, setCommandName] = useState('')
  const [selectedTokenIndex, setSelectedTokenIndex] = useState<number | -1>(-1)
  const [shard, setShard] = useState('shard0')
  const [command, setCommand] = useState('')
  const [connectionMode, setConnectionMode] = useState<'self' | 'spectator'>('self')
  const [targetUsername, setTargetUsername] = useState('')

  const [logs, setLogs] = useState<ConsoleLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const logsContainerRef = useRef<HTMLDivElement>(null)
  const [identityKey, setIdentityKey] = useState('')
  const identityDebounceTimeoutRef = useRef<number | null>(null)
  const commandInputRef = useRef<HTMLTextAreaElement>(null)
  const settingsButtonRef = useRef<HTMLButtonElement>(null)
  const settingsPanelRef = useRef<HTMLDivElement>(null)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0)
  
  // Environment variable to control spectator mode availability
  // Default to false if not specified (only enable if explicitly set to 'true')
  const enableSpectatorMode = process.env.NEXT_PUBLIC_ENABLE_CONSOLE_SPECTATOR_MODE === 'true'

  const { status, connect, disconnect } = useScreepsSocket((newLogs) => {
    setLogs(prev => {
        // 转换 Hook 中的日志格式到组件的日志格式
        const mappedLogs = newLogs.map(l => ({
            message: l.line,
            error: l.error,
            timestamp: l.timestamp,
            shard: l.shard
        }))
        return [...prev, ...mappedLogs]
    })
  }, (err) => {
      // 连接错误回调
      setLogs(prev => [...prev, {
          message: `连接失败: ${err.message}`,
          error: true,
          timestamp: Date.now()
      }])
  })

  useEffect(() => {

    const savedToken = localStorage.getItem('screeps_token')

    if (savedToken) {
      setToken(savedToken)
    }
    const savedShard = localStorage.getItem('screeps_shard')
    if (savedShard) {
      setShard(savedShard)
    }
    const storedTokens = localStorage.getItem('screeps_saved_tokens')
    if (storedTokens) {
      try {
        const parsed = JSON.parse(storedTokens)
        if (Array.isArray(parsed)) {
          setSavedTokens(parsed)
        }
      } catch (e) {
        console.error('Failed to parse saved tokens', e)
      }
    }
    const storedCommands = localStorage.getItem('screeps_saved_commands')
    if (storedCommands) {
      try {
        const parsed = JSON.parse(storedCommands)
        if (Array.isArray(parsed)) {
          setSavedCommands(parsed)
        }
      } catch (e) {
        console.error('Failed to parse saved commands', e)
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    if (identityDebounceTimeoutRef.current) {
      window.clearTimeout(identityDebounceTimeoutRef.current)
      identityDebounceTimeoutRef.current = null
    }

    const source =
      connectionMode === 'self'
        ? token.trim()
        : (targetUsername || '').trim()

    if (!source) {
      setIdentityKey('')
      return
    }

    identityDebounceTimeoutRef.current = window.setTimeout(() => {
      ;(async () => {
        const prefix = connectionMode === 'self' ? 'self:' : 'spectator:'
        const key = await computeConsoleIdentityKey(prefix + source)
        if (cancelled) return
        setIdentityKey(key)
      })()
    }, 250)

    return () => {
      cancelled = true
      if (identityDebounceTimeoutRef.current) {
        window.clearTimeout(identityDebounceTimeoutRef.current)
        identityDebounceTimeoutRef.current = null
      }
    }
  }, [token, targetUsername, connectionMode])

  useEffect(() => {
    if (!isSidebarOpen) return
    const onPointerDown = (e: MouseEvent) => {
      const panel = settingsPanelRef.current
      const btn = settingsButtonRef.current
      const target = e.target as Node | null
      if (!target) return
      if (panel?.contains(target)) return
      if (btn?.contains(target)) return
      setIsSidebarOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [isSidebarOpen])

  useEffect(() => {
    if (!identityKey) {
      setCommandHistory([])
      return
    }
    setCommandHistory(readCommandHistory(identityKey, MAX_COMMAND_HISTORY))
  }, [identityKey])

  useEffect(() => {
    const lastLine = command.split('\n').at(-1) ?? ''
    const indent = lastLine.match(/^\s*/)?.[0] ?? ''
    const prefix = lastLine.slice(indent.length).trim()
    if (!prefix) {
      setIsAutocompleteOpen(false)
      setSuggestions([])
      setActiveSuggestionIndex(0)
      return
    }

    const next = commandHistory
      .filter(c => c.startsWith(prefix))
      .slice(0, MAX_SUGGESTIONS)

    if (next.length === 0) {
      setIsAutocompleteOpen(false)
      setSuggestions([])
      setActiveSuggestionIndex(0)
      return
    }

    setSuggestions(next)
    setIsAutocompleteOpen(true)
    setActiveSuggestionIndex(i => Math.min(i, next.length - 1))
  }, [command, commandHistory])

  useEffect(() => {
    const el = commandInputRef.current
    if (!el) return
    el.style.height = 'auto'
    const nextHeight = Math.min(Math.max(el.scrollHeight, COMMAND_INPUT_MIN_HEIGHT), COMMAND_INPUT_MAX_HEIGHT)
    el.style.height = `${nextHeight}px`
    el.style.overflowY = el.scrollHeight > COMMAND_INPUT_MAX_HEIGHT ? 'auto' : 'hidden'
  }, [command, connectionMode])

  useEffect(() => {
    if (autoScroll && logsContainerRef.current) {
      const { scrollHeight, clientHeight } = logsContainerRef.current
      // 只有当内容高度超过容器高度时才滚动，且只滚动容器内部
      if (scrollHeight > clientHeight) {
          logsContainerRef.current.scrollTo({
              top: scrollHeight,
              behavior: 'smooth'
          })
      }
    }
  }, [logs, autoScroll])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as any
      if (!data || data.type !== 'console-html-height') return
      const id = typeof data.id === 'string' ? data.id : ''
      const height = typeof data.height === 'number' ? data.height : NaN
      if (!id || !Number.isFinite(height)) return
      const next = Math.max(24, Math.min(height, MAX_HTML_IFRAME_HEIGHT))
      setHtmlIframeHeights(prev => (prev[id] === next ? prev : { ...prev, [id]: next }))
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // Cleanup injected styles on unmount
  useEffect(() => {
    return () => {
      const styles = document.head.querySelectorAll('style[data-screeps-console]')
      styles.forEach(style => style.remove())
    }
  }, [])

  // Auto-connect when token changes
  useEffect(() => {
    if (connectionMode === 'self') {
        if (token) {
            connect(token)
        } else {
            disconnect()
        }
    } else {
        // Spectator mode: manual connect
        // 切换到观察模式时，主动断开之前的连接
        disconnect()
    }
  }, [token, connectionMode, connect, disconnect])

  const handleSpectatorConnect = () => {
      if (!enableSpectatorMode) return
      
      if (connectionMode === 'spectator' && targetUsername) {
          // 观察模式完全不传 Token
          connect('', targetUsername)
      }
  }



  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newToken = e.target.value
    setToken(newToken)
    localStorage.setItem('screeps_token', newToken)
    setSelectedTokenIndex(-1) // Reset selection when manually editing
  }

  const saveToken = () => {
    if (!tokenName.trim() || !token.trim()) return
    
    const newSavedTokens = [...savedTokens, { name: tokenName, token }]
    setSavedTokens(newSavedTokens)
    localStorage.setItem('screeps_saved_tokens', JSON.stringify(newSavedTokens))
    setTokenName('')
    setSelectedTokenIndex(newSavedTokens.length - 1)
  }

  const deleteToken = (index: number) => {
    const newSavedTokens = savedTokens.filter((_, i) => i !== index)
    setSavedTokens(newSavedTokens)
    localStorage.setItem('screeps_saved_tokens', JSON.stringify(newSavedTokens))
    if (selectedTokenIndex === index) {
      setSelectedTokenIndex(-1)
      setToken('')
      localStorage.removeItem('screeps_token')
    } else if (selectedTokenIndex > index) {
      setSelectedTokenIndex(selectedTokenIndex - 1)
    }
  }

  const saveCommand = () => {
    if (!command.trim()) return
    
    // 如果没有输入名字，自动生成一个默认名字
    const nameToSave = commandName.trim() || `Cmd ${new Date().toLocaleTimeString()}`
    
    const newCommand: SavedCommand = {
      id: Date.now().toString(),
      name: nameToSave,
      command: command,
      timestamp: Date.now()
    }

    const newSavedCommands = [newCommand, ...savedCommands]
    setSavedCommands(newSavedCommands)
    localStorage.setItem('screeps_saved_commands', JSON.stringify(newSavedCommands))
    setCommandName('')
  }

  const deleteCommand = (id: string) => {
    const newSavedCommands = savedCommands.filter(c => c.id !== id)
    setSavedCommands(newSavedCommands)
    localStorage.setItem('screeps_saved_commands', JSON.stringify(newSavedCommands))
  }

  const loadCommand = (cmd: string) => {
      setCommand(cmd)
  }

  const executeCommand = async () => {

    if (connectionMode === 'spectator') return

    if (!token) {
      setError('请输入 API Token')
      return
    }
    if (!command.trim()) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Add command to logs as user input
      const newLog: ConsoleLog = {
        message: `> ${command}`,
        timestamp: Date.now(),
        shard: shard
      }
      setLogs(prev => [...prev, newLog])

      if (identityKey) {
        const updated = addCommandToHistory(identityKey, command, MAX_COMMAND_HISTORY)
        setCommandHistory(updated)
      }

      const api = new ScreepsApiClient(shard, token)
      const data = await api.executeConsoleCommand(command)
      
      if (data.error) {
        setLogs(prev => [...prev, {
            message: data.error,
            error: true,
            timestamp: Date.now(),
            shard: shard
        }])
      }
      
      setCommand('')
      setIsAutocompleteOpen(false)

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '执行出错'
      setError(message)
      setLogs(prev => [...prev, {
        message,
        error: true,
        timestamp: Date.now(),
        shard: shard
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const applySuggestion = (suggestion: string) => {
    const lines = command.split('\n')
    if (lines.length === 0) {
      setCommand(suggestion)
    } else {
      const lastLine = lines[lines.length - 1] ?? ''
      const indent = lastLine.match(/^\s*/)?.[0] ?? ''
      lines[lines.length - 1] = indent + suggestion
      setCommand(lines.join('\n'))
    }
    setIsAutocompleteOpen(false)
    requestAnimationFrame(() => {
      const el = commandInputRef.current
      if (!el) return
      const len = el.value.length
      el.setSelectionRange(len, len)
      el.focus()
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && isAutocompleteOpen && suggestions.length > 0) {
      e.preventDefault()
      applySuggestion(suggestions[activeSuggestionIndex] || suggestions[0])
      return
    }
    if (e.key === 'Escape' && isAutocompleteOpen) {
      e.preventDefault()
      setIsAutocompleteOpen(false)
      return
    }
    if (e.key === 'ArrowDown' && isAutocompleteOpen && suggestions.length > 0) {
      e.preventDefault()
      setActiveSuggestionIndex(i => (i + 1) % suggestions.length)
      return
    }
    if (e.key === 'ArrowUp' && isAutocompleteOpen && suggestions.length > 0) {
      e.preventDefault()
      setActiveSuggestionIndex(i => (i - 1 + suggestions.length) % suggestions.length)
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      executeCommand()
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  return (
    <div className="h-screen box-border pt-12 screeps-bg overflow-hidden">
      <div className="grid-bg" />
      
      <div className="h-full w-full px-2 sm:px-4 py-3 flex flex-col gap-3 box-border">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                ref={settingsButtonRef}
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="relative z-30 p-2 rounded-lg bg-[#1d2027]/60 border border-[#5973ff]/10 text-[#909fc4] hover:text-white hover:bg-[#5973ff]/10 transition-colors"
                title={isSidebarOpen ? "收起侧边栏" : "展开侧边栏"}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isSidebarOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

              {isSidebarOpen && (
                <div ref={settingsPanelRef} className="absolute left-0 top-full z-20 w-80 max-w-[calc(100vw-2rem)]">
                  <div className="bg-[#1d2027]/90 backdrop-blur-md rounded-md p-4 border border-[#5973ff]/20 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[#e5e7eb] font-semibold text-xs">连接设置</h3>
                      <button
                        type="button"
                        onClick={() => setIsSidebarOpen(false)}
                        className="text-[#909fc4] hover:text-white transition-colors"
                        title="关闭"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="space-y-4 max-h-[calc(100vh-160px)] overflow-auto pr-1">
                      <div>
                        <div className="flex gap-2 p-1 bg-[#161724]/50 rounded-lg border border-[#5973ff]/10">
                          <button
                            onClick={() => {
                              setConnectionMode('self')
                              setTargetUsername('')
                            }}
                            className={`flex-1 py-1.5 text-xs rounded-md transition-colors ${
                              connectionMode === 'self'
                                ? 'bg-[#5973ff]/20 text-white shadow-sm'
                                : 'text-[#909fc4] hover:text-[#e5e7eb]'
                            }`}
                          >
                            Token 模式
                          </button>
                          {enableSpectatorMode && (
                            <button
                              onClick={() => setConnectionMode('spectator')}
                              className={`flex-1 py-1.5 text-xs rounded-md transition-colors ${
                                connectionMode === 'spectator'
                                  ? 'bg-[#5973ff]/20 text-white shadow-sm'
                                  : 'text-[#909fc4] hover:text-[#e5e7eb]'
                              }`}
                            >
                              观察模式
                            </button>
                          )}
                        </div>
                      </div>

                      {connectionMode === 'spectator' && (
                        <div>
                          <label className="text-xs text-[#909fc4] mb-1.5 block">目标用户名</label>
                          <input
                            type="text"
                            value={targetUsername}
                            onChange={(e) => setTargetUsername(e.target.value)}
                            placeholder="输入要观察的玩家用户名"
                            className="w-full h-9 px-3 bg-[#1d2027] border border-[#5973ff]/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5973ff]/50"
                          />
                        </div>
                      )}

                      {connectionMode === 'self' && savedTokens.length > 0 && (
                        <div>
                          <label className="text-xs text-[#909fc4] mb-1.5 block">已保存的 Token</label>
                          <div className="flex gap-2">
                            <CustomSelect
                              value={String(selectedTokenIndex)}
                              onChange={(val) => {
                                const index = parseInt(val)
                                setSelectedTokenIndex(index)
                                if (index >= 0) {
                                  const selectedToken = savedTokens[index]
                                  setToken(selectedToken.token)
                                  localStorage.setItem('screeps_token', selectedToken.token)
                                } else {
                                  setToken('')
                                  localStorage.removeItem('screeps_token')
                                }
                              }}
                              options={[
                                { value: '-1', label: '自定义 / 新增' },
                                ...savedTokens.map((t, i) => ({ value: String(i), label: t.name }))
                              ]}
                            />
                            {selectedTokenIndex >= 0 && (
                              <button
                                onClick={() => deleteToken(selectedTokenIndex)}
                                className="px-3 h-10 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-xs transition-colors"
                              >
                                删除
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {connectionMode === 'self' && (
                        <div>
                          <label className="text-xs text-[#909fc4] mb-1.5 block">API Token</label>
                          <div className="relative">
                            <input
                              type={showToken ? "text" : "password"}
                              value={token}
                              onChange={handleTokenChange}
                              placeholder="请输入您的 API Token"
                              className="w-full h-9 px-3 pr-10 bg-[#1d2027] border border-[#5973ff]/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5973ff]/50"
                            />
                            <button
                              type="button"
                              onClick={() => setShowToken(!showToken)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#909fc4] hover:text-white"
                            >
                              {showToken ? (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              )}
                            </button>
                          </div>
                          <p className="text-[10px] text-[#909fc4]/60 mt-1">
                            Token 将保存在您的浏览器 LocalStorage 中
                          </p>
                        </div>
                      )}

                      {connectionMode === 'self' && selectedTokenIndex === -1 && token && (
                        <div className="pt-2 border-t border-[#5973ff]/10">
                          <label className="text-xs text-[#909fc4] mb-1.5 block">保存为常用 Token</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={tokenName}
                              onChange={(e) => setTokenName(e.target.value)}
                              placeholder="给 Token 起个名字"
                              className="flex-1 h-9 px-3 bg-[#1d2027] border border-[#5973ff]/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5973ff]/50"
                            />
                            <button
                              onClick={saveToken}
                              disabled={!tokenName.trim()}
                              className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-colors border ${
                                tokenName.trim()
                                  ? 'bg-[#5973ff]/10 hover:bg-[#5973ff]/20 text-[#5973ff] border-[#5973ff]/20 cursor-pointer'
                                  : 'bg-[#909fc4]/5 text-[#909fc4]/30 border-[#909fc4]/10 cursor-not-allowed'
                              }`}
                              title="保存"
                            >
                              💾
                            </button>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="text-xs text-[#909fc4] mb-1.5 block">Shard</label>
                        <div className="flex gap-2">
                          <CustomSelect
                            value={['shard0', 'shard1', 'shard2', 'shard3'].includes(shard) ? shard : 'custom'}
                            onChange={(val) => {
                              if (val !== 'custom') {
                                setShard(val)
                                localStorage.setItem('screeps_shard', val)
                                setLogs(prev => [...prev, {
                                    message: `[System] Command target switched to ${val}`,
                                    timestamp: Date.now(),
                                    shard: val
                                }])
                              } else {
                                setShard('')
                              }
                            }}
                            options={[
                              { value: 'shard0', label: 'shard0' },
                              { value: 'shard1', label: 'shard1' },
                              { value: 'shard2', label: 'shard2' },
                              { value: 'shard3', label: 'shard3' },
                              { value: 'custom', label: '自定义 / Season' }
                            ]}
                          />
                        </div>
                        {!['shard0', 'shard1', 'shard2', 'shard3'].includes(shard) && (
                          <input
                            type="text"
                            value={shard}
                            onChange={(e) => {
                               setShard(e.target.value)
                               localStorage.setItem('screeps_shard', e.target.value)
                            }}
                            placeholder="输入 Shard 名称 (如 season)"
                            className="w-full h-9 px-3 mt-2 bg-[#1d2027] border border-[#5973ff]/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5973ff]/50"
                          />
                        )}
                      </div>

                      {connectionMode === 'spectator' && (
                        <div>
                          <button
                            onClick={handleSpectatorConnect}
                            disabled={!targetUsername.trim()}
                            className={`w-full h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                              targetUsername.trim()
                                ? 'bg-[#5973ff]/20 hover:bg-[#5973ff]/30 text-[#5973ff] border border-[#5973ff]/30'
                                : 'bg-[#909fc4]/10 text-[#909fc4]/30 border border-[#909fc4]/10 cursor-not-allowed'
                            }`}
                          >
                            连接控制台
                          </button>
                          <p className="text-[10px] text-[#909fc4]/60 mt-2">
                            观察模式仅能查看日志，无法执行命令。<br/>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white">Screeps 控制台</h1>
            <div className="flex items-center gap-2 px-3 py-1 bg-[#1d2027]/60 rounded-full border border-[#5973ff]/10">
              <div className={`w-2 h-2 rounded-full ${
                status === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                status === 'connecting' || status === 'authenticating' ? 'bg-yellow-500 animate-pulse' :
                status === 'error' ? 'bg-red-500' :
                'bg-gray-500'
              }`} />
              <span className="text-xs text-[#909fc4]">
                {status === 'connected' ? '已连接' :
                 status === 'connecting' ? '连接中...' :
                 status === 'authenticating' ? '认证中...' :
                 status === 'error' ? '连接错误' :
                 '未连接'}
              </span>
            </div>
          </div>
        </div>


        <div className="relative flex-1 min-h-0">
          <div className="flex flex-col h-full min-h-0 bg-[#1d2027]/60 backdrop-blur-sm rounded-md border border-[#5973ff]/10 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#5973ff]/10 bg-[#161724]/50">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
              </div>
              <div className="flex items-center gap-4">
                <button
                    onClick={() => setAutoScroll(!autoScroll)}
                    className={`text-xs transition-colors flex items-center gap-1.5 ${
                        autoScroll ? 'text-[#5973ff]' : 'text-[#909fc4] hover:text-white'
                    }`}
                >
                    <div className={`w-1.5 h-1.5 rounded-full ${autoScroll ? 'bg-[#5973ff]' : 'bg-[#909fc4]/50'}`} />
                    {autoScroll ? '自动滚动' : '暂停滚动'}
                </button>
                <button 
                    onClick={clearLogs}
                    className="text-xs text-[#909fc4] hover:text-white transition-colors"
                >
                    清除日志
                </button>
              </div>
            </div>

            {/* Output */}
            <div 
                ref={logsContainerRef}
                className="flex-1 min-h-0 overflow-y-auto p-4 font-mono text-xs leading-tight space-y-1 scroll-smooth"
            >
              {logs.length === 0 && (
                <div className="text-[#909fc4]/40 text-center mt-20">
                  暂无日志，输入命令开始交互...
                </div>
              )}
              {logs.map((log, index) => (
                <div key={index} className={`break-all ${log.error ? 'text-[#ff7379]' : 'text-[#e5e7eb]'}`}>
                  <span className="text-[#909fc4]/50 text-xs mr-2">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  {looksLikeHtmlMessage(log.message) ? (
                    <iframe
                      title="console-html"
                      sandbox="allow-scripts"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full border-0 bg-transparent align-middle"
                      style={{ height: htmlIframeHeights[`${log.timestamp}-${index}`] ?? 24 }}
                      srcDoc={buildSandboxSrcDoc(log.message, `${log.timestamp}-${index}`)}
                    />
                  ) : (
                    <span className="whitespace-pre-wrap">{log.message}</span>
                  )}
                </div>

              ))}
            </div>


            {/* Input */}
            <div className="border-t border-[#5973ff]/10 bg-[#161724]/30 relative">
               {/* Saved Commands Toolbar */}
               <div className="flex items-center justify-between px-4 py-2 border-b border-[#5973ff]/5">
                  <div className="flex-1" /> {/* Spacer */}
                  <button 
                     onClick={() => setIsSavedCommandsOpen(!isSavedCommandsOpen)}
                     className="flex items-center gap-2 text-xs text-[#909fc4] hover:text-white transition-colors"
                  >
                     常用命令
                     <svg className={`w-3 h-3 transition-transform ${isSavedCommandsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                     </svg>
                  </button>
               </div>

               {/* Saved Commands Panel - Floating */}
               {isSavedCommandsOpen && (
                 <div className="absolute bottom-full right-0 w-80 mb-2 mr-4 p-4 rounded-lg bg-[#161724]/95 backdrop-blur-md border border-[#5973ff]/20 shadow-xl z-10">
                    <div className="space-y-4">
                       <div className="flex items-center justify-between border-b border-[#5973ff]/10 pb-2 mb-2">
                           <h3 className="text-xs font-semibold text-white">已保存命令</h3>
                           <button onClick={() => setIsSavedCommandsOpen(false)} className="text-[#909fc4] hover:text-white">
                               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                               </svg>
                           </button>
                       </div>
                       
                       <div className="space-y-2 max-h-60 overflow-y-auto">
                          {savedCommands.map((cmd) => (
                              <div key={cmd.id || Math.random().toString()} className="flex items-center justify-between bg-[#1d2027] p-2 rounded text-xs border border-[#5973ff]/10 group">
                                  <span 
                                      className="text-[#909fc4] hover:text-white cursor-pointer truncate flex-1"
                                      onClick={() => {
                                          loadCommand(cmd.command)
                                          setIsSavedCommandsOpen(false)
                                      }}
                                      title={cmd.command}
                                  >
                                      {cmd.name}
                                  </span>
                                  <button 
                                      onClick={(e) => {
                                          e.stopPropagation()
                                          deleteCommand(cmd.id)
                                      }}
                                      className="text-red-500/50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2 px-1"
                                  >
                                      ×
                                  </button>
                              </div>
                          ))}
                          {savedCommands.length === 0 && (
                              <div className="text-[#909fc4]/40 text-xs text-center py-2">
                                  暂无保存的命令
                              </div>
                          )}
                       </div>

                       <div className="pt-2 border-t border-[#5973ff]/10">
                           <div className="flex gap-2">
                             <input
                               type="text"
                               value={commandName}
                               onChange={(e) => setCommandName(e.target.value)}
                               placeholder="当前代码命名..."
                               className="flex-1 h-8 px-3 bg-[#1d2027] border border-[#5973ff]/20 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#5973ff]/50"
                             />
                             <button
                               type="button"
                               onClick={saveCommand}
                               disabled={!command.trim()}
                               className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors border ${
                                 command.trim()
                                   ? 'bg-[#5973ff]/10 hover:bg-[#5973ff]/20 text-[#5973ff] border-[#5973ff]/20 cursor-pointer'
                                   : 'bg-[#909fc4]/5 text-[#909fc4]/30 border-[#909fc4]/10 cursor-not-allowed'
                               }`}
                               title="保存 (未输入名称将自动生成)"
                             >
                               💾
                             </button>
                           </div>
                       </div>
                    </div>
                 </div>
               )}

              <div className="p-4 relative">
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    {connectionMode !== 'spectator' && isAutocompleteOpen && suggestions.length > 0 && (
                      <div className="absolute left-0 right-0 bottom-full mb-2 rounded-lg bg-[#161724]/95 backdrop-blur-md border border-[#5973ff]/20 shadow-xl overflow-hidden z-20">
                        <div className="max-h-40 overflow-y-auto">
                          {suggestions.map((s, i) => (
                            <button
                              key={`${s}-${i}`}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                applySuggestion(s)
                              }}
                              className={`w-full text-left px-3 py-2 font-mono text-xs transition-colors ${
                                i === activeSuggestionIndex
                                  ? 'bg-[#5973ff]/20 text-white'
                                  : 'text-[#909fc4] hover:text-white hover:bg-[#5973ff]/10'
                              }`}
                              title={s}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <textarea
                      ref={commandInputRef}
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={connectionMode === 'spectator'}
                      placeholder={connectionMode === 'spectator' ? "观察模式下无法输入命令" : "输入代码..."}
                      style={{ minHeight: COMMAND_INPUT_MIN_HEIGHT, maxHeight: COMMAND_INPUT_MAX_HEIGHT }}
                      className={`w-full bg-[#0b0d0f]/50 border border-[#5973ff]/20 rounded-lg p-3 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#5973ff]/50 resize-none ${
                        connectionMode === 'spectator' ? 'cursor-not-allowed opacity-50' : ''
                      }`}
                    />
                  </div>

                  <button
                    onClick={executeCommand}
                    disabled={isLoading || !token || connectionMode === 'spectator'}
                    className={`h-11 px-4 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      isLoading || !token || connectionMode === 'spectator'
                        ? 'bg-[#909fc4]/10 text-[#909fc4]/50 cursor-not-allowed'
                        : 'btn-primary text-white hover:shadow-lg hover:shadow-[#5973ff]/20'
                    }`}
                  >
                    {isLoading ? '执行中...' : '执行'}
                  </button>
                </div>

                <div className="mt-2 text-[#ff7379] text-xs truncate">
                  {error}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
