'use client'

import { useState, useEffect } from 'react'
import CustomSelect from '@/components/CustomSelect'
import dynamic from 'next/dynamic'
import pako from 'pako'
import { KNOWN_SHARDS } from '@/lib/screeps-common'

// Shard 下拉选项（含 shardX 快速分片）
const SHARD_OPTIONS = [
  ...KNOWN_SHARDS.map(s => ({ value: s, label: s === 'shardX' ? 'shardX ⚡' : s })),
  { value: 'custom', label: '自定义 / Season' }
]
const isKnownShard = (s: string) => KNOWN_SHARDS.includes(s)

// 动态导入 ReactJson 以避免 SSR 问题
const ReactJson = dynamic(() => import('react-json-view'), { ssr: false })

interface SavedToken {
  name: string
  token: string
}

export default function MemoryPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [token, setToken] = useState('')
  const [savedTokens, setSavedTokens] = useState<SavedToken[]>([])
  const [tokenName, setTokenName] = useState('')
  const [selectedTokenIndex, setSelectedTokenIndex] = useState<number | -1>(-1)
  const [shard, setShard] = useState('shard0')
  const [path, setPath] = useState('')
  const [memoryData, setMemoryData] = useState<any>(null)
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showToken, setShowToken] = useState(false)

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
  }, [])

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newToken = e.target.value
    setToken(newToken)
    localStorage.setItem('screeps_token', newToken)
    setSelectedTokenIndex(-1)
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

  const fetchMemory = async () => {
    if (!token) {
      setError('请输入 API Token')
      return
    }

    setIsLoading(true)
    setError('')
    setMemoryData(null)

    try {
      const response = await fetch('/api/memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Token': token
        },
        body: JSON.stringify({ 
          path: path.trim(),
          shard: shard
        })
      })

      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(data.error || data.details || '请求失败')
      }

      // 处理 gzip 数据 (前端解压)
      let finalData = data.data
      if (typeof data.data === 'string' && data.data.startsWith('gz:')) {
        try {
          const base64 = data.data.slice(3) // 去掉 'gz:'
          const binaryString = atob(base64)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          
          const decompressed = pako.ungzip(bytes, { to: 'string' })
          finalData = JSON.parse(decompressed)
        } catch (e) {
          console.error('Decompression error:', e)
          throw new Error('解压 Memory 数据失败')
        }
      }

      setMemoryData(finalData)

    } catch (err: any) {
      setError(err.message || '获取 Memory 失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      fetchMemory()
    }
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
            <h1 className="text-2xl font-bold text-white">Memory 查看器</h1>
          </div>
        </div>


        <div className="flex gap-6 items-start">
          {/* Left: Settings */}
          <div className={`${isSidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden'} transition-all duration-300 ease-in-out shrink-0`}>
            <div className="w-64 space-y-4">
            <div className="bg-[#1d2027]/60 backdrop-blur-sm rounded-md p-4 border border-[#5973ff]/10">
              <h3 className="text-[#e5e7eb] font-semibold mb-4 text-xs">连接设置</h3>
              
              <div className="space-y-4">
                {/* Saved Tokens Dropdown */}
                {savedTokens.length > 0 && (
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

                {/* Token Input Section */}
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
                      value={isKnownShard(shard) ? shard : 'custom'}
                      onChange={(val) => {
                        if (val !== 'custom') {
                          setShard(val)
                          localStorage.setItem('screeps_shard', val)
                        } else {
                          setShard('') 
                        }
                      }}
                      options={SHARD_OPTIONS}
                    />
                  </div>
                  {!isKnownShard(shard) && (
                    <input
                      type="text"
                      value={shard}
                      onChange={(e) => {
                         setShard(e.target.value)
                         localStorage.setItem('screeps_shard', e.target.value)
                      }}
                      placeholder="输入 Shard 名称"
                      className="w-full h-9 px-3 mt-2 bg-[#1d2027] border border-[#5973ff]/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5973ff]/50"
                    />
                  )}
                </div>

                <div>
                  <label className="text-xs text-[#909fc4] mb-1.5 block">Memory 路径 (可选)</label>
                  <input
                    type="text"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="例如: creeps.MyCreep"
                    className="w-full h-9 px-3 bg-[#1d2027] border border-[#5973ff]/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5973ff]/50"
                  />
                  <p className="text-[10px] text-[#909fc4]/60 mt-1">
                    留空则获取全部 Memory
                  </p>
                </div>
                
                <button
                  onClick={fetchMemory}
                  disabled={isLoading || !token}
                  className={`w-full h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                    isLoading || !token
                      ? 'bg-[#909fc4]/10 text-[#909fc4]/50 cursor-not-allowed'
                      : 'btn-primary text-white hover:shadow-lg hover:shadow-[#5973ff]/20'
                  }`}
                >
                  {isLoading ? '获取中...' : '获取 Memory'}
                </button>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-xs text-red-500">{error}</p>
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>

          {/* Right: Display Area */}
          <div className="flex-1 flex flex-col h-[calc(100vh-200px)] min-h-[600px] bg-[#1d2027]/60 backdrop-blur-sm rounded-md border border-[#5973ff]/10 overflow-hidden relative">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#5973ff]/10 bg-[#161724]/50">
                <span className="text-xs text-[#909fc4]">
                    {memoryData ? 'Memory Data' : 'Ready'}
                </span>
            </div>
            
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              {memoryData ? (
                <ReactJson 
                  src={memoryData} 
                  theme="ocean" 
                  displayDataTypes={false}
                  enableClipboard={true}
                  collapsed={1}
                  style={{ backgroundColor: 'transparent', fontSize: '14px' }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-[#909fc4]/40">
                    <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>暂无数据</p>
                    <p className="text-sm mt-2">请在左侧输入 Token 并点击获取</p>
                </div>
              )}
            </div>
            
            {isLoading && (
                 <div className="absolute inset-0 bg-[#1d2027]/80 backdrop-blur-[1px] flex items-center justify-center z-10">
                     <div className="flex flex-col items-center">
                         <div className="w-10 h-10 border-4 border-[#5973ff] border-t-transparent rounded-full animate-spin mb-4"></div>
                         <p className="text-[#5973ff] font-medium">正在获取 Memory...</p>
                     </div>
                 </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
