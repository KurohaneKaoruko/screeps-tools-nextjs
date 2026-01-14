import { useState, useEffect, useRef, useCallback } from 'react'

export interface ConsoleLog {
  line: string
  error?: boolean
  timestamp: number
  shard?: string
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'authenticating'

export function useScreepsSocket(
    onNewLogs?: (logs: ConsoleLog[]) => void,
    onError?: (error: Error) => void
) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const socketRef = useRef<WebSocket | null>(null)
  const tokenRef = useRef<string>('')
  const targetUsernameRef = useRef<string>('')
  const userIdRef = useRef<string>('')
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // 使用 ref 来保存回调，避免闭包陷阱和重连时的 stale closure
  const onNewLogsRef = useRef(onNewLogs)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onNewLogsRef.current = onNewLogs
    onErrorRef.current = onError
  }, [onNewLogs, onError])

  const connect = useCallback(async (token: string, targetUsername?: string) => {

    if (!token) return
    
    // 如果已经在连接或已连接，且 token 没变且 targetUsername 没变，忽略
    if ((status === 'connected' || status === 'connecting' || status === 'authenticating') && 
        tokenRef.current === token && 
        targetUsernameRef.current === (targetUsername || '')) {
      return
    }

    // 清理旧连接
    if (socketRef.current) {
      socketRef.current.close()
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    tokenRef.current = token
    targetUsernameRef.current = targetUsername || ''
    setStatus('connecting')

    try {

      // 1. 获取 User ID
      let userId = ''
      
      if (targetUsername) {
          // 如果指定了目标用户名，查找其 ID
          const res = await fetch(`/api/user/find?username=${encodeURIComponent(targetUsername)}`)
          if (!res.ok) throw new Error('Failed to find user')
          const data = await res.json()
          if (!data.ok || !data._id) throw new Error('User not found')
          userId = data._id
      } else {
          // 否则获取当前 Token 对应的用户 ID
          const res = await fetch('/api/console', {
            headers: { 'X-Token': token }
          })
          if (!res.ok) throw new Error('Failed to verify token or get user info')
          const data = await res.json()
          if (!data.ok || !data._id) throw new Error('Invalid user info response')
          userId = data._id
      }
      
      userIdRef.current = userId

      // 2. 建立 WebSocket 连接
      const ws = new WebSocket('wss://screeps.com/socket/websocket')
      socketRef.current = ws

      ws.onopen = () => {
        console.log('WS Connected, sending auth...')
        setStatus('authenticating')
        ws.send(`auth ${token}`)
        // 可以在这里通知连接已建立（虽然还没认证）
      }

      ws.onmessage = (event) => {
        const data = event.data
        
        // 处理 Auth 响应
        if (data.startsWith('auth ok')) {
          console.log('Auth success, subscribing...')
          setStatus('connected')
          ws.send(`subscribe user:${userIdRef.current}/console`)
          
          // 通知连接成功（可选，通过发送一条系统日志）
          if (onNewLogsRef.current) {
              onNewLogsRef.current([{
                  line: `[System] Connected to console (User ID: ${userIdRef.current})`,
                  timestamp: Date.now(),
                  error: false
              }])
          }
          return
        }
        
        if (data.startsWith('auth failed')) {
          console.error('Auth failed')
          setStatus('error')
          ws.close()
          if (onErrorRef.current) {
              onErrorRef.current(new Error('WebSocket authentication failed'))
          }
          return
        }

        // 处理订阅消息
        // 消息格式通常是: ["channel", data]
        try {
          // 如果是 gzip 压缩数据（以 gz: 开头），这里暂时无法处理（需要 pako）
          // 但默认不发 gzip on 指令应该不会收到
          if (typeof data === 'string') {
            if (data.startsWith('time')) {
                // 心跳包或其他系统消息，忽略
                return
            }
            
            // 尝试解析 JSON
            // 正常消息: ["user:ID/console", {messages: {log: [], results: []}, shard: "shard3"}]
            const parsed = JSON.parse(data)
            if (Array.isArray(parsed) && parsed.length >= 2) {
              const channel = parsed[0]
              const payload = parsed[1]
              
              if (channel.endsWith('/console') && payload) {
                 const newLogs: ConsoleLog[] = []
                 const timestamp = Date.now()

                 // 处理 log 数组 (console.log 输出)
                 if (payload.messages && Array.isArray(payload.messages.log)) {
                   payload.messages.log.forEach((log: string) => {
                     newLogs.push({
                       line: log,
                       timestamp,
                       shard: payload.shard,
                       error: false
                     })
                   })
                 }
                 
                 // 处理 results 数组 (命令执行返回值)
                 if (payload.messages && Array.isArray(payload.messages.results)) {
                    payload.messages.results.forEach((res: string) => {
                        newLogs.push({
                            line: res,
                            timestamp,
                            shard: payload.shard,
                            error: false // 结果通常不是错误，除非内容指示
                        })
                    })
                 }
                 
                 if (payload.error) {
                     newLogs.push({
                         line: payload.error,
                         timestamp,
                         shard: payload.shard,
                         error: true
                     })
                 }

                 if (newLogs.length > 0) {
                   if (onNewLogsRef.current) {
                     onNewLogsRef.current(newLogs)
                   }
                 }
              }
            }

          }
        } catch (e) {
          // 非 JSON 消息或解析错误，忽略
        }
      }

      ws.onclose = () => {
        console.log('WS Closed')
        if (status !== 'disconnected') {
             setStatus('disconnected')
             // 简单的自动重连逻辑
             reconnectTimeoutRef.current = setTimeout(() => {
                 if (tokenRef.current) {
                     connect(tokenRef.current, targetUsernameRef.current)
                 }
             }, 3000)
        }
      }

      ws.onerror = (err) => {
        console.error('WS Error', err)
        setStatus('error')
      }

    } catch (e) {
      console.error('Connection failed', e)
      setStatus('error')
      if (onErrorRef.current && e instanceof Error) {
          onErrorRef.current(e)
      }
    }
  }, [status])

  const disconnect = useCallback(() => {
    tokenRef.current = ''
    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    setStatus('disconnected')
  }, [])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  return {
    status,
    connect,
    disconnect
  }
}

