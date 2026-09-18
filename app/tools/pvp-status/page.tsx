'use client'

import { useState, useEffect } from 'react'
import { KNOWN_SHARDS, sortShards, type ShardInfo } from '@/lib/screeps-common'

interface PvPRoomData {
  _id: string
  lastPvpTime: number
  owner?: string
}

interface PvPShardData {
  time: number
  rooms: PvPRoomData[]
}

interface PvPApiResponse {
  ok: number
  pvp: {
    [key: string]: PvPShardData | undefined
  }
  shardTickSpeeds?: Record<string, number>
  error?: string
}


export default function PvPStatusPage() {
  const [interval, setInterval] = useState('100')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<PvPApiResponse | null>(null)
  const [shardList, setShardList] = useState<string[]>([...KNOWN_SHARDS])

  // 动态获取官方 shard 列表（含 shardX 等新分片）
  useEffect(() => {
    let cancelled = false
    fetch('/api/screeps?action=shards')
      .then(res => res.json())
      .then((result: { ok: number; shards?: ShardInfo[] }) => {
        if (!cancelled && result?.ok === 1 && Array.isArray(result.shards) && result.shards.length > 0) {
          setShardList(sortShards(result.shards.map(s => s.name)))
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const fetchData = async () => {
    const intervalNum = parseInt(interval)
    if (isNaN(intervalNum) || intervalNum <= 0) {
      setError('请输入有效的间隔时间')
      return
    }

    setLoading(true)
    setError('')
    setData(null)

    try {
      const response = await fetch(`/api/screeps?action=pvp&interval=${intervalNum}`)
      const result: PvPApiResponse = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || `请求失败: ${response.status}`)
      }
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败')
    } finally {
      setLoading(false)
    }
  }

  const roomsByShard: Record<string, PvPRoomData[]> = {}
  const activeShards: string[] = []
  let totalRooms = 0
  let activeBattles = 0
  let avgTickSpeed = 0

  if (data?.ok === 1 && data.pvp) {
    let totalTickSpeed = 0
    let shardCount = 0
    
    Object.entries(data.pvp).forEach(([shard, shardData]) => {
      if (shardData && shardData.rooms.length > 0) {
        activeShards.push(shard)
        roomsByShard[shard] = shardData.rooms
        totalRooms += shardData.rooms.length
        activeBattles += shardData.rooms.filter(room => shardData.time - room.lastPvpTime <= 10).length
        
        if (data.shardTickSpeeds?.[shard]) {
          totalTickSpeed += data.shardTickSpeeds[shard]
          shardCount++
        }
      }
    })
    
    if (shardCount > 0) {
      avgTickSpeed = totalTickSpeed / shardCount
    }
  }

  // 展示顺序：官方列表倒序（新分片在前），并合入数据中实际出现的分片
  const shards = sortShards(new Set([...shardList, ...Object.keys(roomsByShard)])).reverse()
  const totalKnownShards = new Set([...shardList, ...Object.keys(data?.pvp || {})]).size

  function formatTickSpeed(ms: number): string {
    const seconds = (ms / 1000).toFixed(1)
    return `${seconds} 秒/tick`
  }

  return (
    <div className="min-h-screen screeps-bg">
      <div className="grid-bg" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white">PvP 战争情况</h1>
        </div>

        <div className="space-y-4">
          <div className="bg-[#1d2027]/60 backdrop-blur-sm rounded-md p-4 border border-[#5973ff]/10 relative z-20">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs text-[#909fc4] mb-1">查询间隔（ticks）</label>
                <input
                  type="number"
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                  placeholder="100"
                  min="1"
                  className="w-full h-10 px-3 bg-[#1d2027] border border-[#5973ff]/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5973ff]/50"
                  onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="px-6 h-10 btn-primary rounded-lg text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {loading ? '加载中...' : '查询'}
                </button>
              </div>
            </div>
            {error && (
              <div className="mt-3 text-sm text-[#ff7379] bg-[#ff7379]/10 rounded-lg p-3 border border-[#ff7379]/30">
                {error}
              </div>
            )}
          </div>

          {data && (
            <>
              <div className="bg-[#1d2027]/60 backdrop-blur-sm rounded-md p-4 border border-[#5973ff]/10">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-[#0b0d0f]/60 rounded-lg p-3 border border-[#5973ff]/10">
                    <div className="text-xs text-[#909fc4]">活跃 Shard</div>
                    <div className="text-lg font-bold text-white">{activeShards.length}</div>
                    <div className="text-xs text-[#909fc4]/60">共 {totalKnownShards} 个 Shard</div>
                  </div>
                  <div className="bg-[#0b0d0f]/60 rounded-lg p-3 border border-[#ff7379]/10">
                    <div className="text-xs text-[#909fc4]">战斗房间数</div>
                    <div className="text-lg font-bold text-[#ff7379]">{totalRooms}</div>
                    <div className="text-xs text-[#909fc4]/60">最近 {interval} ticks</div>
                  </div>
                  <div className="bg-[#0b0d0f]/60 rounded-lg p-3 border border-green-500/10">
                    <div className="text-xs text-[#909fc4]">正在战斗</div>
                    <div className="text-lg font-bold text-green-400">{activeBattles}</div>
                    <div className="text-xs text-[#909fc4]/60">10 ticks 内</div>
                  </div>
                  <div className="bg-[#0b0d0f]/60 rounded-lg p-3 border border-[#5973ff]/10">
                    <div className="text-xs text-[#909fc4]">Tick 平均速度</div>
                    <div className="text-lg font-bold text-[#5973ff]">
                      {avgTickSpeed > 0 ? formatTickSpeed(avgTickSpeed) : '-'}
                    </div>
                    <div className="text-xs text-[#909fc4]/60">
                      {avgTickSpeed > 0 ? `${Math.round(avgTickSpeed)}ms` : '无数据'}
                    </div>
                  </div>
                </div>
              </div>

              {totalRooms > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {shards.map((shard) => {
                    const rooms = roomsByShard[shard]
                    if (!rooms || rooms.length === 0) return null

                    const shardData = data.pvp?.[shard]
                    const shardTime = shardData?.time || 0

                    return (
                      <div key={shard} className="bg-[#1d2027]/60 backdrop-blur-sm rounded-md p-4 border border-[#5973ff]/10">
                        <div className="flex items-center justify-between mb-3">
                          <h2 className="text-sm font-semibold text-[#e5e7eb]">
                            ⚔️ {shard}
                            {shard === 'shardX' && (
                              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium rounded bg-[#a459ff]/20 text-[#a459ff] border border-[#a459ff]/30 align-middle">⚡2x</span>
                            )}
                          </h2>
                          <div className="flex items-center gap-3 text-xs text-[#909fc4]">
                            <span>
                              Tick: <span className="text-white font-mono">{shardTime.toLocaleString()}</span>
                            </span>
                            {data.shardTickSpeeds?.[shard] && (
                              <span>
                                速度: <span className="text-[#5973ff] font-mono">{formatTickSpeed(data.shardTickSpeeds[shard])}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="overflow-x-auto -mx-4 px-4">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-[#909fc4] border-b border-[#5973ff]/10">
                                <th className="pb-3 pl-3 pr-4 font-medium">房间名称</th>
                                <th className="pb-3 px-4 font-medium">战斗时间</th>
                                <th className="pb-3 pl-4 pr-3 font-medium">距离现在</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rooms.map((room) => {
                                const timeAgo = shardTime - room.lastPvpTime
                                return (
                                  <tr 
                                    key={room._id} 
                                    className="border-b border-[#5973ff]/5 hover:bg-[#2c467e]/20 transition-colors"
                                  >
                                    <td className="py-3 pl-3 pr-4">
                                      <div className="flex items-center gap-2">
                                        <a 
                                          href={`https://screeps.com/a/#!/room/${shard}/${room._id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-white font-mono hover:text-[#5973ff] transition-colors"
                                          title={`在 Screeps 中查看 ${room._id}`}
                                        >
                                          {room._id}
                                        </a>
                                        {room.owner && (
                                          <a
                                            href={`https://screeps.com/a/#!/profile/${room.owner}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-[#5973ff] bg-[#5973ff]/10 border border-[#5973ff]/30 px-1.5 py-0.5 rounded font-medium hover:bg-[#5973ff]/20 transition-colors"
                                            title={`查看 ${room.owner} 的资料`}
                                          >
                                            {room.owner}
                                          </a>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-3 px-4">
                                      <span className="text-[#909fc4]">{room.lastPvpTime.toLocaleString()}</span>
                                    </td>
                                    <td className="py-3 pl-4 pr-3">
                                       <span className={timeAgo <= 100 ? 'text-[#ff7379] font-medium' : 'text-[#909fc4]'}>
                                          {timeAgo} ticks
                                        </span>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-[#1d2027]/60 backdrop-blur-sm rounded-md p-8 border border-[#5973ff]/10 text-center">
                  <div className="text-4xl mb-3">🕊️</div>
                  <div className="text-[#909fc4]">在最近 {interval} ticks 内没有发生 PvP 战斗</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
