import { NextRequest, NextResponse } from 'next/server'
import { Shard, IMapStats, IRoomObjects, IUserInfo, IAllRooms, INukesData, IPvpData, IAllShardInfo } from 'screeps-simple-api'
import { ScreepsServerApi } from '@/lib/screeps-api'
import { 
  ScreepsPlayerData, 
  ScreepsRoomData, 
  PlayerResourcesResponse, 
  NukeData, 
  NukesResponse, 
  PvPResponse, 
  PvPShardData, 
  PvPRoomData,
  RoomLookupResponse,
  GLOBAL_MARKET_RESOURCES,
  KNOWN_SHARDS,
  sortShards
} from '@/lib/screeps-common'

const api = new ScreepsServerApi().raw




// 辅助函数：处理 API 错误
const handleApiError = (error: any, defaultMsg: string) => {
  console.error(defaultMsg, error)
  return { ok: 0, error: error instanceof Error ? error.message : defaultMsg }
}

// 简单的内存缓存


const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 60 * 1000

// 房间所有者缓存
interface RoomOwnerCacheEntry {
  owner: string | null
  timestamp: number
}

const roomOwnerCache = new Map<string, RoomOwnerCacheEntry>()
const ROOM_OWNER_CACHE_TTL = 5 * 60 * 1000 

// Shards 信息缓存
let shardsInfoCache: { data: IAllShardInfo; timestamp: number } | null = null
const SHARDS_INFO_CACHE_TTL = 5 * 60 * 1000

function getRoomOwnerCacheKey(shard: string, room: string): string {
  return `room_owner_${shard}_${room}`
}

function getRoomOwnerFromCache(shard: string, room: string): string | null | undefined {
  const key = getRoomOwnerCacheKey(shard, room)
  const cached = roomOwnerCache.get(key)
  if (cached && Date.now() - cached.timestamp < ROOM_OWNER_CACHE_TTL) {
    return cached.owner
  }
  if (cached) {
    roomOwnerCache.delete(key)
  }
  return undefined 
}

function setRoomOwnerCache(shard: string, room: string, owner: string | null): void {
  const key = getRoomOwnerCacheKey(shard, room)
  roomOwnerCache.set(key, { owner, timestamp: Date.now() })
}

// 调用 map-stats API 获取房间所有者
async function getRoomOwners(
  rooms: string[],
  shard: string
): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {}
  
  if (rooms.length === 0) {
    return result
  }

  try {
    // 使用 screeps-simple-api 获取 map stats
    const data: IMapStats = await api.getMapStats(rooms, shard as Shard, 'owner0')

    if (data.ok !== 1) {
      rooms.forEach(room => { result[room] = null })
      return result
    }

    for (const room of rooms) {
      const roomStats = data.stats?.[room]
      let userId: string | undefined
      
      if (roomStats?.own) {
        if (typeof roomStats.own === 'object' && roomStats.own.user) {
          userId = roomStats.own.user
        } else if (typeof roomStats.own === 'string') {
          userId = roomStats.own
        }
      }
      
      if (userId) {
        const userInfo = data.users?.[userId]
        result[room] = userInfo?.username || null
      } else {
        result[room] = null
      }
    }

    return result
  } catch (error) {
    rooms.forEach(room => { result[room] = null })
    return result
  }
}

// 批量获取房间所有者（带缓存）
async function fetchRoomOwnersWithCache(
  rooms: { room: string; shard: string }[]
): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {}
  const cacheMisses: { room: string; shard: string }[] = []

  for (const { room, shard } of rooms) {
    const cacheKey = `${shard}_${room}`
    const cached = getRoomOwnerFromCache(shard, room)
    if (cached !== undefined) {
      result[cacheKey] = cached
    } else {
      cacheMisses.push({ room, shard })
    }
  }

  if (cacheMisses.length === 0) {
    return result
  }

  const roomsByShard = new Map<string, string[]>()
  for (const { room, shard } of cacheMisses) {
    const shardRooms = roomsByShard.get(shard) || []
    shardRooms.push(room)
    roomsByShard.set(shard, shardRooms)
  }

  const apiPromises = Array.from(roomsByShard.entries()).map(
    async ([shard, shardRooms]) => {
      try {
        const owners = await getRoomOwners(shardRooms, shard)
        for (const room of shardRooms) {
          const owner = owners[room] ?? null
          setRoomOwnerCache(shard, room, owner)
          result[`${shard}_${room}`] = owner
        }
      } catch (error) {
        for (const room of shardRooms) {
          result[`${shard}_${room}`] = null
        }
      }
    }
  )

  await Promise.all(apiPromises)

  return result
}

function getCached<T>(key: string): T | null {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T
  }
  cache.delete(key)
  return null
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() })
}

setInterval(() => {
  const now = Date.now()
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cache.delete(key)
    }
  }
  for (const [key, value] of roomOwnerCache.entries()) {
    if (now - value.timestamp > ROOM_OWNER_CACHE_TTL) {
      roomOwnerCache.delete(key)
    }
  }
}, 5 * 60 * 1000)

async function getRoomResources(room: string, shard: string): Promise<ScreepsRoomData> {
  // 使用 screeps-simple-api 获取 room objects
  const data: IRoomObjects = await api.getRoomObject(room, shard as Shard)

  
  let storageEnergy = 0
  let terminalEnergy = 0
  const resources: Record<string, number> = {}

  if (data.objects) {
    for (const obj of data.objects) {
      if (obj.type === 'storage' || obj.type === 'terminal' || obj.type === 'factory') {
        // @ts-ignore - store 类型在不同对象中略有不同，这里统一处理
        const store = obj.store
        if (store) {
            for (const [resourceType, amount] of Object.entries(store)) {
            const value = amount as number
            if (value > 0) {
                resources[resourceType] = (resources[resourceType] || 0) + value
                if (obj.type === 'storage' && resourceType === 'energy') {
                storageEnergy = value
                } else if (obj.type === 'terminal' && resourceType === 'energy') {
                terminalEnergy = value
                }
            }
            }
        }
      }
    }
  }

  return { name: room, shard, storageEnergy, terminalEnergy, resources }
}

// 获取玩家所有资源数据
async function getPlayerResources(username: string, targetShard: string = 'all'): Promise<PlayerResourcesResponse> {
  const cacheKey = `player_resources_${username}_${targetShard}`
  const cached = getCached<PlayerResourcesResponse>(cacheKey)
  if (cached) return cached

  try {
    // 使用 screeps-simple-api 获取用户信息
    const userInfo: IUserInfo = await api.getUserInfoByUserName(username)
    if (userInfo.ok !== 1 || !userInfo.user) {
      return { ok: 0, player: {} as ScreepsPlayerData, rooms: [], error: '玩家不存在' }
    }
    const player = userInfo.user as ScreepsPlayerData


    // 使用 screeps-simple-api 获取用户房间
    const userRooms: IAllRooms = await api.getRooms(player._id)
    
    const shardsData = userRooms.shards || {}
    if (Object.keys(shardsData).length === 0) {
      return { ok: 1, player, rooms: [], error: '玩家没有房间' }
    }

    const roomShardPairs: { room: string; shard: string }[] = []
    for (const [shard, rooms] of Object.entries(shardsData as Record<string, string[]>)) {
      if (targetShard !== 'all' && shard !== targetShard) continue
      if (Array.isArray(rooms)) {
        for (const room of rooms) {
          roomShardPairs.push({ room, shard })
        }
      }
    }

    if (roomShardPairs.length === 0) {
      return { ok: 1, player, rooms: [] }
    }

    const roomResourcesResults = await Promise.all(
      roomShardPairs.map(({ room, shard }) => 
        getRoomResources(room, shard).catch(() => ({ name: room, shard, storageEnergy: 0, terminalEnergy: 0, resources: {} }))
      )
    )

    const result = { ok: 1, player, rooms: roomResourcesResults }
    
    setCache(cacheKey, result)
    
    return result
  } catch (error) {
    return { 
      ok: 0, 
      player: {} as ScreepsPlayerData, 
      rooms: [], 
      error: error instanceof Error ? error.message : '获取玩家资源失败' 
    }
  }
}


async function getNukes(shards: string[]): Promise<NukesResponse> {
  const allNukes: NukeData[] = []
  const shardGameTimes: Record<string, number> = {}
  
  try {
    // 使用 screeps-simple-api 获取 Nuke
    const nukesData: INukesData = await api.getNukes()
    
    if (nukesData?.ok === 1 && nukesData.nukes) {
      const shardResults = await Promise.all(
        shards.map(async shard => {
          // @ts-ignore - nukesData.nukes 类型定义可能不完全匹配实际返回的 key
          const shardNukes = nukesData.nukes[shard]
          if (!Array.isArray(shardNukes) || shardNukes.length === 0) return []
          
          // 使用 screeps-simple-api 获取游戏时间
          const gameTimeData = await api.getGameTime(shard as Shard)
          shardGameTimes[shard] = typeof gameTimeData?.time === 'number' ? gameTimeData.time : 0
          
          return shardNukes.map((nuke: any) => ({
            id: nuke._id || nuke.id || '',
            roomName: nuke.room,
            launchRoomName: nuke.launchRoomName,
            timeToLand: nuke.timeToLand || 0, // 添加默认值或从 nuke 对象获取
            landTime: nuke.landTime,
            shard
          }))

        })
      )
      
      allNukes.push(...shardResults.flat())
    }
    
    if (allNukes.length > 0) {
      const roomsToQuery: { room: string; shard: string }[] = []
      
      for (const nuke of allNukes) {
        roomsToQuery.push({ room: nuke.roomName, shard: nuke.shard })
        roomsToQuery.push({ room: nuke.launchRoomName, shard: nuke.shard })
      }
      
      const uniqueRooms = Array.from(
        new Map(roomsToQuery.map(r => [`${r.shard}_${r.room}`, r])).values()
      )
      
      const ownerData = await fetchRoomOwnersWithCache(uniqueRooms)
      
      for (const nuke of allNukes) {
        const targetOwnerKey = `${nuke.shard}_${nuke.roomName}`
        const launchOwnerKey = `${nuke.shard}_${nuke.launchRoomName}`
        nuke.targetOwner = ownerData[targetOwnerKey] ?? undefined
        nuke.launchOwner = ownerData[launchOwnerKey] ?? undefined
      }
    }
    
    const shardsInfo = await getShardsInfo()
    const shardTickSpeeds: Record<string, number> = {}
    if (shardsInfo.ok === 1 && shardsInfo.shards) {
      shardsInfo.shards.forEach(shard => {
        shardTickSpeeds[shard.name] = shard.tick
      })
    }
    
    return { ok: 1, nukes: allNukes, shardGameTimes, shardTickSpeeds }
  } catch (error) {
    return { ok: 0, nukes: allNukes, shardGameTimes, shardTickSpeeds: {}, error: error instanceof Error ? error.message : '获取 Nuke 数据失败' }
  }
}

// 查询各 shard 动态列表（含 shardX 等新分片）
async function getShardList(): Promise<{ name: string; tick: number; rooms?: number; users?: number }[]> {
  const shardsInfo = await getShardsInfo()
  if (shardsInfo.ok === 1 && Array.isArray(shardsInfo.shards) && shardsInfo.shards.length > 0) {
    return shardsInfo.shards.map(s => ({
      name: String(s.name),
      tick: typeof s.tick === 'number' ? s.tick : 0,
      rooms: typeof s.rooms === 'number' ? s.rooms : undefined,
      users: typeof s.users === 'number' ? s.users : undefined
    }))
  }
  // 兜底：官方 shards/info 不可用时返回已知列表
  return KNOWN_SHARDS.map(name => ({ name, tick: 0 }))
}

// 房间信息查询（所有者、等级、签名、保护状态、游戏时间）
async function getRoomInfo(roomName: string, shard: string): Promise<RoomLookupResponse> {
  const cacheKey = `room_info_${shard}_${roomName}`
  const cached = getCached<RoomLookupResponse>(cacheKey)
  if (cached) return cached

  try {
    const [mapStats, gameTimeData, roomStatus] = await Promise.all([
      api.getMapStats([roomName], shard as Shard, 'owner0'),
      api.getGameTime(shard as Shard).catch(() => null),
      api.getRoomStatus(roomName, shard as Shard).catch(() => null)
    ])

    if ((mapStats as any).ok !== 1) {
      return { ok: 0, error: '地图数据不可用' }
    }

    const stats = (mapStats as any).stats?.[roomName]
    if (!stats) {
      return { ok: 0, error: '房间不存在或数据不可用' }
    }

    let ownerUsername: string | null = null
    let ownerLevel: number | null = null
    if (stats.own) {
      const userId = typeof stats.own === 'object' ? stats.own.user : stats.own
      ownerLevel = typeof stats.own === 'object' ? (stats.own.level ?? null) : null
      ownerUsername = (userId && (mapStats as any).users?.[userId]?.username) || null
    }

    const sign = stats.sign && stats.sign.text
      ? {
          username: (mapStats as any).users?.[stats.sign.user]?.username,
          text: stats.sign.text,
          time: stats.sign.time
        }
      : null

    // roomStatus 运行时可能是数组或单对象，做防御性处理
    let statusData: any = (roomStatus as any)?.rooms
    if (Array.isArray(statusData)) statusData = statusData[0] ?? null

    const result: RoomLookupResponse = {
      ok: 1,
      room: {
        name: roomName,
        shard,
        ownerUsername,
        ownerLevel,
        sign,
        status: stats.status || statusData?.status || undefined,
        novice: statusData?.novice ?? null,
        respawnArea: statusData?.respawnArea ?? null,
        gameTime: typeof gameTimeData?.time === 'number' ? gameTimeData.time : undefined
      }
    }
    setCache(cacheKey, result)
    return result
  } catch (error) {
    return { ok: 0, error: error instanceof Error ? error.message : '查询房间信息失败' }
  }
}


async function getShardsInfo(): Promise<IAllShardInfo> {
  if (shardsInfoCache && Date.now() - shardsInfoCache.timestamp < SHARDS_INFO_CACHE_TTL) {
    return shardsInfoCache.data
  }

  try {
    // 使用 screeps-simple-api 获取 shard 信息
    const data: IAllShardInfo = await api.getShards()
    
    shardsInfoCache = { data, timestamp: Date.now() }
    return data
  } catch (error) {
    return { 
      ok: 0, 
      shards: [] 
    }
  }
}

async function getPvPData(interval: number): Promise<PvPResponse> {
  try {
    // 使用 screeps-simple-api 获取 PvP 数据
    const data: IPvpData = await api.getPvp(interval)
    
    const shardsInfo = await getShardsInfo()
    let shardTickSpeeds: Record<string, number> = {}

    if (shardsInfo.ok === 1 && shardsInfo.shards) {
      shardsInfo.shards.forEach(shard => {
        shardTickSpeeds[shard.name] = shard.tick
      })
    }
    
    // 转换 screeps-simple-api 的响应格式到前端需要的格式
    const result: PvPResponse = {
        ok: data.ok || 0,
        pvp: {},
        shardTickSpeeds
    }

    if (data.ok === 1 && data.pvp) {
      const roomsToQuery: { room: string; shard: string }[] = []
      
      for (const [shard, shardData] of Object.entries(data.pvp)) {
        // @ts-ignore
        if (shardData?.rooms) {
           // @ts-ignore
          for (const room of shardData.rooms) {
            roomsToQuery.push({ room: room._id, shard })
          }
        }
      }
      
      if (roomsToQuery.length > 0) {
        const ownerData = await fetchRoomOwnersWithCache(roomsToQuery)
        
        // 构造返回数据
        for (const [shard, shardData] of Object.entries(data.pvp)) {
            // @ts-ignore
            if (shardData?.rooms) {
                const pvpRooms = (shardData as any).rooms.map((room: any) => ({
                    _id: room._id,
                    lastPvpTime: room.lastPvpTime,
                    owner: ownerData[`${shard}_${room._id}`] ?? undefined
                })) as PvPRoomData[]

                result.pvp[shard] = {
                    time: (shardData as any).time,
                    rooms: pvpRooms
                }
            }
        }
      } else {
        // 如果没有房间需要查询所有者，直接复制数据
        for (const [shard, shardData] of Object.entries(data.pvp)) {
            // @ts-ignore
            if (shardData?.rooms) {
                 result.pvp[shard] = shardData as unknown as PvPShardData
            }
        }
      }
    }

    
    return result
  } catch (error) {
    return { 
      ok: 0, 
      pvp: {},
      error: error instanceof Error ? error.message : '获取 PvP 数据失败' 
    }
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')

  try {
    if (action === 'resources') {
      const username = searchParams.get('username')
      const shard = searchParams.get('shard') || 'all'
      if (!username) {
        return NextResponse.json({ ok: 0, error: 'Missing username parameter' }, { status: 400 })
      }
      const result = await getPlayerResources(username, shard)
      return NextResponse.json(result)
    }

    if (action === 'nukes') {
      // 动态获取 shard 列表，自动覆盖 shardX 等新分片
      const shardList = (await getShardList()).map(s => s.name)
      const result = await getNukes(shardList)
      return NextResponse.json(result)
    }

    if (action === 'shards') {
      const shards = sortShards(await getShardList().then(list => list.map(s => s.name)))
      const info = await getShardsInfo()
      const details = shards.map(name => {
        const found = info.ok === 1 ? info.shards?.find(s => String(s.name) === name) : undefined
        return {
          name,
          tick: typeof found?.tick === 'number' ? found.tick : 0,
          rooms: typeof found?.rooms === 'number' ? found.rooms : undefined,
          users: typeof found?.users === 'number' ? found.users : undefined
        }
      })
      return NextResponse.json({ ok: 1, shards: details })
    }

    if (action === 'room') {
      const room = searchParams.get('room')
      const shard = searchParams.get('shard') || 'shard0'
      if (!room) {
        return NextResponse.json({ ok: 0, error: 'Missing room parameter' }, { status: 400 })
      }
      const result = await getRoomInfo(room, shard)
      return NextResponse.json(result)
    }

    if (action === 'market') {
      const mode = searchParams.get('mode') || 'index'
      const shard = searchParams.get('shard') || 'shard0'

      if (mode === 'index') {
        const data = await api.getMarketOrdersIndex(shard as Shard)
        if ((data as any).ok !== 1) {
          return NextResponse.json({ ok: 0, shard, list: [], error: '获取市场数据失败' })
        }
        const list = ((data as any).list || []).map((item: any) => ({
          _id: String(item._id),
          count: item.count || 0,
          avgPrice: item.avgPrice || 0,
          stddevPrice: item.stddevPrice || 0
        }))
        return NextResponse.json({ ok: 1, shard, list })
      }

      if (mode === 'orders') {
        const resourceType = searchParams.get('resource')
        if (!resourceType) {
          return NextResponse.json({ ok: 0, error: 'Missing resource parameter' }, { status: 400 })
        }
        // pixel 等全局资源不区分 shard
        const isGlobal = GLOBAL_MARKET_RESOURCES.includes(resourceType)
        const data = await api.getOrdersByResourceType(resourceType as any, isGlobal ? undefined : (shard as Shard))
        if ((data as any).ok !== 1) {
          return NextResponse.json({ ok: 0, resourceType, shard, orders: [], error: '获取订单失败' })
        }
        const orders = ((data as any).list || []).map((o: any) => ({
          _id: String(o._id),
          type: o.type === 'buy' ? 'buy' : 'sell',
          amount: o.amount || 0,
          remainingAmount: o.remainingAmount || 0,
          price: o.price || 0,
          roomName: o.roomName || ''
        }))
        return NextResponse.json({ ok: 1, resourceType, shard: isGlobal ? undefined : shard, orders })
      }

      return NextResponse.json({ ok: 0, error: 'Invalid market mode' }, { status: 400 })
    }

    if (action === 'pvp') {
      const interval = parseInt(searchParams.get('interval') || '100')
      if (isNaN(interval) || interval <= 0) {
        return NextResponse.json({ ok: 0, error: 'Invalid interval parameter' }, { status: 400 })
      }
      const result = await getPvPData(interval)
      return NextResponse.json(result)
    }

    return NextResponse.json({ ok: 0, error: 'Invalid action parameter' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ ok: 0, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
