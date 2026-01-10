'use client'

import { useState, useEffect } from 'react'

interface NukeData {
  id: string
  roomName: string
  launchRoomName: string
  landTime: number
  shard: string
  targetOwner?: string
  launchOwner?: string
}

interface NukeDataWithTime extends NukeData {
  timeToLand: number
}

interface NukesResponse {
  ok: number
  nukes: NukeData[]
  shardGameTimes: Record<string, number>
  shardTickSpeeds?: Record<string, number>
  error?: string
}

function formatTimeToLand(timeToLand: number): string {
  if (timeToLand <= 0) return '即将爆炸'
  
  const totalSeconds = timeToLand
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  } else {
    return `${seconds}s`
  }
}

function getUrgencyColor(timeToLand: number): string {
  const seconds = timeToLand
  if (seconds <= 60) return 'text-red-500'
  if (seconds <= 300) return 'text-orange-500'
  if (seconds <= 600) return 'text-yellow-500'
  return 'text-green-500'
}

function getUrgencyBgColor(timeToLand: number): string {
  const seconds = timeToLand
  if (seconds <= 60) return 'bg-red-500'
  if (seconds <= 300) return 'bg-orange-500'
  if (seconds <= 600) return 'bg-yellow-500'
  return 'bg-green-500'
}

function getUrgencyBorderColor(timeToLand: number): string {
  const seconds = timeToLand
  if (seconds <= 60) return 'border-red-500/50'
  if (seconds <= 300) return 'border-orange-500/50'
  if (seconds <= 600) return 'border-yellow-500/50'
  return 'border-green-500/50'
}

export default function NukeStatusPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<NukesResponse | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/screeps?action=nukes`)
      const result: NukesResponse = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || `请求失败: ${response.status}`)
      }
      if (result.ok !== 1) {
        throw new Error(result.error || '获取数据失败')
      }
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    
    const interval = setInterval(() => {
      fetchData()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const totalNukes = data ? data.nukes.length : 0
  
  const nukesWithTimeToLand: NukeDataWithTime[] = data ? data.nukes.map(n => ({
    ...n,
    timeToLand: Math.max(0, n.landTime - (data.shardGameTimes[n.shard] || 0))
  })) : []
  
  const urgentNukes = nukesWithTimeToLand.filter(n => {
    return n.timeToLand <= 300 // 5分钟内爆炸
  }).length

  const nukesByShard: Record<string, NukeDataWithTime[]> = {}
  if (data) {
    for (const nuke of nukesWithTimeToLand) {
      if (!nukesByShard[nuke.shard]) {
        nukesByShard[nuke.shard] = []
      }
      nukesByShard[nuke.shard].push(nuke)
    }
  }

  function formatTickSpeed(ms: number): string {
    const seconds = (ms / 1000).toFixed(1)
    return `${seconds}秒`
  }

  const shards = ['shard0', 'shard1', 'shard2', 'shard3']

  return (
    <div className="min-h-screen screeps-bg">
      <div className="grid-bg" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold gradient-text">Nuke 打击情况</h1>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3 h-9 btn-primary rounded-lg text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? '刷新中...' : '刷新'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-900/30 backdrop-blur-sm rounded-xl p-4 border border-red-500/50">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.538 9h-2.03M16.538 9h-2.03M13 21h-2" />
                </svg>
                <span className="text-sm text-red-400">{error}</span>
              </div>
            </div>
          )}

          {data && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-indigo-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-gray-400">Nuke 总数</div>
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7m0 0v-7l9 7v7m-9-14h-2" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white">{totalNukes}</div>
                  <div className="text-xs text-gray-500 mt-1">所有 Shard</div>
                </div>

                <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-red-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-gray-400">紧急 Nuke</div>
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.538 9h-2.03M16.538 9h-2.03M13 21h-2" />
                      </svg>
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${urgentNukes > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {urgentNukes}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">5分钟内爆炸</div>
                </div>

                <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-green-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-gray-400">查询时间</div>
                    <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0m-9 18h18" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-indigo-400">
                    {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">实时数据</div>
                </div>
              </div>

              {totalNukes > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {shards.map(shard => {
                    const shardNukes = nukesByShard[shard] || []
                    
                    return (
                        <div key={shard} className="bg-gray-800/40 backdrop-blur-sm rounded-xl border border-indigo-500/20 overflow-hidden">
                          <div className="bg-linear-to-r from-indigo-600/20 to-purple-600/20 px-3 py-1.5 border-b border-indigo-500/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                              <h2 className="text-sm font-bold text-white">{shard}</h2>
                            </div>
                            <div className="flex items-center gap-2">
                              {data.shardTickSpeeds?.[shard] && (
                                <span className="text-xs text-indigo-300 font-mono">
                                  ⚡ {formatTickSpeed(data.shardTickSpeeds[shard])}
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 bg-indigo-500/30 rounded-full text-xs font-medium text-indigo-300">
                                {shardNukes.length}
                              </span>
                            </div>
                          </div>
                        </div>
                        {shardNukes.length > 0 ? (
                          <div className="p-2 space-y-1.5">
                            {shardNukes.map((nuke, index) => (
                                <div 
                                key={index} 
                                className={`bg-gray-900/60 backdrop-blur-sm rounded-lg p-2 border transition-all hover:bg-gray-900/80 ${getUrgencyBorderColor(nuke.timeToLand)}`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <div className={`w-2 h-2 rounded-full shrink-0 ${getUrgencyBgColor(nuke.timeToLand)}`} />
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1">
                                          <h3 className="text-xs font-semibold text-white truncate">{nuke.roomName}</h3>
                                          <span className={`text-xs truncate ${nuke.targetOwner ? 'text-cyan-400' : 'text-gray-500'}`}>
                                            ({nuke.targetOwner || '未知'})
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-gray-400">
                                          <svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5-5M13 17l5 5m0 0l-5-5M6 7l-5 5m0 0l5-5M6 17l-5 5m0 0l5-5" />
                                          </svg>
                                          <span className="truncate">{nuke.launchRoomName}</span>
                                          <span className={`truncate ${nuke.launchOwner ? 'text-orange-400' : 'text-gray-500'}`}>
                                            ({nuke.launchOwner || '未知'})
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <div className={`text-sm font-bold ${getUrgencyColor(nuke.timeToLand)}`}>
                                      {formatTimeToLand(nuke.timeToLand)}
                                    </div>
                                    <div className="px-1.5 py-0.5 bg-indigo-500/20 rounded inline-flex items-center gap-0.5">
                                      <div className="text-sm font-mono font-bold text-indigo-400">
                                        {nuke.timeToLand}
                                      </div>
                                      <div className="text-xs text-indigo-300">tick</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center">
                            <div className="text-3xl mb-2">🛡️</div>
                            <div className="text-xs text-gray-400">暂无 Nuke</div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-gray-800/40 backdrop-blur-sm rounded-2xl p-12 border border-indigo-500/20 text-center">
                  <div className="text-6xl mb-4">🛡️</div>
                  <div className="text-xl font-semibold text-gray-300 mb-2">暂无正在飞行的 Nuke</div>
                  <div className="text-sm text-gray-500">所有 Shard 当前没有正在飞行的核弹</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
