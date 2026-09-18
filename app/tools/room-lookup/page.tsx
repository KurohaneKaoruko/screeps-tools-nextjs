'use client'

import { useState, useEffect } from 'react'
import CustomSelect from '@/components/CustomSelect'
import {
  formatNumber,
  KNOWN_SHARDS,
  sortShards,
  type RoomLookupResponse,
  type ShardInfo
} from '@/lib/screeps-common'

const FALLBACK_SHARDS = [...KNOWN_SHARDS]

const ROOM_NAME_PATTERN = /^[WE]\d+[NS]\d+$/

function formatProtectionTimestamp(ts: number | null | undefined): string {
  if (!ts || typeof ts !== 'number' || ts <= 0) return '-'
  // novice / respawnArea 是 Unix 秒级时间戳，表示保护区结束时间
  const date = new Date(ts * 1000)
  if (isNaN(date.getTime())) return String(ts)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function formatRcl(level: number | null | undefined): string {
  if (level == null) return '-'
  return 'Lv.' + level
}

export default function RoomLookupPage() {
  const [roomName, setRoomName] = useState('')
  const [shard, setShard] = useState('shard0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<RoomLookupResponse | null>(null)
  const [shardList, setShardList] = useState<string[]>(FALLBACK_SHARDS)

  // 动态获取官方 shard 列表（含 shardX）
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
    const trimmed = roomName.trim().toUpperCase()
    if (!ROOM_NAME_PATTERN.test(trimmed)) {
      setError('房间名格式不正确，例如：W1N1、E20S30')
      return
    }

    setLoading(true)
    setError('')
    setData(null)

    try {
      const params = new URLSearchParams({
        action: 'room',
        room: trimmed,
        shard
      })
      const response = await fetch('/api/screeps?' + params.toString())
      const result: RoomLookupResponse = await response.json()
      if (!response.ok || result.ok !== 1) {
        throw new Error(result.error || ('请求失败: ' + response.status))
      }
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败')
    } finally {
      setLoading(false)
    }
  }

  const room = data?.room

  return (
    <div className="min-h-screen screeps-bg">
      <div className="grid-bg" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-white">房间信息查询</h1>
          <p className="text-xs text-[#909fc4]/60 mt-1">查询任意房间的所有者、等级、签名与保护状态，快速侦察目标房间</p>
        </div>

        <div className="space-y-4">
          {/* 查询栏 */}
          <div className="bg-[#1d2027]/60 backdrop-blur-sm rounded-md p-4 border border-[#5973ff]/10 relative z-20">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs text-[#909fc4] mb-1">房间名</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="例如: W1N1、E20S30"
                  className="w-full h-10 px-3 bg-[#1d2027] border border-[#5973ff]/20 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#5973ff]/50"
                  onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                />
              </div>
              <div className="w-full sm:w-40 relative z-30">
                <label className="block text-xs text-[#909fc4] mb-1">Shard</label>
                <CustomSelect
                  value={shard}
                  onChange={(val) => setShard(val)}
                  options={shardList.map(s => ({ value: s, label: s === 'shardX' ? 'shardX ⚡' : s }))}
                  placeholder="选择 Shard"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="px-6 h-10 btn-primary rounded-lg text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {loading ? '查询中...' : '查询'}
                </button>
              </div>
            </div>
            {error && (
              <div className="mt-3 text-sm text-[#ff7379] bg-[#ff7379]/10 rounded-lg p-3 border border-[#ff7379]/30">
                {error}
              </div>
            )}
          </div>

          {/* 查询结果 */}
          {room && (
            <>
              {/* 房间概览 */}
              <div className="bg-[#1d2027]/60 backdrop-blur-sm rounded-md p-4 border border-[#5973ff]/10">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-white font-mono">
                    🏠 {room.name}
                    <span className="ml-2 text-xs text-[#909fc4] font-sans">{room.shard}</span>
                  </h2>
                  <a
                    href={'https://screeps.com/a/#!/room/' + room.shard + '/' + room.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#5973ff] hover:text-[#a459ff] transition-colors"
                  >
                    在 Screeps 中打开 ↗
                  </a>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-[#0b0d0f]/60 rounded-lg p-3 border border-[#5973ff]/10 overflow-hidden">
                    <div className="text-xs text-[#909fc4]">所有者</div>
                    {room.ownerUsername ? (
                      <a
                        href={'https://screeps.com/a/#!/profile/' + room.ownerUsername}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-bold text-white truncate block hover:text-[#5973ff] transition-colors"
                        title={'查看 ' + room.ownerUsername + ' 的资料'}
                      >
                        {room.ownerUsername}
                      </a>
                    ) : (
                      <div className="text-lg font-bold text-[#909fc4]">无主房间</div>
                    )}
                  </div>
                  <div className="bg-[#0b0d0f]/60 rounded-lg p-3 border border-green-500/10">
                    <div className="text-xs text-[#909fc4]">控制等级 (RCL)</div>
                    <div className="text-lg font-bold text-green-400">
                      {formatRcl(room.ownerLevel)}
                    </div>
                  </div>
                  <div className="bg-[#0b0d0f]/60 rounded-lg p-3 border border-[#a459ff]/10">
                    <div className="text-xs text-[#909fc4]">房间状态</div>
                    <div className="text-lg font-bold text-[#a459ff] truncate" title={room.status}>
                      {room.status || 'normal'}
                    </div>
                  </div>
                  <div className="bg-[#0b0d0f]/60 rounded-lg p-3 border border-[#5973ff]/10">
                    <div className="text-xs text-[#909fc4]">当前 Game Time</div>
                    <div className="text-lg font-bold text-[#5973ff] font-mono">
                      {room.gameTime ? formatNumber(room.gameTime) : '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 保护状态 */}
              {(room.novice != null || room.respawnArea != null) && (
                <div className="bg-[#1d2027]/60 backdrop-blur-sm rounded-md p-4 border border-yellow-500/20">
                  <h3 className="text-sm font-semibold text-[#e5e7eb] mb-3">🛡️ 特殊区域状态</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#0b0d0f]/60 rounded-lg p-3 border border-yellow-500/10">
                      <div className="text-xs text-[#909fc4]">新手保护区结束</div>
                      <div className="text-sm font-bold text-yellow-400">{formatProtectionTimestamp(room.novice)}</div>
                    </div>
                    <div className="bg-[#0b0d0f]/60 rounded-lg p-3 border border-yellow-500/10">
                      <div className="text-xs text-[#909fc4]">重生区结束</div>
                      <div className="text-sm font-bold text-yellow-400">{formatProtectionTimestamp(room.respawnArea)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 房间签名 */}
              {room.sign && room.sign.text && (
                <div className="bg-[#1d2027]/60 backdrop-blur-sm rounded-md p-4 border border-[#5973ff]/10">
                  <h3 className="text-sm font-semibold text-[#e5e7eb] mb-2">✏️ 房间签名</h3>
                  <p className="text-sm text-[#e5e7eb] whitespace-pre-wrap break-all">
                    {room.sign.text}
                  </p>
                  <p className="text-xs text-[#909fc4]/60 mt-2">
                    {room.sign.username ? room.sign.username + ' · ' : ''}
                    tick {formatNumber(room.sign.time)}
                  </p>
                </div>
              )}
            </>
          )}

          {!room && !loading && !error && (
            <div className="bg-[#1d2027]/40 backdrop-blur-sm rounded-md p-12 border border-[#5973ff]/10 text-center">
              <div className="text-5xl mb-3">🏠</div>
              <div className="text-[#909fc4]">输入房间名开始查询</div>
              <div className="text-xs text-[#909fc4]/50 mt-2">支持所有 Shard（含 shardX）</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
