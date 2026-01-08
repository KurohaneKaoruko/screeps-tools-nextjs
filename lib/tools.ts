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
  }
]