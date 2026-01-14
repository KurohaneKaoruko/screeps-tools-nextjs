export interface Tool {
  id: string
  name: string
  description: string
  status: string
  statusColor: 'blue' | 'green' | 'gray'
  href: string
}

export const tools: Tool[] = [
  {
    id: 'creep-designer',
    name: 'Creep 设计器',
    description: '计算和设计 Screeps 游戏中的 Creep 身体部件，支持多种部件类型和增强效果。',
    status: '可用',
    statusColor: 'green',
    href: '/tools/creep-designer'
  },
  {
    id: 'player-resources',
    name: '查询资源',
    description: '通过玩家名查询 Screeps 玩家的资源数据，支持查询所有 shard 或单个 shard。',
    status: '可用',
    statusColor: 'green',
    href: '/tools/player-resources'
  },
  {
    id: 'nuke-status',
    name: 'Nuke 打击情况',
    description: '查询正在飞行的 Nuke，包括目标房间、发射房间和剩余爆炸时间等信息。',
    status: '可用',
    statusColor: 'green',
    href: '/tools/nuke-status'
  },
  {
    id: 'pvp-status',
    name: 'PvP 战争情况',
    description: '查询 Screeps 服务器上的 PvP 战争情况，包括最近发生战斗的房间和时间。',
    status: '可用',
    statusColor: 'green',
    href: '/tools/pvp-status'
  },
  {
    id: 'console',
    name: 'Screeps 控制台',
    description: '通过 API Token 连接 Screeps 控制台，直接在网页上执行代码。',
    status: '可用',
    statusColor: 'green',
    href: '/tools/console'
  }
]