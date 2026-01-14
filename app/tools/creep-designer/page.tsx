'use client'

import { useState } from 'react'
import CustomSelect from '@/components/CustomSelect'
import { 
  BoostType, 
  BodyPart, 
  calculateCreepStats, 
  calculateTimeStats, 
  getRemainingEnergy, 
  generateBodyProfile,
  BODY_PART_COSTS,
  CONTROLLER_LEVELS,
  BOOSTS_FOR_PART,
  BOOST_DESCRIPTIONS
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
  const [tickInputValue, setTickInputValue] = useState('1')
  const [controllerLevel, setControllerLevel] = useState(8)
  const [importValue, setImportValue] = useState('')
  const [importError, setImportError] = useState('')

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

  const importProfile = () => {
    setImportError('')
    try {
      const parsed = JSON.parse(importValue.trim())
      if (typeof parsed !== 'object' || parsed === null) {
        setImportError('格式错误')
        return
      }
      const newParts = parts.map(p => {
        const count = parsed[p.type]
        return {
          ...p,
          count: typeof count === 'number' ? Math.max(0, Math.min(50, Math.floor(count))) : 0,
          boost: undefined
        }
      })
      setParts(newParts)
      setImportValue('')
    } catch {
      setImportError('JSON 解析失败')
    }
  }

  const bodyProfile = generateBodyProfile(parts)

  const copyBodyProfile = async () => {
    try {
      await navigator.clipboard.writeText(bodyProfile)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = bodyProfile
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
  }

  const formatNumber = (num: number) => {
    if (!isFinite(num) || isNaN(num)) return '-'
    return num.toLocaleString()
  }

  const isOverLimit = totalParts > 50
  const isOverBudget = remainingEnergy < 0

  return (
    <div className="min-h-screen screeps-bg">
      <div className="grid-bg" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Creep 设计器</h1>
          </div>
          <button
            onClick={resetAll}
            className="px-4 py-2 btn-secondary rounded-lg text-sm font-medium text-[#909fc4]"
          >
            重置
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Part Selection */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              {parts.map((part, index) => (
                <div key={part.type} className="bg-[#1d2027]/60 backdrop-blur-sm rounded-md p-4 border border-[#5973ff]/10 card-hover">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium capitalize text-sm text-[#e5e7eb]">{part.type.replace('_', ' ')}</span>
                    <span className="text-xs text-[#909fc4]/60">{BODY_PART_COSTS[part.type]} 能量</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updatePartCount(index, -1)}
                      className="w-8 h-8 bg-[#1d2027] hover:bg-[#2c467e]/50 text-white rounded-lg transition-colors flex items-center justify-center font-bold border border-[#5973ff]/20"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={part.count}
                      onChange={(e) => setPartCount(index, parseInt(e.target.value) || 0)}
                      className="w-14 h-8 px-2 bg-[#1d2027] border border-[#5973ff]/20 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-[#5973ff]/50"
                    />
                    <button
                      onClick={() => updatePartCount(index, 1)}
                      className="w-8 h-8 bg-[#1d2027] hover:bg-[#2c467e]/50 text-white rounded-lg transition-colors flex items-center justify-center font-bold border border-[#5973ff]/20"
                    >
                      +
                    </button>
                    <CustomSelect
                      value={part.boost || ''}
                      onChange={(val) => updatePartBoost(index, val as BoostType || undefined)}
                      disabled={BOOSTS_FOR_PART[part.type].length === 0}
                      placeholder="无增强"
                      options={[
                        { value: '', label: '无增强' },
                        ...BOOSTS_FOR_PART[part.type].map(boost => ({
                          value: boost,
                          label: `${boost} (${BOOST_DESCRIPTIONS[boost]})`
                        }))
                      ]}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Creep Preview */}
            {totalParts > 0 && (
              <div className="bg-[#1d2027]/60 backdrop-blur-sm rounded-md p-4 border border-[#5973ff]/10">
                <div className="text-xs text-[#909fc4]/60 mb-3">部件预览</div>
                <div className="flex flex-wrap gap-1">
                  {parts.flatMap(part => 
                    Array(part.count).fill(null).map((_, i) => (
                      <div
                        key={`${part.type}-${i}`}
                        className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                          part.type === 'tough' ? 'bg-gray-500 text-white' :
                          part.type === 'move' ? 'bg-green-600 text-white' :
                          part.type === 'work' ? 'bg-yellow-500 text-black' :
                          part.type === 'carry' ? 'bg-gray-400 text-black' :
                          part.type === 'attack' ? 'bg-red-600 text-white' :
                          part.type === 'ranged_attack' ? 'bg-blue-500 text-white' :
                          part.type === 'heal' ? 'bg-green-400 text-black' :
                          'bg-purple-600 text-white'
                        } ${part.boost ? 'ring-2 ring-[#5973ff]/50' : ''}`}
                        title={`${part.type}${part.boost ? ` (${part.boost})` : ''}`}
                      >
                        {part.type === 'tough' ? 'T' :
                         part.type === 'move' ? 'M' :
                         part.type === 'work' ? 'W' :
                         part.type === 'carry' ? 'C' :
                         part.type === 'attack' ? 'A' :
                         part.type === 'ranged_attack' ? 'R' :
                         part.type === 'heal' ? 'H' : 'L'}
                      </div>
                    ))
                  )}
                </div>
                <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-[#909fc4]/60">
                  {parts.filter(p => p.count > 0).map(part => (
                    <div key={part.type} className="flex items-center gap-1">
                      <div className={`w-3 h-3 rounded ${
                        part.type === 'tough' ? 'bg-gray-500' :
                        part.type === 'move' ? 'bg-green-600' :
                        part.type === 'work' ? 'bg-yellow-500' :
                        part.type === 'carry' ? 'bg-gray-400' :
                        part.type === 'attack' ? 'bg-red-600' :
                        part.type === 'ranged_attack' ? 'bg-blue-500' :
                        part.type === 'heal' ? 'bg-green-400' : 'bg-purple-600'
                      }`} />
                      <span className="capitalize">{part.type.replace('_', ' ')}: {part.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Stats Panel */}
          <div className="space-y-4">
            {/* Settings */}
            <div className="bg-[#1d2027]/60 backdrop-blur-sm rounded-md p-4 border border-[#5973ff]/10">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="text-xs text-[#909fc4] mb-1.5 block">Tick(秒)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={tickInputValue}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '' || /^\d+$/.test(val)) {
                        setTickInputValue(val)
                        const num = parseInt(val)
                        if (num >= 1 && num <= 60) setTickDuration(num)
                      }
                    }}
                    onBlur={() => {
                      const num = parseInt(tickInputValue)
                      if (!num || num < 1) { setTickInputValue('1'); setTickDuration(1) }
                      else if (num > 60) { setTickInputValue('60'); setTickDuration(60) }
                    }}
                    className="w-full h-9 px-2 bg-[#1d2027] border border-[#5973ff]/20 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-[#5973ff]/50"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-xs text-[#909fc4] mb-1.5 block">控制器等级</label>
                  <select
                    value={controllerLevel}
                    onChange={(e) => setControllerLevel(parseInt(e.target.value))}
                    className="w-full h-9 px-2 bg-[#1d2027] border border-[#5973ff]/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#5973ff]/50"
                  >
                    {Object.entries(CONTROLLER_LEVELS).map(([level, energy]) => (
                      <option key={level} value={level}>Lv.{level} ({energy} 能量)</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Core Stats */}
            <div className="bg-[#1d2027]/60 backdrop-blur-sm rounded-md p-4 border border-[#5973ff]/10">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#909fc4]">孵化成本</span>
                  <span className={`text-lg font-bold ${isOverBudget ? 'text-[#ff7379]' : 'text-[#5973ff]'}`}>{stats.totalCost}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#909fc4]">部件数</span>
                  <span className={`text-lg font-bold ${isOverLimit ? 'text-[#ff7379]' : 'text-green-400'}`}>{totalParts}/50</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#909fc4]">HP</span>
                  <span className="text-lg font-bold text-[#ff7379]">{stats.hp}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#909fc4]">有效HP</span>
                  <span className="text-lg font-bold text-[#ff7379]/80">{stats.effectiveHp}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#909fc4]">容量</span>
                  <span className="text-lg font-bold text-yellow-400">{stats.capacity}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#909fc4]">移动力</span>
                  <span className="text-lg font-bold text-teal-400">{stats.fatigue}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#909fc4]">攻击</span>
                  <span className="text-lg font-bold text-orange-400">{stats.attack}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#909fc4]">远程攻击</span>
                  <span className="text-lg font-bold text-[#a459ff]">{stats.rangedAttack}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#909fc4]">治疗</span>
                  <span className="text-lg font-bold text-pink-400">{stats.heal}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#909fc4]">远程治疗</span>
                  <span className="text-lg font-bold text-pink-300">{stats.rangedHeal}</span>
                </div>
              </div>
            </div>

            {/* Remaining Energy */}
            <div className={`rounded-md p-4 border ${isOverBudget ? 'bg-[#ff7379]/10 border-[#ff7379]/30' : 'bg-[#1d2027]/60 border-[#5973ff]/10'}`}>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#909fc4]">剩余能量 (Lv.{controllerLevel})</span>
                <span className={`text-lg font-bold ${isOverBudget ? 'text-[#ff7379]' : 'text-green-400'}`}>{remainingEnergy}</span>
              </div>
            </div>

            {/* Body Profile */}
            <div className="bg-[#1d2027]/60 backdrop-blur-sm rounded-md p-4 border border-[#5973ff]/10">
              <div className="text-xs text-[#909fc4] mb-2">Body Profile</div>
              <div className="bg-[#0b0d0f]/80 rounded-lg p-3 text-xs font-mono break-all mb-3 min-h-[2rem] border border-[#5973ff]/10">
                {bodyProfile || '{}'}
              </div>
              <button onClick={copyBodyProfile} className="w-full px-4 py-2.5 btn-primary rounded-lg text-sm font-medium text-white">
                复制
              </button>
              <div className="mt-3 pt-3 border-t border-[#5973ff]/10">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={importValue}
                    onChange={(e) => { setImportValue(e.target.value); setImportError('') }}
                    placeholder='{"work":10,"move":5}'
                    className="flex-1 h-9 px-3 bg-[#1d2027] border border-[#5973ff]/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#5973ff]/50"
                  />
                  <button onClick={importProfile} className="px-4 py-2 btn-secondary rounded-lg text-sm font-medium text-[#909fc4]">
                    导入
                  </button>
                </div>
                {importError && <div className="text-xs text-[#ff7379] mt-2">{importError}</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Time Stats */}
        <div className="mt-8 pt-8 border-t border-[#5973ff]/10">
          <h2 className="text-lg font-semibold mb-4 text-[#e5e7eb]">时间维度统计</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: '每 Tick', data: timeStats.perTick, color: 'text-[#5973ff]' },
              { title: '每 Work', data: timeStats.perUnit, color: 'text-green-400' },
              { title: '每小时', data: timeStats.perHour, color: 'text-yellow-400' },
              { title: '每天', data: timeStats.perDay, color: 'text-[#a459ff]' },
            ].map(({ title, data, color }) => (
              <div key={title} className="bg-[#1d2027]/60 backdrop-blur-sm rounded-md p-4 border border-[#5973ff]/10">
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
                      <span className="text-[#909fc4]">{label}</span>
                      <span className="text-[#e5e7eb]">{formatNumber(value)}</span>
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
