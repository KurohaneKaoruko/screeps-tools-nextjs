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
    shard0?: PvPShardData
    shard1?: PvPShardData
    shard2?: PvPShardData
    shard3?: PvPShardData
    [key: string]: PvPShardData | undefined
  }
  shardTickSpeeds?: Record<string, number>
  error?: string
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
