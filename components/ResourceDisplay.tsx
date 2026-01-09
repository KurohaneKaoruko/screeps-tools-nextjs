'use client'

import { ScreepsRoomData } from '@/lib/screeps-api'
import { formatNumber } from '@/lib/screeps-api'

interface ResourceDisplayProps {
  rooms: ScreepsRoomData[]
  shardName?: string
}

export default function ResourceDisplay({ rooms, shardName }: ResourceDisplayProps) {
  const aggregateResources = (rooms: ScreepsRoomData[]): Record<string, number> => {
    const resources: Record<string, number> = {}
    
    for (const room of rooms) {
      if (room.resources) {
        for (const [resourceType, amount] of Object.entries(room.resources)) {
          resources[resourceType] = (resources[resourceType] || 0) + amount
        }
      }
    }
    
    return resources
  }

  const resources = aggregateResources(rooms)

  const categories: Record<string, { name: string; resources: string[] }> = {
    '基础资源': {
      name: '基础资源',
      resources: ['energy', 'power', 'ops']
    },
    '基础矿物': {
      name: '基础矿物',
      resources: ['H', 'O', 'L', 'K', 'Z', 'U', 'X', 'G']
    },
    '基础化合物': {
      name: '基础化合物',
      resources: ['OH', 'ZK', 'UL', 'GHO2', 'UH2O', 'KH2O', 'UHO2', 'LHO2', 'KHO2', 'XUH2O', 'XHO2', 'XKH2O', 'XZHO2', 'XGHO2', 'XLH2O', 'XLHO2', 'XGH2O', 'XZH2O', 'KH', 'ZH', 'UH', 'LH', 'GH', 'ZO', 'KO', 'UO', 'LO', 'GO']
    },
    '压缩资源': {
      name: '压缩资源',
      resources: ['utrium_bar', 'lemergium_bar', 'keanium_bar', 'zynthium_bar', 'ghodium_melt', 'oxidant', 'reductant', 'purifier', 'battery']
    },
    '高级资源': {
      name: '高级资源',
      resources: ['composite', 'crystal', 'liquid', 'wire', 'switch', 'transistor', 'microchip', 'circuit', 'device', 'fixture', 'frame', 'hydraulics', 'machine', 'organism', 'organoid', 'tissue', 'muscle', 'essence', 'spirit', 'phlegm', 'mist', 'biomass', 'metal', 'silicon', 'alloy', 'tube', 'cell', 'fiber', 'condensate', 'concentrate', 'extract', 'emanation']
    }
  }

  const renderCategory = (categoryKey: string, category: { name: string; resources: string[] }) => {
    const categoryResources = category.resources
      .map(resourceType => ({
        resourceType,
        amount: resources[resourceType] || 0
      }))
      .filter(({ amount }) => amount > 0)
      .sort((a, b) => b.amount - a.amount)

    if (categoryResources.length === 0) return null

    return (
      <div key={categoryKey} className="mb-4">
        <div className="text-sm font-medium text-gray-300 mb-2">{category.name}</div>
        <div className="bg-gray-900/40 rounded-lg p-3 border border-gray-700/50">
          {categoryResources.map(({ resourceType, amount }) => (
            <div key={resourceType} className="flex justify-between items-center py-1.5 border-b border-gray-700/30 last:border-0">
              <span className="text-gray-400 text-sm">{resourceType}</span>
              <span className="text-white font-medium text-sm">{formatNumber(amount)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const totalEnergy = resources['energy'] || 0
  const totalPower = resources['power'] || 0

  return (
    <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-indigo-500/10">
      {shardName && (
        <h2 className="text-lg font-semibold mb-4 text-gray-200">{shardName}</h2>
      )}
      
      <div className="mb-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900/60 rounded-lg p-4 border border-gray-700/50">
            <div className="text-xs text-gray-400 mb-1">房间数</div>
            <div className="text-2xl font-bold text-indigo-400">{rooms.length}</div>
          </div>
          <div className="bg-gray-900/60 rounded-lg p-4 border border-gray-700/50">
            <div className="text-xs text-gray-400 mb-1">可用能量</div>
            <div className="text-2xl font-bold text-yellow-400">{formatNumber(rooms.reduce((sum, room) => sum + (room.energyAvailable || 0), 0))}</div>
            <div className="text-xs text-gray-500 mt-1">/ {formatNumber(rooms.reduce((sum, room) => sum + (room.energyCapacityAvailable || 0), 0))} 容量</div>
          </div>
          <div className="bg-gray-900/60 rounded-lg p-4 border border-gray-700/50">
            <div className="text-xs text-gray-400 mb-1">Storage 能量</div>
            <div className="text-2xl font-bold text-orange-400">{formatNumber(rooms.reduce((sum, room) => sum + (room.storageEnergy || 0), 0))}</div>
          </div>
          <div className="bg-gray-900/60 rounded-lg p-4 border border-gray-700/50">
            <div className="text-xs text-gray-400 mb-1">Terminal 能量</div>
            <div className="text-2xl font-bold text-teal-400">{formatNumber(rooms.reduce((sum, room) => sum + (room.terminalEnergy || 0), 0))}</div>
          </div>
        </div>

        <div className="bg-gray-900/60 rounded-lg p-4 border border-gray-700/50 mb-6">
          <div className="text-sm font-medium text-gray-300 mb-2">汇总</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Energy</span>
              <span className="text-white font-medium">{formatNumber(totalEnergy)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Power</span>
              <span className="text-white font-medium">{formatNumber(totalPower)}</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3 text-gray-300">资源详情</h3>
        {Object.entries(categories).map(([key, category]) => renderCategory(key, category))}
      </div>
    </div>
  )
}
