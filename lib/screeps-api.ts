export interface ScreepsPlayerData {
  _id: string
  username: string
  gcl: number
  power: number
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

export interface ScreepsResourcesData {
  player: ScreepsPlayerData
  rooms: ScreepsRoomData[]
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

export class ScreepsApiClient {
  private baseUrl: string
  private token?: string

  constructor(shard: string = 'shard0', token?: string) {
    this.token = token
    this.baseUrl = `https://screeps.com/api/${shard}`
  }

  private async fetchApi(endpoint: string, options: RequestInit = {}): Promise<any> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    if (this.token) {
      headers['X-Token'] = this.token
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    })

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getPlayerDataByUsername(username: string): Promise<ScreepsPlayerData> {
    const response = await fetch(`/api/screeps?username=${encodeURIComponent(username)}`)
    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status} ${response.statusText}`)
    }
    const data: UserInfoResponse = await response.json()
    
    if (!data.ok || !data.user) {
      throw new Error(data.error || '未找到该玩家')
    }

    return data.user
  }

  async getRoomsByPlayer(userId: string): Promise<ScreepsRoomData[]> {
    const response = await fetch(`/api/screeps?id=${encodeURIComponent(userId)}`)
    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status} ${response.statusText}`)
    }
    const data: UserRoomsResponse = await response.json()
    
    if (!data.ok) {
      throw new Error(data.error || '获取房间数据失败')
    }

    const rooms: ScreepsRoomData[] = []
    
    if (data.shards) {
      for (const [shard, roomNames] of Object.entries(data.shards)) {
        for (const roomName of roomNames) {
          rooms.push({ name: roomName, shard })
        }
      }
    }
    
    return rooms
  }

  async getRoomObjects(room: string, shard: string): Promise<any> {
    const response = await fetch(`/api/screeps?room=${encodeURIComponent(room)}&shard=${encodeURIComponent(shard)}`)
    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status} ${response.statusText}`)
    }
    return response.json()
  }

  async getRoomsWithResources(userId: string): Promise<ScreepsRoomData[]> {
    const rooms = await this.getRoomsByPlayer(userId)
    
    const roomsWithResources = await Promise.all(
      rooms.map(async (room) => {
        try {
          const roomData = await this.getRoomObjects(room.name, room.shard)
          
          let storageEnergy = 0
          let terminalEnergy = 0
          let energyAvailable = 0
          let energyCapacityAvailable = 0
          let controllerLevel: number | undefined
          let controllerProgress: number | undefined
          let controllerProgressTotal: number | undefined
          const resources: Record<string, number> = {}

          if (roomData.objects) {
            for (const obj of roomData.objects) {
              if (obj.type === 'storage') {
                for (const [resourceType, amount] of Object.entries(obj.store || {})) {
                  const value = amount as number
                  if (value > 0) {
                    if (resourceType === 'energy') {
                      storageEnergy = value
                    } else {
                      resources[resourceType] = (resources[resourceType] || 0) + value
                    }
                  }
                }
              } else if (obj.type === 'terminal') {
                for (const [resourceType, amount] of Object.entries(obj.store || {})) {
                  const value = amount as number
                  if (value > 0) {
                    if (resourceType === 'energy') {
                      terminalEnergy = value
                    } else {
                      resources[resourceType] = (resources[resourceType] || 0) + value
                    }
                  }
                }
              } else if (obj.type === 'factory') {
                for (const [resourceType, amount] of Object.entries(obj.store || {})) {
                  const value = amount as number
                  if (value > 0) {
                    resources[resourceType] = (resources[resourceType] || 0) + value
                  }
                }
              } else if (obj.type === 'controller') {
                controllerLevel = obj.level
                controllerProgress = obj.progress
                controllerProgressTotal = obj.progressTotal
              } else if (obj.type === 'spawn' || obj.type === 'extension') {
                energyAvailable += obj.store?.energy || 0
                energyCapacityAvailable += obj.storeCapacityResource?.energy || 0
              }
            }
          }

          return {
            ...room,
            energyAvailable,
            energyCapacityAvailable,
            storageEnergy,
            terminalEnergy,
            controllerLevel,
            controllerProgress,
            controllerProgressTotal,
            resources
          }
        } catch (error) {
          return room
        }
      })
    )

    return roomsWithResources
  }

  aggregateShardResources(rooms: ScreepsRoomData[]): ScreepsShardResources {
    const resources: Record<string, number> = {}
    let totalEnergy = 0
    let totalPower = 0
    let totalOps = 0

    for (const room of rooms) {
      totalEnergy += room.storageEnergy || 0
      totalEnergy += room.terminalEnergy || 0

      if (room.resources) {
        for (const [resourceType, amount] of Object.entries(room.resources)) {
          resources[resourceType] = (resources[resourceType] || 0) + amount
        }
      }
    }

    return {
      energy: totalEnergy,
      power: totalPower,
      ops: totalOps,
      resources
    }
  }

  async getResourcesDataByUsername(username: string): Promise<ScreepsResourcesData> {
    const player = await this.getPlayerDataByUsername(username)
    const rooms = await this.getRoomsWithResources(player._id)
    return { player, rooms }
  }

  async getResourcesDataByUsernameFromAllShards(username: string, shards: string[] = ['shard0', 'shard1', 'shard2', 'shard3']): Promise<ScreepsShardResourcesData[]> {
    const player = await this.getPlayerDataByUsername(username)
    const allRooms = await this.getRoomsByPlayer(player._id)
    
    // 获取所有房间的详细资源数据
    const roomsWithResources = await Promise.all(
      allRooms.map(async (room) => {
        try {
          const roomData = await this.getRoomObjects(room.name, room.shard)
          
          let storageEnergy = 0
          let terminalEnergy = 0
          let energyAvailable = 0
          let energyCapacityAvailable = 0
          let controllerLevel: number | undefined
          let controllerProgress: number | undefined
          let controllerProgressTotal: number | undefined
          const resources: Record<string, number> = {}

          if (roomData.objects) {
            for (const obj of roomData.objects) {
              if (obj.type === 'storage') {
                for (const [resourceType, amount] of Object.entries(obj.store || {})) {
                  const value = amount as number
                  if (value > 0) {
                    if (resourceType === 'energy') {
                      storageEnergy = value
                    }
                    resources[resourceType] = (resources[resourceType] || 0) + value
                  }
                }
              } else if (obj.type === 'terminal') {
                for (const [resourceType, amount] of Object.entries(obj.store || {})) {
                  const value = amount as number
                  if (value > 0) {
                    if (resourceType === 'energy') {
                      terminalEnergy = value
                    }
                    resources[resourceType] = (resources[resourceType] || 0) + value
                  }
                }
              } else if (obj.type === 'factory') {
                for (const [resourceType, amount] of Object.entries(obj.store || {})) {
                  const value = amount as number
                  if (value > 0) {
                    resources[resourceType] = (resources[resourceType] || 0) + value
                  }
                }
              } else if (obj.type === 'controller') {
                controllerLevel = obj.level
                controllerProgress = obj.progress
                controllerProgressTotal = obj.progressTotal
              } else if (obj.type === 'spawn' || obj.type === 'extension') {
                energyAvailable += obj.store?.energy || 0
                energyCapacityAvailable += obj.storeCapacityResource?.energy || 0
              }
            }
          }

          return {
            ...room,
            energyAvailable,
            energyCapacityAvailable,
            storageEnergy,
            terminalEnergy,
            controllerLevel,
            controllerProgress,
            controllerProgressTotal,
            resources
          }
        } catch (error) {
          return room
        }
      })
    )

    // 按 shard 分组
    const result: ScreepsShardResourcesData[] = []
    for (const shard of shards) {
      const shardRooms = roomsWithResources.filter(room => room.shard === shard)
      if (shardRooms.length > 0) {
        result.push({
          shard,
          data: {
            player,
            rooms: shardRooms
          }
        })
      }
    }

    return result
  }

  async getPlayerData(): Promise<ScreepsPlayerData> {
    if (!this.token) {
      throw new Error('需要 API Token 才能获取当前玩家数据')
    }
    const data = await this.fetchApi('/auth/me')
    return {
      username: data.username,
      gcl: data.gcl || 0,
      gclProgress: data.gclProgress || 0,
      gclProgressTotal: data.gclProgressTotal || 0,
      power: data.power || 0,
      powerProgress: data.powerProgress || 0,
      powerProgressTotal: data.powerProgressTotal || 0,
      credits: data.credits || 0
    }
  }

  async getRooms(): Promise<ScreepsRoomData[]> {
    if (!this.token) {
      throw new Error('需要 API Token 才能获取房间数据')
    }
    const data = await this.fetchApi('/user/rooms')
    return (data || []).map((room: any) => ({
      name: room.name,
      owner: room.owner,
      level: room.controller?.level,
      energyAvailable: room.energyAvailable,
      energyCapacityAvailable: room.energyCapacityAvailable,
      controllerProgress: room.controller?.progress,
      controllerProgressTotal: room.controller?.progressTotal,
      storageEnergy: room.storage?.[RESOURCE_ENERGY],
      terminalEnergy: room.terminal?.[RESOURCE_ENERGY]
    }))
  }

  async getResourcesData(): Promise<ScreepsResourcesData> {
    const [player, rooms] = await Promise.all([
      this.getPlayerData(),
      this.getRooms()
    ])
    return { player, rooms }
  }

  async getConsoleLog(lines: number = 100): Promise<any[]> {
    if (!this.token) {
      throw new Error('需要 API Token 才能获取控制台日志')
    }
    const data = await this.fetchApi(`/user/console?limit=${lines}`)
    return data.log || []
  }

  async executeConsoleCommand(command: string): Promise<any> {
    if (!this.token) {
      throw new Error('需要 API Token 才能执行控制台命令')
    }
    return this.fetchApi('/user/console', {
      method: 'POST',
      body: JSON.stringify({ expression: command })
    })
  }
}

export function calculateGCLLevel(gcl: number): number {
  return Math.pow(gcl / 1000000, 1 / 2.4)
}

export function calculateGPLLevel(power: number): number {
  return Math.pow(power / 1000, 0.5)
}

export function formatNumber(num: number): string {
  if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'M'
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K'
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