'use client'

import { useState } from 'react'
import { calculateGCLLevel, calculateGPLLevel, formatNumber, RESOURCE_CATEGORIES } from '@/lib/screeps-common'
import CustomSelect from '@/components/CustomSelect'

const SHARDS = [
  { value: 'all', label: '所有 Shard' },
  { value: 'shard0', label: 'shard0' },
  { value: 'shard1', label: 'shard1' },
  { value: 'shard2', label: 'shard2' },
  { value: 'shard3', label: 'shard3' },
]

// 资源颜色映射
const RESOURCE_COLORS: Record<string, string> = {
  // 基础资源
  energy: 'text-yellow-400',
  power: 'text-red-400',
  ops: 'text-gray-300',
  
  // 基础矿物
  H: 'text-gray-300',
  O: 'text-gray-300',
  U: 'text-cyan-400',
  K: 'text-purple-400',
  L: 'text-green-400',
  Z: 'text-yellow-500',
  X: 'text-red-400',
  G: 'text-white',
  
  // 一级化合物
  OH: 'text-gray-300',
  ZK: 'text-yellow-300',
  UL: 'text-teal-300',
  UH: 'text-cyan-400',
  UO: 'text-cyan-400',
  KH: 'text-purple-400',
  KO: 'text-purple-400',
  LH: 'text-green-400',
  LO: 'text-green-400',
  ZH: 'text-yellow-500',
  ZO: 'text-yellow-500',
  GH: 'text-white',
  GO: 'text-white',
  
  // 二级化合物
  UH2O: 'text-cyan-300',
  UHO2: 'text-cyan-300',
  KH2O: 'text-purple-300',
  KHO2: 'text-purple-300',
  LH2O: 'text-green-300',
  LHO2: 'text-green-300',
  ZH2O: 'text-yellow-400',
  ZHO2: 'text-yellow-400',
  GH2O: 'text-gray-200',
  GHO2: 'text-gray-200',
  
  // 三级化合物
  XUH2O: 'text-cyan-200',
  XUHO2: 'text-cyan-200',
  XKH2O: 'text-purple-200',
  XKHO2: 'text-purple-200',
  XLH2O: 'text-green-200',
  XLHO2: 'text-green-200',
  XZH2O: 'text-yellow-300',
  XZHO2: 'text-yellow-300',
  XGH2O: 'text-gray-100',
  XGHO2: 'text-gray-100',
  
  // 压缩资源
  utrium_bar: 'text-cyan-400',
  lemergium_bar: 'text-green-400',
  keanium_bar: 'text-purple-400',
  zynthium_bar: 'text-yellow-500',
  ghodium_melt: 'text-white',
  oxidant: 'text-gray-300',
  reductant: 'text-gray-300',
  purifier: 'text-red-400',
  battery: 'text-yellow-400',
  
  // 高级资源 - 机械
  composite: 'text-gray-400',
  crystal: 'text-blue-300',
  liquid: 'text-blue-400',
  
  // 高级资源 - 电子
  wire: 'text-cyan-400',
  switch: 'text-cyan-300',
  transistor: 'text-cyan-200',
  microchip: 'text-cyan-100',
  circuit: 'text-blue-300',
  device: 'text-blue-200',
  
  // 高级资源 - 生物
  cell: 'text-green-500',
  phlegm: 'text-green-400',
  tissue: 'text-green-300',
  muscle: 'text-green-200',
  organoid: 'text-green-100',
  organism: 'text-lime-300',
  
  // 高级资源 - 神秘
  mist: 'text-purple-400',
  condensate: 'text-purple-300',
  concentrate: 'text-purple-200',
  extract: 'text-purple-100',
  spirit: 'text-violet-300',
  emanation: 'text-violet-200',
  essence: 'text-fuchsia-300',
  
  // 高级资源 - 金属
  metal: 'text-orange-600',
  biomass: 'text-lime-400',
  silicon: 'text-blue-400',
  
  alloy: 'text-orange-400',
  tube: 'text-orange-300',
  fixtures: 'text-orange-200',
  frame: 'text-orange-100',
  hydraulics: 'text-amber-300',
  machine: 'text-amber-200',
  
  fiber: 'text-lime-300',
  fixture: 'text-orange-200',
}

interface PlayerData {
  _id: string
  username: string
  gcl: number
  power: number
}

interface RoomResources {
  name: string
  shard: string
  storageEnergy: number
  terminalEnergy: number
  resources: Record<string, number>
}

interface PlayerResourcesResponse {
  ok: number
  player: PlayerData
  rooms: RoomResources[]
  error?: string
}

// 获取资源颜色
function getResourceColor(resourceType: string): string {
  return RESOURCE_COLORS[resourceType] || 'text-gray-400'
}

// 资源汇总展示组件
function ResourceSummary({ resources, title }: { resources: Record<string, number>; title?: string }) {
  const renderCategory = (categoryKey: string, category: { name: string; resources: string[] }) => {
    // 按定义顺序过滤出有数量的资源
    const categoryResources = category.resources
      .map(resourceType => ({ resourceType, amount: resources[resourceType] || 0 }))
      .filter(({ amount }) => amount > 0)

    if (categoryResources.length === 0) return null

    return (
      <div key={categoryKey} className="mb-3 last:mb-0">
        <div className="text-xs font-medium text-[#909fc4] mb-1.5">{category.name}</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1.5">
          {categoryResources.map(({ resourceType, amount }) => (
            <div key={resourceType} className="flex justify-between items-center py-1.5 px-3 bg-[#0b0d0f]/50 rounded text-xs gap-2 min-w-0">
              <span className={`${getResourceColor(resourceType)} truncate`}>{resourceType}</span>
              <span className="text-white font-medium shrink-0">{formatNumber(amount)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#1d2027]/60 backdrop-blur-sm rounded-md p-4 border border-[#5973ff]/10">
      <h2 className="text-sm font-semibold mb-3 text-[#e5e7eb]">{title || '📦 资源汇总'}</h2>
      {Object.entries(RESOURCE_CATEGORIES).map(([key, category]) => renderCategory(key, category))}
    </div>
  )
}

export default function PlayerResourcesPage() {
  const [username, setUsername] = useState('')
  const [shard, setShard] = useState('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<PlayerResourcesResponse | null>(null)

  const fetchData = async () => {
    if (!username.trim()) {
      setError('请输入玩家名')
      return
    }

    setLoading(true)
    setError('')
    setData(null)

    try {
      const response = await fetch(`/api/screeps?action=resources&username=${encodeURIComponent(username.trim())}&shard=${shard}`)
      const result: PlayerResourcesResponse = await response.json()
      
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

  const gclLevel = data ? calculateGCLLevel(data.player.gcl) : 0
  const gplLevel = data ? calculateGPLLevel(data.player.power) : 0
  const totalRooms = data ? data.rooms.length : 0

  const shardGroups = data ? data.rooms.reduce((acc, room) => {
    if (!acc[room.shard]) {
      acc[room.shard] = { rooms: [], totalResources: {} }
    }
    acc[room.shard].rooms.push(room)
    for (const [resourceType, amount] of Object.entries(room.resources)) {
      acc[room.shard].totalResources[resourceType] = (acc[room.shard].totalResources[resourceType] || 0) + amount
    }
    return acc
  }, {} as Record<string, { rooms: RoomResources[]; totalResources: Record<string, number>}>) : {}

  const totalResources = data ? data.rooms.reduce((acc, room) => {
    for (const [resourceType, amount] of Object.entries(room.resources)) {
      acc[resourceType] = (acc[resourceType] || 0) + amount
    }
    return acc
  }, {} as Record<string, number>) : {}

  const sortedShards = Object.keys(shardGroups).sort()

  return (
    <div className="min-h-screen screeps-bg">
      <div className="grid-bg" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-white">查询资源</h1>
        </div>

        <div className="space-y-4">
          <div className="bg-[#1d2027]/60 backdrop-blur-sm rounded-md p-4 border border-[#5973ff]/10 relative z-20">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="输入玩家名"
                  className="w-full h-10 px-3 bg-[#1d2027] border border-[#5973ff]/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5973ff]/50"
                  onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                />
              </div>
              <div className="w-full sm:w-40 relative z-30">
                <CustomSelect
                  value={shard}
                  onChange={(val) => setShard(val)}
                  options={SHARDS}
                  placeholder="选择 Shard"
                />
              </div>
              <button
                onClick={fetchData}
                disabled={loading}
                className="px-6 h-10 btn-primary rounded-lg text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {loading ? '加载中...' : '查询'}
              </button>
            </div>
            {error && (
              <div className="mt-3 text-sm text-[#ff7379] bg-[#ff7379]/10 rounded-lg p-3 border border-[#ff7379]/30">
                {error}
              </div>
            )}
          </div>

          {data && (
            <>
              {/* 玩家信息 */}
              <div className="bg-[#1d2027]/60 backdrop-blur-sm rounded-md p-4 border border-[#5973ff]/10">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-[#0b0d0f]/60 rounded-lg p-3 border border-[#5973ff]/10 overflow-hidden">
                    <div className="text-xs text-[#909fc4]">用户名</div>
                    <div className="text-lg font-bold text-white truncate">{data.player.username}</div>
                    <div className="text-xs text-[#909fc4]/60 truncate">{data.player._id}</div>
                  </div>
                  <div className="bg-[#0b0d0f]/60 rounded-lg p-3 border border-green-500/10">
                    <div className="text-xs text-[#909fc4]">GCL</div>
                    <div className="text-lg font-bold text-green-400">{gclLevel.toFixed(2)}</div>
                    <div className="text-xs text-[#909fc4]/60">{formatNumber(data.player.gcl)} XP</div>
                  </div>
                  <div className="bg-[#0b0d0f]/60 rounded-lg p-3 border border-[#a459ff]/10">
                    <div className="text-xs text-[#909fc4]">GPL</div>
                    <div className="text-lg font-bold text-[#a459ff]">{gplLevel.toFixed(2)}</div>
                    <div className="text-xs text-[#909fc4]/60">{formatNumber(data.player.power)} Power</div>
                  </div>
                  <div className="bg-[#0b0d0f]/60 rounded-lg p-3 border border-[#5973ff]/10">
                    <div className="text-xs text-[#909fc4]">房间</div>
                    <div className="text-lg font-bold text-[#5973ff]">{totalRooms}</div>
                    <div className="text-xs text-[#909fc4]/60">{sortedShards.length} 个 Shard</div>
                  </div>
                </div>
              </div>

              {/* 多 shard 时显示总汇总，单 shard 时直接显示该 shard 资源 */}
              {sortedShards.length > 1 ? (
                <>
                  {/* 总资源汇总 */}
                  {Object.keys(totalResources).length > 0 && (
                    <ResourceSummary resources={totalResources} title="📦 全部资源汇总" />
                  )}

                  {/* 各 Shard 资源 */}
                  {sortedShards.map((shardName) => {
                    const shardData = shardGroups[shardName]
                    return (
                      <div key={shardName} className="bg-[#1d2027]/60 backdrop-blur-sm rounded-md p-4 border border-[#5973ff]/10">
                        <div className="flex items-center justify-between mb-3">
                          <h2 className="text-sm font-semibold text-[#e5e7eb]">📍 {shardName}</h2>
                          <span className="text-xs text-[#909fc4]">{shardData.rooms.length} 个房间</span>
                        </div>
                        {Object.keys(shardData.totalResources).length > 0 ? (
                          Object.entries(RESOURCE_CATEGORIES).map(([key, category]) => {
                            const categoryResources = category.resources
                              .map(rt => ({ resourceType: rt, amount: shardData.totalResources[rt] || 0 }))
                              .filter(({ amount }) => amount > 0)
                            if (categoryResources.length === 0) return null
                            return (
                              <div key={key} className="mb-3 last:mb-0">
                                <div className="text-xs font-medium text-[#909fc4] mb-1.5">{category.name}</div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1.5">
                                  {categoryResources.map(({ resourceType, amount }) => (
                                    <div key={resourceType} className="flex justify-between items-center py-1.5 px-3 bg-[#0b0d0f]/50 rounded text-xs gap-2 min-w-0">
                                      <span className={`${getResourceColor(resourceType)} truncate`}>{resourceType}</span>
                                      <span className="text-white font-medium shrink-0">{formatNumber(amount)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <div className="text-[#909fc4]/60 text-xs">暂无资源数据</div>
                        )}
                      </div>
                    )
                  })}
                </>
              ) : (
                /* 单 shard 时只显示一个资源卡片 */
                sortedShards.length === 1 && Object.keys(totalResources).length > 0 && (
                  <ResourceSummary resources={totalResources} title={`📦 ${sortedShards[0]} (${shardGroups[sortedShards[0]].rooms.length} 房间)`} />
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
