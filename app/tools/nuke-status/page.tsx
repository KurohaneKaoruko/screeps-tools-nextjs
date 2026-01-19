'use client'

import { useState, useEffect } from 'react'
import type { NukeData, NukesResponse } from '@/lib/screeps-common'

interface NukeDataWithTime extends NukeData {
  ticksToLand: number
  secondsToLand: number
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
  
  const nukesWithTimeToLand: NukeDataWithTime[] = data
    ? data.nukes.map(n => {
        const tickMs = typeof data.shardTickSpeeds?.[n.shard] === 'number' ? data.shardTickSpeeds[n.shard] : 1000
        const ticksRemaining =
          n.timeToLand > 0
            ? n.timeToLand
            : Math.max(0, n.landTime - (data.shardGameTimes?.[n.shard] ?? 0))
        const ticksToLand = Math.max(0, Math.ceil(ticksRemaining))
        const secondsToLand = Math.max(0, Math.ceil((ticksToLand * tickMs) / 1000))

        return {
          ...n,
          ticksToLand,
          secondsToLand
        }
      })
    : []
  
  const urgentNukes = nukesWithTimeToLand.filter(n => {
    return n.secondsToLand <= 300 // 5分钟内爆炸
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
    if (!Number.isFinite(ms) || ms <= 0) return '-'
    if (ms % 1000 === 0) return `${ms / 1000}秒`
    return `${Math.round(ms)}ms`
  }

  const shards = ['shard0', 'shard1', 'shard2', 'shard3']

  return (
    <div className="min-h-screen screeps-bg">
      <div className="grid-bg" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Nuke 打击情况</h1>
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
            <div className="bg-[#ff7379]/10 backdrop-blur-sm rounded-md p-4 border border-[#ff7379]/50">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#ff7379]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.538 9h-2.03M16.538 9h-2.03M13 21h-2" />
                </svg>
                <span className="text-sm text-[#ff7379]">{error}</span>
              </div>
            </div>
          )}

          {data && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-[#1d2027]/60 backdrop-blur-sm rounded-md p-4 border border-[#5973ff]/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-[#909fc4]">Nuke 总数</div>
                    <div className="w-8 h-8 rounded-lg bg-[#5973ff]/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-[#5973ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7m0 0v-7l9 7v7m-9-14h-2" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-white">{totalNukes}</div>
                  <div className="text-xs text-[#909fc4]/60 mt-1">所有 Shard</div>
                </div>

                <div className="bg-[#1d2027]/60 backdrop-blur-sm rounded-md p-4 border border-[#ff7379]/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-[#909fc4]">紧急 Nuke</div>
                    <div className="w-8 h-8 rounded-lg bg-[#ff7379]/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-[#ff7379]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.538 9h-2.03M16.538 9h-2.03M13 21h-2" />
                      </svg>
                    </div>
                  </div>
                  <div className={`text-xl font-bold ${urgentNukes > 0 ? 'text-[#ff7379]' : 'text-green-500'}`}>
                    {urgentNukes}
                  </div>
                  <div className="text-xs text-[#909fc4]/60 mt-1">5分钟内爆炸</div>
                </div>

                <div className="bg-[#1d2027]/60 backdrop-blur-sm rounded-md p-4 border border-green-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-[#909fc4]">查询时间</div>
                    <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0m-9 18h18" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[#5973ff]">
                    {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                  <div className="text-xs text-[#909fc4]/60 mt-1">实时数据</div>
                </div>
              </div>

              {totalNukes > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {shards.map(shard => {
                    const shardNukes = nukesByShard[shard] || []
                    const tickMsForShard = data.shardTickSpeeds?.[shard]
                    
                    return (
                        <div key={shard} className="bg-[#1d2027]/40 backdrop-blur-sm rounded-md border border-[#5973ff]/20 overflow-hidden">
                          <div className="bg-linear-to-r from-[#5973ff]/20 to-[#a459ff]/20 px-3 py-1.5 border-b border-[#5973ff]/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#5973ff]" />
                              <h2 className="text-sm font-bold text-white">{shard}</h2>
                            </div>
                            <div className="flex items-center gap-2">
                              {typeof tickMsForShard === 'number' && tickMsForShard > 0 && (
                                <span className="text-xs text-[#6c82ff] font-mono">
                                  ⚡ {formatTickSpeed(tickMsForShard)}
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 bg-[#5973ff]/30 rounded-full text-xs font-medium text-[#6c82ff]">
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
                                className={`bg-[#0b0d0f]/60 backdrop-blur-sm rounded-lg p-2 border transition-all hover:bg-[#0b0d0f]/80 ${getUrgencyBorderColor(nuke.secondsToLand)}`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <div className={`w-2 h-2 rounded-full shrink-0 ${getUrgencyBgColor(nuke.secondsToLand)}`} />
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1">
                                          <a 
                                            href={`https://screeps.com/a/#!/room/${nuke.shard}/${nuke.roomName}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-semibold text-white truncate hover:text-[#5973ff] transition-colors"
                                            title={`在 Screeps 中查看 ${nuke.roomName}`}
                                          >
                                            {nuke.roomName}
                                          </a>
                                          <span className={`text-xs truncate ${nuke.targetOwner ? 'text-cyan-400' : 'text-[#909fc4]/60'}`}>
                                            ({nuke.targetOwner || '未知'})
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-[#909fc4]">
                                          <svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5-5M13 17l5 5m0 0l-5-5M6 7l-5 5m0 0l5-5M6 17l-5 5m0 0l5-5" />
                                          </svg>
                                          <a 
                                            href={`https://screeps.com/a/#!/room/${nuke.shard}/${nuke.launchRoomName}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="truncate hover:text-[#5973ff] transition-colors"
                                            title={`在 Screeps 中查看 ${nuke.launchRoomName}`}
                                          >
                                            {nuke.launchRoomName}
                                          </a>
                                          <span className={`truncate ${nuke.launchOwner ? 'text-orange-400' : 'text-[#909fc4]/60'}`}>
                                            ({nuke.launchOwner || '未知'})
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <div className={`text-sm font-bold ${getUrgencyColor(nuke.secondsToLand)}`}>
                                      {formatTimeToLand(nuke.secondsToLand)}
                                    </div>
                                    <div className="px-1.5 py-0.5 bg-[#5973ff]/20 rounded inline-flex items-center gap-0.5">
                                      <div className="text-sm font-mono font-bold text-[#5973ff]">
                                        {nuke.ticksToLand}
                                      </div>
                                      <div className="text-xs text-[#6c82ff]">tick</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center">
                            <div className="text-3xl mb-2">🛡️</div>
                            <div className="text-xs text-[#909fc4]">暂无 Nuke</div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-[#1d2027]/40 backdrop-blur-sm rounded-lg p-12 border border-[#5973ff]/20 text-center">
                  <div className="text-6xl mb-4">🛡️</div>
                  <div className="text-xl font-semibold text-[#e5e7eb] mb-2">暂无正在飞行的 Nuke</div>
                  <div className="text-sm text-[#909fc4]">所有 Shard 当前没有正在飞行的核弹</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
