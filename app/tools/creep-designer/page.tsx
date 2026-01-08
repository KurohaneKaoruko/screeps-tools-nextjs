'use client'

import { useState } from 'react'
import { 
  BoostType, 
  BodyPart, 
  calculateCreepStats, 
  calculateTimeStats, 
  getRemainingEnergy, 
  generateBodyProfile,
  BODY_PART_COSTS,
  CONTROLLER_LEVELS,
  BOOSTS_FOR_PART
} from '@/lib/creep-calculator'

export default function CreepDesignerPage() {
  const [parts, setParts] = useState<BodyPart[]>([
    { type: 'tough', count: 0 },
    { type: 'move', count: 0 },
    { type: 'work', count: 0 },
    { type: 'carry', count: 0 },
    { type: 'attack', count: 0 },
    { type: 'ranged_attack', count: 0 },
    { type: 'heal', count: 0 },
    { type: 'claim', count: 0 }
  ])
  const [tickDuration, setTickDuration] = useState(1)
  const [controllerLevel, setControllerLevel] = useState(8)

  const stats = calculateCreepStats(parts, tickDuration)
  const timeStats = calculateTimeStats(stats, tickDuration)
  const remainingEnergy = getRemainingEnergy(stats.totalCost, controllerLevel)
  const totalParts = parts.reduce((sum, part) => sum + part.count, 0)

  const updatePartCount = (index: number, delta: number) => {
    const newParts = [...parts]
    newParts[index].count = Math.max(0, Math.min(50, newParts[index].count + delta))
    setParts(newParts)
  }

  const setPartCount = (index: number, value: number) => {
    const newParts = [...parts]
    newParts[index].count = Math.max(0, Math.min(50, value))
    setParts(newParts)
  }

  const updatePartBoost = (index: number, boost: BoostType | undefined) => {
    const newParts = [...parts]
    newParts[index].boost = boost
    setParts(newParts)
  }

  const resetAll = () => {
    setParts(parts.map(p => ({ ...p, count: 0, boost: undefined })))
  }

  const bodyProfile = generateBodyProfile(parts)
  const shareLink = typeof window !== 'undefined' 
    ? `${window.location.origin}${window.location.pathname}?profile=${encodeURIComponent(bodyProfile)}`
    : ''

  const formatNumber = (num: number) => {
    if (!isFinite(num) || isNaN(num)) return '-'
    return num.toLocaleString()
  }

  const formatDecimal = (num: number) => {
    if (!isFinite(num) || isNaN(num)) return '-'
    return num.toFixed(2)
  }

  const isOverLimit = totalParts > 50
  const isOverBudget = remainingEnergy < 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Creep 设计器</h1>
          <button
            onClick={resetAll}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors text-sm"
          >
            重置
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* 左侧：部件选择 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              {parts.map((part, index) => (
                <div key={part.type} className="bg-gray-700/50 rounded-lg p-3 border border-gray-600/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium capitalize text-sm">{part.type.replace('_', ' ')}</span>
                    <span className="text-xs text-gray-400">{BODY_PART_COSTS[part.type]} 能量</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updatePartCount(index, -1)}
                      className="w-8 h-8 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors flex items-center justify-center font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={part.count}
                      onChange={(e) => setPartCount(index, parseInt(e.target.value) || 0)}
                      className="w-14 h-8 px-2 bg-gray-600 border border-gray-500 rounded-md text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => updatePartCount(index, 1)}
                      className="w-8 h-8 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors flex items-center justify-center font-bold"
                    >
                      +
                    </button>
                    <select
                      value={part.boost || ''}
                      onChange={(e) => updatePartBoost(index, e.target.value as BoostType || undefined)}
                      disabled={BOOSTS_FOR_PART[part.type].length === 0}
                      className="flex-1 h-8 px-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">无增强</option>
                      {BOOSTS_FOR_PART[part.type].map(boost => (
                        <option key={boost} value={boost}>{boost}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {/* Creep 可视化预览 */}
            {totalParts > 0 && (
              <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/50">
                <div className="text-xs text-gray-400 mb-3">部件预览</div>
                <div className="flex flex-wrap gap-1">
                  {parts.flatMap(part => 
                    Array(part.count).fill(null).map((_, i) => (
                      <div
                        key={`${part.type}-${i}`}
                        className={`w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold ${
                          part.type === 'tough' ? 'bg-gray-500 text-white' :
                          part.type === 'move' ? 'bg-green-600 text-white' :
                          part.type === 'work' ? 'bg-yellow-500 text-black' :
                          part.type === 'carry' ? 'bg-gray-400 text-black' :
                          part.type === 'attack' ? 'bg-red-600 text-white' :
                          part.type === 'ranged_attack' ? 'bg-blue-500 text-white' :
                          part.type === 'heal' ? 'bg-green-400 text-black' :
                          'bg-purple-600 text-white'
                        } ${part.boost ? 'ring-2 ring-white/50' : ''}`}
                        title={`${part.type}${part.boost ? ` (${part.boost})` : ''}`}
                      >
                        {part.type === 'tough' ? 'T' :
                         part.type === 'move' ? 'M' :
                         part.type === 'work' ? 'W' :
                         part.type === 'carry' ? 'C' :
                         part.type === 'attack' ? 'A' :
                         part.type === 'ranged_attack' ? 'R' :
                         part.type === 'heal' ? 'H' :
                         'L'}
                      </div>
                    ))
                  )}
                </div>
                <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-gray-400">
                  {parts.filter(p => p.count > 0).map(part => (
                    <div key={part.type} className="flex items-center gap-1">
                      <div className={`w-3 h-3 rounded-sm ${
                        part.type === 'tough' ? 'bg-gray-500' :
                        part.type === 'move' ? 'bg-green-600' :
                        part.type === 'work' ? 'bg-yellow-500' :
                        part.type === 'carry' ? 'bg-gray-400' :
                        part.type === 'attack' ? 'bg-red-600' :
                        part.type === 'ranged_attack' ? 'bg-blue-500' :
                        part.type === 'heal' ? 'bg-green-400' :
                        'bg-purple-600'
                      }`} />
                      <span className="capitalize">{part.type.replace('_', ' ')}: {part.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 右侧：统计面板 */}
          <div className="space-y-4">
            {/* 设置 */}
            <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/50">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="text-xs text-gray-400 mb-1 block">Tick(秒)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={tickDuration}
                    onChange={(e) => setTickDuration(parseInt(e.target.value) || 1)}
                    className="w-full h-9 px-2 bg-gray-600 border border-gray-500 rounded-md text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-xs text-gray-400 mb-1 block">控制器等级</label>
                  <select
                    value={controllerLevel}
                    onChange={(e) => setControllerLevel(parseInt(e.target.value))}
                    className="w-full h-9 px-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(CONTROLLER_LEVELS).map(([level, energy]) => (
                      <option key={level} value={level}>
                        Lv.{level} ({energy} 能量)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 核心统计 */}
            <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/50">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">孵化成本</span>
                  <span className={`text-lg font-bold ${isOverBudget ? 'text-red-400' : 'text-blue-400'}`}>
                    {stats.totalCost}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">部件数</span>
                  <span className={`text-lg font-bold ${isOverLimit ? 'text-red-400' : 'text-green-400'}`}>
                    {totalParts}/50
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">HP</span>
                  <span className="text-lg font-bold text-red-400">{stats.hp}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">有效HP</span>
                  <span className="text-lg font-bold text-red-300">{stats.effectiveHp}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">容量</span>
                  <span className="text-lg font-bold text-yellow-400">{stats.capacity}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">移动力</span>
                  <span className="text-lg font-bold text-teal-400">{stats.fatigue}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">攻击</span>
                  <span className="text-lg font-bold text-orange-400">{stats.attack}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">远程</span>
                  <span className="text-lg font-bold text-purple-400">{stats.rangedAttack}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">治疗</span>
                  <span className="text-lg font-bold text-pink-400">{stats.heal}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">远程治疗</span>
                  <span className="text-lg font-bold text-pink-300">{stats.rangedHeal}</span>
                </div>
              </div>
            </div>

            {/* 剩余能量 */}
            <div className={`rounded-lg p-4 border ${isOverBudget ? 'bg-red-900/20 border-red-600/50' : 'bg-gray-700/50 border-gray-600/50'}`}>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">剩余能量 (Lv.{controllerLevel})</span>
                <span className={`text-xl font-bold ${isOverBudget ? 'text-red-400' : 'text-green-400'}`}>
                  {remainingEnergy}
                </span>
              </div>
            </div>

            {/* Body Profile */}
            <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/50">
              <div className="text-xs text-gray-400 mb-2">Body Profile</div>
              <div className="bg-gray-800 rounded p-2 text-xs font-mono break-all mb-3 min-h-[2rem]">
                {bodyProfile || '{}'}
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(shareLink)}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm"
              >
                复制
              </button>
            </div>
          </div>
        </div>

        {/* 时间维度统计 */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h2 className="text-lg font-semibold mb-4">时间维度统计</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: '每 Tick', data: timeStats.perTick, color: 'text-blue-400', format: formatNumber },
              { title: '每 Work', data: timeStats.perUnit, color: 'text-green-400', format: formatNumber },
              { title: '每小时', data: timeStats.perHour, color: 'text-yellow-400', format: formatNumber },
              { title: '每天', data: timeStats.perDay, color: 'text-purple-400', format: formatNumber },
            ].map(({ title, data, color, format }) => (
              <div key={title} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/50">
                <h3 className={`font-semibold mb-3 ${color} text-sm`}>{title}</h3>
                <div className="space-y-2 text-xs">
                  {[
                    { label: '采集', value: data.harvest },
                    { label: '建造', value: data.build },
                    { label: '修复', value: data.repair },
                    { label: '拆解', value: data.dismantle },
                    { label: '升级', value: data.upgradeController },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-gray-400">{label}</span>
                      <span>{format(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
