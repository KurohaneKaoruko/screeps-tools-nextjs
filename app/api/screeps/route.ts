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

interface ShardResources {
  shard: string
  rooms: RoomResources[]
  totalResources: Record<string, number>
}

interface PlayerResourcesResponse {
  ok: number
  player: PlayerData
  shards: ShardResources[]
  totalResources: Record<string, number>
  error?: string
}

// 简单的内存缓存
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 60 * 1000 // 1分钟缓存

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
  // 清理过期缓存
  if (cache.size > 100) {
    const now = Date.now()
    for (const [k, v] of cache.entries()) {
      if (now - v.timestamp > CACHE_TTL) cache.delete(k)
    }
  }
}

async function fetchScreepsApi(url: string, useCache = true): Promise<any> {
  // 检查缓存
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

// 并发控制：限制同时进行的请求数
async function parallelLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  const executing: Promise<void>[] = []
  
  for (const item of items) {
    const p = fn(item).then(result => {
      results.push(result)
    })
    executing.push(p)
    
    if (executing.length >= limit) {
      await Promise.race(executing)
      // 移除已完成的
      for (let i = executing.length - 1; i >= 0; i--) {
        const status = await Promise.race([executing[i], Promise.resolve('pending')])
        if (status !== 'pending') {
          executing.splice(i, 1)
        }
      }
    }
  }
  
  await Promise.all(executing)
  return results
}

// 获取房间对象并提取资源
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
  // 检查完整结果缓存
  const cacheKey = `player_resources_${username}_${targetShard}`
  const cached = getCached<PlayerResourcesResponse>(cacheKey)
  if (cached) return cached

  // 1. 获取玩家信息
  const userInfo = await fetchScreepsApi(`https://screeps.com/api/user/find?username=${encodeURIComponent(username)}`)
  if (userInfo.ok !== 1 || !userInfo.user) {
    return { ok: 0, player: {} as PlayerData, shards: [], totalResources: {}, error: '玩家不存在' }
  }
  const player = userInfo.user as PlayerData

  // 2. 获取玩家所有房间
  const userRooms = await fetchScreepsApi(`https://screeps.com/api/user/rooms?id=${encodeURIComponent(player._id)}`)
  
  const shardsData = userRooms.shards || {}
  if (Object.keys(shardsData).length === 0) {
    return { ok: 1, player, shards: [], totalResources: {}, error: '玩家没有房间' }
  }

  // 3. 收集需要查询的房间
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
    return { ok: 1, player, shards: [], totalResources: {} }
  }

  // 4. 并发获取所有房间的资源（限制并发数为10）
  const roomResourcesResults = await Promise.all(
    roomShardPairs.map(({ room, shard }) => 
      getRoomResources(room, shard).catch(() => ({ name: room, shard, storageEnergy: 0, terminalEnergy: 0, resources: {} }))
    )
  )

  // 5. 按 shard 分组并汇总
  const shardMap = new Map<string, ShardResources>()
  const totalResources: Record<string, number> = {}

  for (const roomRes of roomResourcesResults) {
    if (!shardMap.has(roomRes.shard)) {
      shardMap.set(roomRes.shard, { shard: roomRes.shard, rooms: [], totalResources: {} })
    }
    const shardData = shardMap.get(roomRes.shard)!
    shardData.rooms.push(roomRes)
    
    for (const [resourceType, amount] of Object.entries(roomRes.resources)) {
      shardData.totalResources[resourceType] = (shardData.totalResources[resourceType] || 0) + amount
      totalResources[resourceType] = (totalResources[resourceType] || 0) + amount
    }
  }

  const shards = Array.from(shardMap.values()).sort((a, b) => a.shard.localeCompare(b.shard))
  const result = { ok: 1, player, shards, totalResources }
  
  // 缓存结果
  setCache(cacheKey, result)
  
  return result
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const username = searchParams.get('username')
  const shard = searchParams.get('shard') || 'all'
  const action = searchParams.get('action')

  if (!username) {
    return NextResponse.json({ ok: 0, error: 'Missing username parameter' }, { status: 400 })
  }

  try {
    if (action === 'resources') {
      const result = await getPlayerResources(username, shard)
      return NextResponse.json(result)
    }

    const userInfo = await fetchScreepsApi(`https://screeps.com/api/user/find?username=${encodeURIComponent(username)}`)
    return NextResponse.json(userInfo)
  } catch (error) {
    return NextResponse.json({ ok: 0, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
