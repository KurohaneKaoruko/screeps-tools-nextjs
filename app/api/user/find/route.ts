
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const username = searchParams.get('username')

    if (!username) {
      return NextResponse.json({ ok: 0, error: 'Missing username' }, { status: 400 })
    }

    // 尝试直接调用官方 API
    // 官方 API: http://screeps.com/api/user/find?username=...
    // 注意：screeps.com 的 /api/user/find 需要 POST 还是 GET？
    // 文档不明确，通常 find 是 GET。但如果官方返回的数据结构不同，我们需要适配。
    // 另一种方法是使用 /api/user/find?username=xxx
    
    const res = await fetch(`https://screeps.com/api/user/find?username=${encodeURIComponent(username)}`)
    
    if (!res.ok) {
         // 尝试另一种 API: /api/user/id?username=... (如果存在)
         // 或者直接搜索用户列表 /api/user/find?username=...
        return NextResponse.json({ ok: 0, error: `Screeps API Error: ${res.status}` }, { status: res.status })
    }

    const data = await res.json()
    
    // 官方 API 返回格式可能如下：
    // { ok: 1, user: { _id: "...", ... } }
    // 或者直接返回用户对象？
    // 让我们检查一下返回结构，并适配它
    
    if (data.ok && data.user && data.user._id) {
         return NextResponse.json({ ok: 1, _id: data.user._id, username: data.user.username })
    }
    
    // 如果直接返回了 _id
    if (data._id) {
        return NextResponse.json({ ok: 1, _id: data._id, username: data.username })
    }
    
    // 如果没有找到
    return NextResponse.json(data)

  } catch (error) {
    console.error('User Find Proxy Error:', error)
    return NextResponse.json(
      { ok: 0, error: error instanceof Error ? error.message : 'Internal Proxy Error' },
      { status: 500 }
    )
  }
}
