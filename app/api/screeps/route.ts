import { NextRequest, NextResponse } from 'next/server'

interface PlayerData {
  _id: string
  username: string
  gcl: number
  power: number
  badge?: any
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

interface NukeData {
  id: string
  roomName: string
  launchRoomName: string
  landTime: number
  shard: string
  targetOwner?: string
  launchOwner?: string
}

interface NukesResponse {
  ok: number
  nukes: NukeData[]
  shardGameTimes: Record<string, number>
  shardTickSpeeds?: Record<string, number>
  error?: string
}

interface NukeApiData {
  _id?: string
  id?: string
  room: string
  launchRoomName: string
  landTime: number
}

interface NukesApiResponse {
  ok: number
  nukes: Record<string, NukeApiData[]>
}

interface PvPRoomData {
  _id: string
  lastPvpTime: number
}

interface PvPShardData {
  time: number
  rooms: PvPRoomData[]
}

interface PvPResponse {
  ok: number,
  pvp: {
    shard0?: PvPShardData
    shard1?: PvPShardData
    shard2?: PvPShardData
    shard3?: PvPShardData
  }
  shardTickSpeeds?: Record<string, number>
  error?: string
}

interface ShardInfo {
  name: string
  lastTicks: number[]
  cpuLimit: number
  rooms: number
  users: number
  tick: number
}

interface ShardsInfoResponse {
  ok: number
  shards: ShardInfo[]
}

// 简单的内存缓存
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 60 * 1000

// 房间所有者缓存
interface RoomOwnerCacheEntry {
  owner: string | null  // null 表示无主房间
  timestamp: number
}

const roomOwnerCache = new Map<string, RoomOwnerCacheEntry>()
const ROOM_OWNER_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

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
  return undefined // undefined means cache miss, null means unowned room
}

function setRoomOwnerCache(shard: string, room: string, owner: string | null): void {
  const key = getRoomOwnerCacheKey(shard, room)
  roomOwnerCache.set(key, { owner, timestamp: Date.now() })
}

// Map Stats API 响应类型
interface MapStatsResponse {
  ok: number
  stats: Record<string, {
    status: string
    own?: {
      user: string  // 用户 ID
      level: number
    }
  }>
  users: Record<string, {
    _id: string
    username: string
    badge?: any
  }>
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
    const requestBody = {
      rooms,
      statName: 'owner0',
      shard
    }
    console.log('map-stats request:', JSON.stringify(requestBody))
    
    const response = await fetch('https://screeps.com/api/game/map-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      cache: 'no-store'
    })

    if (!response.ok) {
      console.error(`map-stats API error: ${response.status}`, await response.text())
      // 返回所有房间为 null（未知）
      rooms.forEach(room => { result[room] = null })
      return result
    }

    const data = await response.json()
    
    console.log('map-stats raw response:', JSON.stringify(data))

    if (data.ok !== 1) {
      console.error('map-stats API returned ok !== 1:', data)
      rooms.forEach(room => { result[room] = null })
      return result
    }

    // 解析每个房间的所有者
    for (const room of rooms) {
      const roomStats = data.stats?.[room]
      console.log(`Room ${room} stats:`, JSON.stringify(roomStats))
      
      // 检查 own 字段 - 可能是 own.user 或直接是 own
      let userId: string | undefined
      if (roomStats?.own) {
        if (typeof roomStats.own === 'object' && roomStats.own.user) {
          userId = roomStats.own.user
        } else if (typeof roomStats.own === 'string') {
          userId = roomStats.own
        }
      }
      
      if (userId) {
        // 从 users map 中获取用户名
        const userInfo = data.users?.[userId]
        console.log(`Room ${room} owner userId: ${userId}, userInfo:`, JSON.stringify(userInfo))
        result[room] = userInfo?.username || null
      } else {
        // 无主房间
        result[room] = null
      }
    }

    return result
  } catch (error) {
    console.error('getRoomOwners error:', error)
    // 出错时返回所有房间为 null
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

  // 先检查缓存
  for (const { room, shard } of rooms) {
    const cacheKey = `${shard}_${room}`
    const cached = getRoomOwnerFromCache(shard, room)
    if (cached !== undefined) {
      // 缓存命中（包括 null 表示无主房间）
      result[cacheKey] = cached
    } else {
      // 缓存未命中
      cacheMisses.push({ room, shard })
    }
  }

  if (cacheMisses.length === 0) {
    return result
  }

  // 按 shard 分组未命中的房间
  const roomsByShard = new Map<string, string[]>()
  for (const { room, shard } of cacheMisses) {
    const shardRooms = roomsByShard.get(shard) || []
    shardRooms.push(room)
    roomsByShard.set(shard, shardRooms)
  }

  // 批量调用 API 并更新缓存
  const apiPromises = Array.from(roomsByShard.entries()).map(
    async ([shard, shardRooms]) => {
      try {
        const owners = await getRoomOwners(shardRooms, shard)
        // 更新缓存和结果
        for (const room of shardRooms) {
          const owner = owners[room] ?? null
          setRoomOwnerCache(shard, room, owner)
          result[`${shard}_${room}`] = owner
        }
      } catch (error) {
        console.error(`fetchRoomOwnersWithCache error for shard ${shard}:`, error)
        // 出错时设置为 null，但不缓存（下次重试）
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
  // 清理房间所有者缓存
  for (const [key, value] of roomOwnerCache.entries()) {
    if (now - value.timestamp > ROOM_OWNER_CACHE_TTL) {
      roomOwnerCache.delete(key)
    }
  }
}, 5 * 60 * 1000)

async function fetchScreepsApi(url: string, useCache = true): Promise<any> {
  if (useCache) {
    const cached = getCached(url)
    if (cached) return cached
  }

  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Screeps API error: ${response.status} - ${text || response.statusText}`)
  }
  const data = await response.json()
  
  if (useCache) {
    setCache(url, data)
  }
  return data
}

async function getRoomResources(room: string, shard: string): Promise<RoomResources> {
  const url = `https://screeps.com/api/game/room-objects?room=${encodeURIComponent(room)}&shard=${encodeURIComponent(shard)}`
  const data = await fetchScreepsApi(url)
  
  let storageEnergy = 0
  let terminalEnergy = 0
  const resources: Record<string, number> = {}

  if (data.objects) {
    for (const obj of data.objects) {
      if (obj.type === 'storage' || obj.type === 'terminal' || obj.type === 'factory') {
        for (const [resourceType, amount] of Object.entries(obj.store || {})) {
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

  return { name: room, shard, storageEnergy, terminalEnergy, resources }
}

// 获取玩家所有资源数据
async function getPlayerResources(username: string, targetShard: string = 'all'): Promise<PlayerResourcesResponse> {
  const cacheKey = `player_resources_${username}_${targetShard}`
  const cached = getCached<PlayerResourcesResponse>(cacheKey)
  if (cached) return cached

  try {
    const userInfo = await fetchScreepsApi(`https://screeps.com/api/user/find?username=${encodeURIComponent(username)}`)
    if (userInfo.ok !== 1 || !userInfo.user) {
      return { ok: 0, player: {} as PlayerData, rooms: [], error: '玩家不存在' }
    }
    const player = userInfo.user as PlayerData

    const userRooms = await fetchScreepsApi(`https://screeps.com/api/user/rooms?id=${encodeURIComponent(player._id)}`)
    
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
      player: {} as PlayerData, 
      rooms: [], 
      error: error instanceof Error ? error.message : '获取玩家资源失败' 
    }
  }
}

function processNukeData(
  nukesData: NukeApiData[],
  shard: string
): NukeData[] {
  return nukesData.map(nuke => ({
    id: nuke._id || nuke.id || '',
    roomName: nuke.room,
    launchRoomName: nuke.launchRoomName,
    landTime: nuke.landTime,
    shard
  }))
}

async function getNukes(shards: string[]): Promise<NukesResponse> {
  const allNukes: NukeData[] = []
  const shardGameTimes: Record<string, number> = {}
  
  try {
    const nukesData = await fetchScreepsApi('https://screeps.com/api/experimental/nukes') as NukesApiResponse
    
    if (nukesData?.ok === 1 && nukesData.nukes) {
      const shardResults = await Promise.all(
        shards.map(async shard => {
          const shardNukes = nukesData.nukes[shard]
          if (!Array.isArray(shardNukes) || shardNukes.length === 0) return []
          
          const gameTimeData = await fetchScreepsApi(`https://screeps.com/api/game/time?shard=${shard}`)
          shardGameTimes[shard] = gameTimeData.time || Math.floor(Date.now() / 1000)
          
          return processNukeData(shardNukes, shard)
        })
      )
      
      allNukes.push(...shardResults.flat())
    }
    
    // 获取所有目标房间和发射房间的所有者信息
    if (allNukes.length > 0) {
      const roomsToQuery: { room: string; shard: string }[] = []
      
      // 收集所有需要查询的房间（目标房间和发射房间）
      for (const nuke of allNukes) {
        roomsToQuery.push({ room: nuke.roomName, shard: nuke.shard })
        roomsToQuery.push({ room: nuke.launchRoomName, shard: nuke.shard })
      }
      
      // 去重
      const uniqueRooms = Array.from(
        new Map(roomsToQuery.map(r => [`${r.shard}_${r.room}`, r])).values()
      )
      
      const ownerData = await fetchRoomOwnersWithCache(uniqueRooms)
      
      // 将所有者信息合并到核弹数据中
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
    console.error('获取 nuke 数据失败:', error)
    return { ok: 1, nukes: allNukes, shardGameTimes }
  }
}

async function getShardsInfo(): Promise<ShardsInfoResponse> {
  try {
    const url = 'https://screeps.com/api/game/shards/info'
    const data = await fetchScreepsApi(url) as ShardsInfoResponse
    return data
  } catch (error) {
    console.error('获取 shard 信息失败:', error)
    return { 
      ok: 0, 
      shards: [] 
    }
  }
}

async function getPvPData(interval: number): Promise<PvPResponse> {
  try {
    const url = `https://screeps.com/api/experimental/pvp?interval=${interval}`
    const data = await fetchScreepsApi(url) as PvPResponse
    
    const shardsInfo = await getShardsInfo()
    if (shardsInfo.ok === 1 && shardsInfo.shards) {
      const shardTickSpeeds: Record<string, number> = {}
      shardsInfo.shards.forEach(shard => {
        shardTickSpeeds[shard.name] = shard.tick
      })
      data.shardTickSpeeds = shardTickSpeeds
    }
    
    return data
  } catch (error) {
    console.error('获取 PvP 数据失败:', error)
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
      const result = await getNukes(['shard0', 'shard1', 'shard2', 'shard3'])
      return NextResponse.json(result)
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
