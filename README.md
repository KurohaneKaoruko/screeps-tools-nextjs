# Screeps Tools

一个为 [Screeps](https://screeps.com) 游戏玩家打造的实用工具集合。

## 功能

### Creep 设计器

设计和计算 Creep 身体部件配置：

- 支持全部 8 种部件类型（tough、move、work、carry、attack、ranged_attack、heal、claim）
- 完整的化合物增强系统，显示增强效果倍率
- 实时计算孵化成本、HP、容量、攻击力等属性
- 按控制器等级显示可用能量
- 时间维度统计（每 Tick / 每小时 / 每天产出）
- 部件可视化预览
- Body Profile 导入/导出

### 玩家资源查询

查询玩家在各个 Shard 的资源分布情况：

- 支持查询单个 Shard 或所有 Shard
- 显示玩家基本信息（用户名、GCL 等级、Power 等级）
- 资源总览统计（房间数、可用能量、Storage 能量、Terminal 能量）
- 按分类展示详细资源：
  - 基础资源（energy、power、ops）
  - 基础矿物（H、O、L、K、Z、U、X、G）
  - 基础化合物（OH、ZK、UL 等）
  - 压缩资源（utrium_bar、lemergium_bar 等）
  - 高级资源（composite、crystal、liquid 等）
- 资源数量自动格式化显示（K/M 单位）
- 汇总显示 Energy 和 Power 总量

## 技术栈

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS

## 开发

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看。

## 构建

```bash
npm run build
npm start
```

## License

MIT
