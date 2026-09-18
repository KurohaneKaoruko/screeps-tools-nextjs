'use client'

import { useState, useEffect } from 'react'
import CustomSelect from '@/components/CustomSelect'
import {
  formatNumber,
  KNOWN_SHARDS,
  sortShards,
  GLOBAL_MARKET_RESOURCES,
  type MarketOrder,
  type ShardInfo
} from '@/lib/screeps-common'

const FALLBACK_SHARDS = [...KNOWN_SHARDS]

// 常用资源快捷标签
const QUICK_RESOURCES = [
  'energy', 'power', 'ops', 'pixel',
  'U', 'L', 'K', 'Z', 'X', 'G', 'OH', 'ZK', 'UL',
  'battery', 'utrium_bar', 'lemergium_bar', 'keanium_bar', 'zynthium_bar',
  'ghodium_melt', 'oxidant', 'reductant', 'purifier',
  'silicon', 'wire', 'switch', 'transistor', 'microchip', 'circuit', 'device',
  'metal', 'alloy', 'tube', 'fixture', 'frame', 'hydraulics', 'machine',
  'biomass', 'cell', 'phlegm', 'tissue', 'muscle', 'organoid', 'organism',
  'mist', 'condensate', 'concentrate', 'extract', 'spirit', 'emanation', 'essence'
]

function formatPrice(price: number): string {
  if (!Number.isFinite(price)) return '-'
  if (price === 0) return '0'
  if (price >= 100) return price.toFixed(1)
  if (price >= 1) return price.toFixed(2)
  return price.toFixed(4)
}

function OrdersTable({ orders, type, shard }: { orders: MarketOrder[]; type: 'buy' | 'sell'; shard?: string }) {
  const isBuy = type === 'buy'
  return (
    <div className="bg-[#1d2027]/60 backdrop-blur-sm rounded-md border border-[#5973ff]/10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#5973ff]/10 bg-[#161724]/50">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${
            isBuy
              ? 'bg-green-500/10 text-green-400 border-green-500/20'
              : 'bg-[#ff7379]/10 text-[#ff7379] border-[#ff7379]/20'
          }`}>
            {isBuy ? '买单 BUY' : '卖单 SELL'}
          </span>
          <span className="text-xs text-[#909fc4]">{orders.length} 个订单</span>
        </div>
        <span className="text-xs text-[#909fc4]/60">
          {isBuy ? '按价格从高到低' : '按价格从低到高'}
        </span>
      </div>
      {orders.length === 0 ? (
        <div className="p-6 text-center text-sm text-[#909fc4]/50">暂无订单</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#909fc4] border-b border-[#5973ff]/10">
                <th className="py-2.5 pl-4 pr-3 font-medium">价格</th>
                <th className="py-2.5 px-3 font-medium">剩余数量</th>
                <th className="py-2.5 px-3 font-medium">总量</th>
                <th className="py-2.5 pl-3 pr-4 font-medium">房间</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order._id} className="border-b border-[#5973ff]/5 hover:bg-[#2c467e]/20 transition-colors">
                  <td className={`py-2.5 pl-4 pr-3 font-mono font-semibold ${isBuy ? 'text-green-400' : 'text-[#ff7379]'}`}>
                    {formatPrice(order.price)}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-white">{formatNumber(order.remainingAmount)}</td>
                  <td className="py-2.5 px-3 font-mono text-[#909fc4]">{formatNumber(order.amount)}</td>
                  <td className="py-2.5 pl-3 pr-4">
                    {order.roomName && shard ? (
                      <a
                        href={`https://screeps.com/a/#!/room/${shard}/${order.roomName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[#5973ff] hover:text-[#a459ff] transition-colors"
                        title={`在 Screeps 中查看 ${order.roomName}`}
                      >
                        {order.roomName}
                      </a>
                    ) : (
                      <span className="text-[#909fc4]/50 font-mono">{order.roomName || '-'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function MarketPage() {
  const [resource, setResource] = useState('energy')
  const [shard, setShard] = useState('shard0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orders, setOrders] = useState<MarketOrder[] | null>(null)
  const [queriedResource, setQueriedResource] = useState('')
  const [queriedShard, setQueriedShard] = useState('')
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

  const isGlobalResource = GLOBAL_MARKET_RESOURCES.includes(resource.trim())

  const fetchData = async (res: string, shardName: string) => {
    const trimmed = res.trim()
    if (!trimmed) {
      setError('请输入资源类型')
      return
    }
    setLoading(true)
    setError('')
    setOrders(null)

    try {
      const effectiveShard = GLOBAL_MARKET_RESOURCES.includes(trimmed) ? '' : shardName
      const params = new URLSearchParams({
        action: 'market',
        mode: 'orders',
        resource: trimmed
      })
      if (effectiveShard) params.set('shard', effectiveShard)

      const response = await fetch(`/api/screeps?${params.toString()}`)
      const result = await response.json()

      if (!response.ok || result.ok !== 1) {
        throw new Error(result.error || `请求失败: ${response.status}`)
      }
      setOrders(result.orders || [])
      setQueriedResource(trimmed)
      setQueriedShard(effectiveShard)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败')
    } finally {
      setLoading(false)
    }
  }

  const sellOrders = (orders || []).filter(o => o.type === 'sell').sort((a, b) => a.price - b.price)
  const buyOrders = (orders || []).filter(o => o.type === 'buy').sort((a, b) => b.price - a.price)
  const bestSell = sellOrders[0]?.price
  const bestBuy = buyOrders[0]?.price
  const spread = bestSell !== undefined && bestBuy !== undefined ? bestSell - bestBuy : undefined
  const totalSellVolume = sellOrders.reduce((sum, o) => sum + o.remainingAmount, 0)
  const totalBuyVolume = buyOrders.reduce((sum, o) => sum + o.remainingAmount, 0)

  return (
    <div className="min-h-screen screeps-bg">
      <div className="grid-bg" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-white">市场查询</h1>
          <p className="text-xs text-[#909fc4]/60 mt-1">查询任意资源的买卖订单与市场价格（pixel 等全局资源不区分 Shard）</p>
        </div>

        <div className="space-y-4">
          {/* 查询栏 */}
          <div className="bg-[#1d2027]/60 backdrop-blur-sm rounded-md p-4 border border-[#5973ff]/10 relative z-20">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs text-[#909fc4] mb-1">资源类型</label>
                <input
                  type="text"
                  value={resource}
                  onChange={(e) => setResource(e.target.value)}
                  placeholder="例如: energy、U、battery、pixel"
                  className="w-full h-10 px-3 bg-[#1d2027] border border-[#5973ff]/20 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#5973ff]/50"
                  onKeyDown={(e) => e.key === 'Enter' && fetchData(resource, shard)}
                  list="market-resource-suggestions"
                />
                <datalist id="market-resource-suggestions">
                  {QUICK_RESOURCES.map(r => <option key={r} value={r} />)}
                </datalist>
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
                  onClick={() => fetchData(resource, shard)}
                  disabled={loading}
                  className="px-6 h-10 btn-primary rounded-lg text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {loading ? '查询中...' : '查询'}
                </button>
              </div>
            </div>

            {/* 快捷资源标签 */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {QUICK_RESOURCES.slice(0, 20).map(r => (
                <button
                  key={r}
                  onClick={() => {
                    setResource(r)
                    fetchData(r, shard)
                  }}
                  className={`px-2 py-1 text-xs rounded font-mono transition-colors border ${
                    resource === r
                      ? 'bg-[#5973ff]/20 text-white border-[#5973ff]/40'
                      : 'bg-[#0b0d0f]/50 text-[#909fc4] border-[#5973ff]/10 hover:text-white hover:border-[#5973ff]/30'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {error && (
              <div className="mt-3 text-sm text-[#ff7379] bg-[#ff7379]/10 rounded-lg p-3 border border-[#ff7379]/30">
                {error}
              </div>
            )}
          </div>

          {/* 统计卡片 */}
          {orders && (
            <div className="bg-[#1d2027]/60 backdrop-blur-sm rounded-md p-4 border border-[#5973ff]/10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[#e5e7eb] font-mono">
                  📈 {queriedResource}
                  <span className="ml-2 text-xs text-[#909fc4] font-sans">
                    {queriedShard || '全局资源（不区分 Shard）'}
                  </span>
                </h2>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="bg-[#0b0d0f]/60 rounded-lg p-3 border border-green-500/10">
                  <div className="text-xs text-[#909fc4]">最高买价</div>
                  <div className="text-lg font-bold text-green-400 font-mono">
                    {bestBuy !== undefined ? formatPrice(bestBuy) : '-'}
                  </div>
                </div>
                <div className="bg-[#0b0d0f]/60 rounded-lg p-3 border border-[#ff7379]/10">
                  <div className="text-xs text-[#909fc4]">最低卖价</div>
                  <div className="text-lg font-bold text-[#ff7379] font-mono">
                    {bestSell !== undefined ? formatPrice(bestSell) : '-'}
                  </div>
                </div>
                <div className="bg-[#0b0d0f]/60 rounded-lg p-3 border border-[#5973ff]/10">
                  <div className="text-xs text-[#909fc4]">价差</div>
                  <div className="text-lg font-bold text-[#5973ff] font-mono">
                    {spread !== undefined ? formatPrice(spread) : '-'}
                  </div>
                </div>
                <div className="bg-[#0b0d0f]/60 rounded-lg p-3 border border-green-500/10">
                  <div className="text-xs text-[#909fc4]">买单量</div>
                  <div className="text-lg font-bold text-white font-mono">{formatNumber(totalBuyVolume)}</div>
                </div>
                <div className="bg-[#0b0d0f]/60 rounded-lg p-3 border border-[#ff7379]/10">
                  <div className="text-xs text-[#909fc4]">卖单量</div>
                  <div className="text-lg font-bold text-white font-mono">{formatNumber(totalSellVolume)}</div>
                </div>
              </div>
            </div>
          )}

          {/* 订单列表 */}
          {orders && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <OrdersTable orders={sellOrders} type="sell" shard={queriedShard || undefined} />
              <OrdersTable orders={buyOrders} type="buy" shard={queriedShard || undefined} />
            </div>
          )}

          {!orders && !loading && !error && (
            <div className="bg-[#1d2027]/40 backdrop-blur-sm rounded-md p-12 border border-[#5973ff]/10 text-center">
              <div className="text-5xl mb-3">📈</div>
              <div className="text-[#909fc4]">输入资源类型开始查询市场订单</div>
              <div className="text-xs text-[#909fc4]/50 mt-2">数据来自 Screeps 官方市场 API</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
