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
    resources: ['H', 'O', 'U', 'L', 'K', 'Z', 'X', 'G']
  },
  '基础化合物': {
    name: '基础化合物',
    resources: [
      // 按列排列：基础 | U系 | Z系 | K系 | L系 | G系
      'OH',  'UH',   'ZH',   'KH',   'LH',   'GH',
      'ZK',  'UH2O', 'ZH2O', 'KH2O', 'LH2O', 'GH2O',
      'UL',  'XUH2O','XZH2O','XKH2O','XLH2O','XGH2O',
      'G',   'UO',   'ZO',   'KO',   'LO',   'GO',
             'UHO2', 'ZHO2', 'KHO2', 'LHO2', 'GHO2',
             'XUHO2','XZHO2','XKHO2','XLHO2','XGHO2',
    ]
  },
  '压缩资源': {
    name: '压缩资源',
    resources: [
      'battery',
      'utrium_bar', 'lemergium_bar', 'keanium_bar', 'zynthium_bar',
      'ghodium_melt', 'oxidant', 'reductant', 'purifier'
    ]
  },
  '高级资源': {
    name: '高级资源',
    resources: [
      // 基础商品
      'composite', 'crystal', 'liquid',
      // 金属系列 (mechanical)
      'metal', 'alloy', 'tube', 'fixture', 'frame', 'hydraulics', 'machine',
      // 生物系列 (biological)
      'biomass', 'cell', 'phlegm', 'tissue', 'muscle', 'organoid', 'organism',
      // 电子系列 (electronical)
      'silicon', 'wire', 'switch', 'transistor', 'microchip', 'circuit', 'device',
      // 神秘系列 (mystical)
      'mist', 'condensate', 'concentrate', 'extract', 'spirit', 'emanation', 'essence'
    ]
  }
}
