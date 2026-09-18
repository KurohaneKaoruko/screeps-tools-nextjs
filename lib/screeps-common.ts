export interface ScreepsPlayerData {
  _id: string
  username: string
  gcl: number
  gclProgress?: number
  gclProgressTotal?: number
  power: number
  powerProgress?: number
  powerProgressTotal?: number
  credits?: number
  badge?: any
}

export interface ScreepsRoomData {
  name: string
  shard: string
  energyAvailable?: number
  energyCapacityAvailable?: number
  storageEnergy?: number
  terminalEnergy?: number
  controllerLevel?: number
  controllerProgress?: number
  controllerProgressTotal?: number
  resources?: Record<string, number>
}

export interface ScreepsShardResources {
  energy: number
  power: number
  ops: number
  resources: Record<string, number>
}

export interface ScreepsResourcesData {
  player: ScreepsPlayerData
  rooms: ScreepsRoomData[]
  shardResources?: Record<string, ScreepsShardResources>
}

export interface ScreepsShardResourcesData {
  shard: string
  data: ScreepsResourcesData
}

export interface BaseData {
  ok: number
  error?: string
}

export interface UserInfoResponse extends BaseData {
  user?: ScreepsPlayerData
}

export interface UserRoomsResponse extends BaseData {
  shards?: Record<string, string[]>
  reservations?: Record<string, string[]>
}

export interface PlayerResourcesResponse {
  ok: number
  player: ScreepsPlayerData
  rooms: ScreepsRoomData[]
  error?: string
}

export interface NukeData {

  id: string
  roomName: string
  launchRoomName: string
  timeToLand: number
  landTime: number
  shard: string
  targetOwner?: string
  launchOwner?: string
}

export interface NukesResponse {
  ok: number
  nukes: NukeData[]
  shardGameTimes: Record<string, number>
  shardTickSpeeds: Record<string, number>
  error?: string
}

export interface PvPRoomData {
  _id: string
  lastPvpTime: number
  owner?: string | null
}

export interface PvPShardData {
  time: number
  rooms: PvPRoomData[]
}

export interface PvPResponse {
  ok: number,
  pvp: {
    [key: string]: PvPShardData | undefined
  }
  shardTickSpeeds?: Record<string, number>
  error?: string
}

/** Shard 动态信息（tick 速度、房间数、玩家数） */
export interface ShardInfo {
  name: string
  tick: number
  rooms?: number
  users?: number
}

export interface ShardsInfoResponse {
  ok: number
  shards: ShardInfo[]
  error?: string
}

/** 市场资源概览统计 */
export interface MarketResourceStat {
  _id: string
  count: number
  avgPrice: number
  stddevPrice: number
}

export interface MarketIndexResponse {
  ok: number
  shard: string
  list: MarketResourceStat[]
  error?: string
}

export interface MarketOrder {
  _id: string
  type: 'buy' | 'sell'
  amount: number
  remainingAmount: number
  price: number
  roomName: string
}

export interface MarketOrdersResponse {
  ok: number
  resourceType: string
  shard?: string
  orders: MarketOrder[]
  error?: string
}

/** 房间信息查询结果 */
export interface RoomLookupData {
  name: string
  shard: string
  ownerUsername?: string | null
  ownerLevel?: number | null
  sign?: { username?: string; text: string; time: number } | null
  status?: string
  novice?: number | null
  respawnArea?: number | null
  gameTime?: number
}

export interface RoomLookupResponse {
  ok: number
  room?: RoomLookupData
  error?: string
}

/**
 * 已知 Shard 列表（含 2026-04 新增的 shardX，tick 速度约为其他 shard 的 2 倍）。
 * 服务端返回的 shards action 会包含官方最新分片，此列表仅作为兜底。
 */
export const KNOWN_SHARDS: readonly string[] = ['shard0', 'shard1', 'shard2', 'shard3', 'shardX']

export const DEFAULT_SHARD = 'shard0'

/** 不区分 shard 的全局市场资源 */
export const GLOBAL_MARKET_RESOURCES: readonly string[] = ['pixel', 'cpuUnlock', 'accessKey']

/**
 * 按 shard0 → shardN → shardX（及其它特殊分片）的顺序排序。
 * 数字分片按编号升序，非数字分片排在数字分片之后并按名称排序。
 */
export function sortShards(names: Iterable<string>): string[] {
  const numeric: { name: string; index: number }[] = []
  const special: string[] = []
  for (const name of names) {
    const match = /^shard(\d+)$/i.exec(name)
    if (match) {
      numeric.push({ name, index: parseInt(match[1]!, 10) })
    } else {
      special.push(name)
    }
  }
  numeric.sort((a, b) => a.index - b.index)
  special.sort((a, b) => a.localeCompare(b))
  return [...numeric.map(n => n.name), ...special]
}

/** 格式化 tick 速度显示（毫秒 → 秒或毫秒） */
export function formatTickSpeed(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '-'
  if (ms % 1000 === 0) return (ms / 1000) + '秒'
  return Math.round(ms) + 'ms'
}

/** 格式化剩余时长（秒 → "1h 23m 45s"） */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '即将爆炸'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  if (hours > 0) return hours + 'h ' + minutes + 'm ' + seconds + 's'
  if (minutes > 0) return minutes + 'm ' + seconds + 's'
  return seconds + 's'
}

export function calculateGCLLevel(gcl: number): number {

  return Math.pow(gcl / 1000000, 1 / 2.4)
}

export function calculateGPLLevel(power: number): number {
  return Math.pow(power / 1000, 0.5)
}

export function formatNumber(num: number): string {
  if (num === undefined) return 'N/A'
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M'
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K'
  return num.toString()
}

export function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0%'
  return ((value / total) * 100).toFixed(2) + '%'
}

export const RESOURCE_CATEGORIES: Record<string, { name: string; resources: string[] }> = {
  '基础资源': {
    name: '基础资源',
    resources: ['energy', 'power', 'ops']
  },
  '基础矿物': {
    name: '基础矿物',
    resources: ['H', 'O', 'U', 'L', 'K', 'Z', 'X']
  },
  '中间产物': {
    name: '中间产物',
    resources: ['OH', 'ZK', 'UL', 'G']
  },
  '提升化合物 (U系)': {
    name: '提升化合物 (U系)',
    resources: ['UH', 'UH2O', 'XUH2O', 'UO', 'UHO2', 'XUHO2']
  },
  '提升化合物 (Z系)': {
    name: '提升化合物 (Z系)',
    resources: ['ZH', 'ZH2O', 'XZH2O', 'ZO', 'ZHO2', 'XZHO2']
  },
  '提升化合物 (K系)': {
    name: '提升化合物 (K系)',
    resources: ['KH', 'KH2O', 'XKH2O', 'KO', 'KHO2', 'XKHO2']
  },
  '提升化合物 (L系)': {
    name: '提升化合物 (L系)',
    resources: ['LH', 'LH2O', 'XLH2O', 'LO', 'LHO2', 'XLHO2']
  },
  '提升化合物 (G系)': {
    name: '提升化合物 (G系)',
    resources: ['GH', 'GH2O', 'XGH2O', 'GO', 'GHO2', 'XGHO2']
  },
  '压缩资源': {
    name: '压缩资源',
    resources: [
      'battery',
      'utrium_bar', 'lemergium_bar', 'keanium_bar', 'zynthium_bar',
      'ghodium_melt', 'oxidant', 'reductant', 'purifier'
    ]
  },
  '商品 (基础)': {
    name: '商品 (基础)',
    resources: ['composite', 'crystal', 'liquid']
  },
  '商品 (机械)': {
    name: '商品 (机械)',
    resources: ['metal', 'alloy', 'tube', 'fixture', 'frame', 'hydraulics', 'machine']
  },
  '商品 (生物)': {
    name: '商品 (生物)',
    resources: ['biomass', 'cell', 'phlegm', 'tissue', 'muscle', 'organoid', 'organism']
  },
  '商品 (电子)': {
    name: '商品 (电子)',
    resources: ['silicon', 'wire', 'switch', 'transistor', 'microchip', 'circuit', 'device']
  },
  '商品 (神秘)': {
    name: '商品 (神秘)',
    resources: ['mist', 'condensate', 'concentrate', 'extract', 'spirit', 'emanation', 'essence']
  }
}

/** 所有已知资源类型的扁平列表（市场查询用） */
export const ALL_MARKET_RESOURCES: string[] = [
  ...GLOBAL_MARKET_RESOURCES,
  ...Object.values(RESOURCE_CATEGORIES).flatMap(c => c.resources)
]
