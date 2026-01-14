'use client'

import { useState, useEffect, useRef } from 'react'
import { ScreepsApiClient } from '@/lib/screeps-client'
import { useScreepsSocket } from '@/hooks/useScreepsSocket'

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

export default function ConsolePage() {
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
  const logsEndRef = useRef<HTMLDivElement>(null)
  
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


  // Auto-connect when token changes
  useEffect(() => {
    if (token) {
      if (connectionMode === 'self') {
        connect(token)
      } else if (connectionMode === 'spectator' && targetUsername) {
        const timer = setTimeout(() => {
            connect(token, targetUsername)
        }, 800)
        return () => clearTimeout(timer)
      }
    } else {
      disconnect()
    }
  }, [token, connectionMode, targetUsername, connect, disconnect])



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

  const handleSavedTokenSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const index = parseInt(e.target.value)
    setSelectedTokenIndex(index)
    
    if (index >= 0) {
      const selectedToken = savedTokens[index]
      setToken(selectedToken.token)
      localStorage.setItem('screeps_token', selectedToken.token)
    } else {
      setToken('')
      localStorage.removeItem('screeps_token')
    }
  }

  const handleShardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newShard = e.target.value
    setShard(newShard)
    localStorage.setItem('screeps_shard', newShard)
  }

  const saveCommand = () => {
    if (!commandName.trim() || !command.trim()) return
    
    const newCommand: SavedCommand = {
      id: Date.now().toString(),
      name: commandName,
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

    } catch (err: any) {
      setError(err.message || '执行出错')
      setLogs(prev => [...prev, {
        message: err.message || 'Execution failed',
        error: true,
        timestamp: Date.now(),
        shard: shard
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      executeCommand()
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  return (
    <div className="min-h-screen screeps-bg">
      <div className="grid-bg" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg bg-[#1d2027]/60 border border-[#5973ff]/10 text-[#909fc4] hover:text-white hover:bg-[#5973ff]/10 transition-colors"
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


        <div className="flex gap-6 items-start">
          {/* Left: Settings */}
          <div className={`${isSidebarOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'} transition-all duration-300 ease-in-out shrink-0`}>
            <div className="w-80 space-y-4">
            <div className="bg-[#1d2027]/60 backdrop-blur-sm rounded-md p-4 border border-[#5973ff]/10">
              <h3 className="text-[#e5e7eb] font-semibold mb-4 text-xs">连接设置</h3>
              
              <div className="space-y-4">
                {/* Saved Tokens Dropdown */}
                {savedTokens.length > 0 && (
                  <div>
                    <label className="text-xs text-[#909fc4] mb-1.5 block">已保存的 Token</label>
                    <div className="flex gap-2">
                      <select
                        value={selectedTokenIndex}
                        onChange={handleSavedTokenSelect}
                        className="flex-1 h-9 px-3 bg-[#1d2027] border border-[#5973ff]/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5973ff]/50"
                      >
                        <option value={-1}>自定义 / 新增</option>
                        {savedTokens.map((t, i) => (
                          <option key={i} value={i}>{t.name}</option>
                        ))}
                      </select>
                      {selectedTokenIndex >= 0 && (
                        <button
                          onClick={() => deleteToken(selectedTokenIndex)}
                          className="px-3 h-9 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-xs transition-colors"
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                )}

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

                {/* Save Token Section */}
                {selectedTokenIndex === -1 && token && (
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
                        className={`px-3 h-9 rounded-lg text-xs transition-colors border ${
                          tokenName.trim()
                            ? 'bg-[#5973ff]/10 hover:bg-[#5973ff]/20 text-[#5973ff] border-[#5973ff]/20 cursor-pointer'
                            : 'bg-[#909fc4]/5 text-[#909fc4]/30 border-[#909fc4]/10 cursor-not-allowed'
                        }`}
                      >
                        保存
                      </button>
                    </div>
                  </div>
                )}

                {/* Connection Mode */}
                <div>
                  <label className="text-xs text-[#909fc4] mb-1.5 block">连接模式</label>
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
                      当前用户
                    </button>
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
                  </div>
                </div>

                {/* Target Username (Spectator Mode) */}
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

                <div>
                  <label className="text-xs text-[#909fc4] mb-1.5 block">Shard</label>
                  <div className="flex gap-2">
                    <select
                      value={['shard0', 'shard1', 'shard2', 'shard3'].includes(shard) ? shard : 'custom'}
                      onChange={(e) => {
                        if (e.target.value !== 'custom') {
                          handleShardChange(e)
                        } else {
                          // 如果选择自定义，保持当前值（或清空），但让输入框显示
                          setShard('') 
                        }
                      }}
                      className="flex-1 h-9 px-3 bg-[#1d2027] border border-[#5973ff]/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5973ff]/50"
                    >
                      <option value="shard0">shard0</option>
                      <option value="shard1">shard1</option>
                      <option value="shard2">shard2</option>
                      <option value="shard3">shard3</option>
                      <option value="custom">自定义 / Season</option>
                    </select>
                  </div>
                  {/* 如果 shard 不在标准列表中，或者用户选择了自定义（虽然 select value 逻辑会处理，但这里提供一个显式的输入框） */}
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
              </div>
            </div>
            </div>
          </div>

          {/* Right: Console Area */}

          <div className="flex-1 flex flex-col h-[calc(100vh-200px)] min-h-[600px] bg-[#1d2027]/60 backdrop-blur-sm rounded-md border border-[#5973ff]/10 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#5973ff]/10 bg-[#161724]/50">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
              </div>
              <button 
                onClick={clearLogs}
                className="text-xs text-[#909fc4] hover:text-white transition-colors"
              >
                清除日志
              </button>
            </div>

            {/* Output */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-2">
              {logs.length === 0 && (
                <div className="text-[#909fc4]/40 text-center mt-20">
                  暂无日志，输入命令开始交互...
                </div>
              )}
              {logs.map((log, index) => (
                <div key={index} className={`break-all ${log.error ? 'text-[#ff7379]' : 'text-[#e5e7eb]'}`}>
                  <span className="text-[#909fc4]/50 text-xs mr-2">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: log.message }} />
                </div>

              ))}
              <div ref={logsEndRef} />
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
                               disabled={!commandName.trim() || !command.trim()}
                               className={`px-3 h-8 rounded text-xs transition-colors border ${
                                 commandName.trim() && command.trim()
                                   ? 'bg-[#5973ff]/10 hover:bg-[#5973ff]/20 text-[#5973ff] border-[#5973ff]/20 cursor-pointer'
                                   : 'bg-[#909fc4]/5 text-[#909fc4]/30 border-[#909fc4]/10 cursor-not-allowed'
                               }`}
                             >
                               保存
                             </button>
                           </div>
                       </div>
                    </div>
                 </div>
               )}

              <div className="p-4 relative">
                <textarea
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={connectionMode === 'spectator'}
                  placeholder={connectionMode === 'spectator' ? "观察模式下无法输入命令" : "输入代码..."}
                  className={`w-full h-24 bg-[#0b0d0f]/50 border border-[#5973ff]/20 rounded-lg p-3 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#5973ff]/50 resize-none ${
                    connectionMode === 'spectator' ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                />
                <div className="absolute right-2 bottom-2 flex gap-2 items-center">
                  <span className="text-[10px] text-[#909fc4]/40 hidden sm:block whitespace-nowrap">
                    Shift + Enter 换行
                  </span>
                  <button
                    onClick={executeCommand}
                    disabled={isLoading || !token || connectionMode === 'spectator'}
                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                      isLoading || !token || connectionMode === 'spectator'
                        ? 'bg-[#909fc4]/10 text-[#909fc4]/50 cursor-not-allowed'
                        : 'btn-primary text-white hover:shadow-lg hover:shadow-[#5973ff]/20'
                    }`}
                  >
                    {isLoading ? '执行中...' : '执行'}
                  </button>
                </div>
              </div>
              {error && (
                <div className="text-[#ff7379] text-xs mt-2">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
