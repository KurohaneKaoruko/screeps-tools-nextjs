# Screeps Tools

一个为 [Screeps](https://screeps.com) 游戏玩家打造的实用工具集合。

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwind-css)
![License](https://img.shields.io/badge/License-MIT-green)

## 在线访问

🔗 [screeps-tools-rosemary.vercel.app](https://screeps-tools-rosemary.vercel.app/)

## 功能

### 🤖 Creep 设计器

设计和计算 Creep 身体部件配置：

- 支持全部 8 种部件类型（tough、move、work、carry、attack、ranged_attack、heal、claim）
- 完整的化合物增强系统，显示增强效果倍率
- 实时计算孵化成本、HP、容量、攻击力等属性
- 按控制器等级显示可用能量
- 时间维度统计（每 Tick / 每小时 / 每天产出）
- 部件可视化预览
- Body Profile 导入/导出

### 📦 玩家资源查询

查询玩家在各个 Shard 的资源分布情况：

- 支持查询单个 Shard 或所有 Shard（自动发现新分片，含 shardX）
- 显示玩家基本信息（用户名、GCL 等级、Power 等级）
- 资源总览统计（房间数、可用能量、Storage 能量、Terminal 能量）
- 按分类展示详细资源：
  - 基础资源（energy、power、ops）
  - 基础矿物（H、O、L、K、Z、U、X、G）
  - 基础化合物（OH、ZK、UL 等）
  - 压缩资源（utrium_bar、lemergium_bar 等）
  - 高级资源（composite、crystal、liquid 等）
- 资源数量自动格式化显示（K/M 单位）

### ☢️ Nuke 打击情况

实时监控正在飞行的核弹：

- 显示所有 Shard（自动发现，含 shardX ⚡2x 快速分片）的 Nuke 总数和紧急 Nuke 数量
- 按 Shard 分组展示 Nuke 详情
- 显示目标房间、发射房间及其所有者
- 实时倒计时（tick 和真实时间）
- 紧急程度颜色标识（红/橙/黄/绿）
- 自动刷新（30秒间隔）
- 点击房间名可直接跳转到 Screeps 游戏界面

### ⚔️ PvP 战争情况

查询服务器上的 PvP 战斗情况：

- 自定义查询时间间隔（ticks）
- 显示活跃 Shard 数、战斗房间数、正在战斗数
- 显示各 Shard 的 Tick 速度
- 按 Shard 分组展示战斗房间列表
- 显示每个房间的最后战斗时间和距今 tick 数
- 点击房间名可直接跳转到 Screeps 游戏界面

### 📈 市场查询

查询 Screeps 市场资源的买卖订单与价格：

- 支持全部资源类型（矿物、化合物、压缩资源、商品、pixel 等全局资源）
- 最高买价 / 最低卖价 / 价差 / 买卖盘总量一目了然
- 买卖订单分表展示，按价格排序，显示剩余数量与所在房间
- 点击房间名可直接跳转到 Screeps 游戏界面
- 支持所有 Shard（含 shardX）与不区分 Shard 的全局资源

### 🏠 房间信息查询

查询任意房间的详细信息：

- 显示房间所有者（可跳转资料页）与控制等级 (RCL)
- 显示房间签名内容与签名时间
- 显示新手保护区 / 重生区结束日期
- 显示房间状态与当前 Game Time
- 支持所有 Shard（含 shardX）

### 🖥️ Screeps 控制台

在网页中直接执行 Screeps 控制台命令：

- 支持 Token 模式执行命令（Token 保存在浏览器 LocalStorage）
- 支持常用 Token / 常用命令保存与一键切换
- 支持 shardX 在内的全部官方 Shard 与自定义分片
- WebSocket 实时订阅 console 日志

### 🧠 Memory 查看器

查看 Screeps Memory（支持路径读取与高可读 JSON 展示）：

- 支持按 path 读取（例如：`creeps`、`flags`、`rooms.W1N1`）
- 以可折叠 JSON 树展示，支持复制字段
- Token 无效会返回明确错误提示，不会一直卡在“获取中”
- 为提升速度：后端仅代理请求，解压与 JSON 解析在前端完成

## 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript 5
- **样式**: Tailwind CSS 4
- **运行时**: React 19
- **Screeps API**: screeps-simple-api（部分工具）+ Next.js Route Handler 代理

## 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看。

## Token 获取与安全说明

- Screeps API Token 可在 Screeps 官网个人设置中生成（API Access / Token）
- 本项目在浏览器端保存 Token（LocalStorage），仅用于向本项目后端接口发起请求
- 后端会将请求代理到 `https://screeps.com/api/...`，避免跨域问题
- 建议只在可信设备上使用；如怀疑泄露，请在 Screeps 端撤销并重新生成 Token

## 构建部署

```bash
# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

## API 说明

项目通过 Next.js 路由代理 Screeps 官方 API，前端只请求本站 `/api/...`：

| Action | 描述 | 参数 |
|--------|------|------|
| `/api/screeps` | 综合代理（资源 / nukes / pvp 等） | `action` 等（见实现） |
| `/api/console` | 控制台代理（执行表达式、校验 Token） | `expression`, `shard` |
| `/api/memory` | Memory 读取代理（返回 JSON，可能为 `gz:` 字符串） | `path`（可选）, `shard`（可选） |

### Memory 读取建议

- Memory 体积很大时，建议填写 `Memory 路径` 只取子树，例如：
  - `creeps`
  - `flags`
  - `rooms.W1N1`
- 读取接口返回的 `data` 可能是 `gz:` 开头的压缩串，本项目会在前端解压并展示
  - 这样后端开销更小，响应更快

## 项目结构

```
├── app/
│   ├── api/
│   │   ├── screeps/       # Screeps API 代理
│   │   ├── console/       # Screeps 控制台代理
│   │   └── memory/        # Screeps Memory 代理
│   ├── tools/             # 工具页面
│   │   ├── creep-designer/
│   │   ├── console/
│   │   ├── memory/
│   │   ├── nuke-status/
│   │   ├── player-resources/
│   │   └── pvp-status/
│   ├── layout.tsx
│   └── page.tsx
├── components/            # 通用组件
├── lib/                   # 工具函数和配置
└── public/
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## License

[MIT](LICENSE)
