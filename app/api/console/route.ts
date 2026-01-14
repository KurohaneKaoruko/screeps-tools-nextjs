import { NextRequest, NextResponse } from 'next/server'
import { ScreepsServerApi } from '@/lib/screeps-api'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('X-Token')
    if (!token) {
      return NextResponse.json({ ok: 0, error: 'Missing API Token' }, { status: 401 })
    }

    const body = await request.json()
    const { expression, shard } = body

    if (!expression) {
      return NextResponse.json({ ok: 0, error: 'Missing expression' }, { status: 400 })
    }

    // 使用共享的 Server API 包装器
    const api = new ScreepsServerApi(token)
    const result = await api.executeConsoleCommand(expression, shard)

    return NextResponse.json(result)


  } catch (error) {
    console.error('Console Proxy Error:', error)
    return NextResponse.json(
      { ok: 0, error: error instanceof Error ? error.message : 'Internal Proxy Error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('X-Token')
    if (!token) {
      return NextResponse.json({ ok: 0, error: 'Missing API Token' }, { status: 401 })
    }

    const api = new ScreepsServerApi(token)
    const info = await api.getMe()
    
    if (!info.ok) {
        return NextResponse.json({ ok: 0, error: 'Failed to get user info' }, { status: 400 })
    }

    return NextResponse.json({ ok: 1, _id: info._id, username: info.username })
  } catch (error) {
    console.error('Console Proxy Error (GET):', error)
    return NextResponse.json(
      { ok: 0, error: error instanceof Error ? error.message : 'Internal Proxy Error' },
      { status: 500 }
    )
  }
}

