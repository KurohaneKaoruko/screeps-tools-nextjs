export type BodyPartType = 'tough' | 'move' | 'work' | 'carry' | 'attack' | 'ranged_attack' | 'heal' | 'claim'

export type BoostType = 
  // Attack boosts
  | 'UH' | 'UH2O' | 'XUH2O'
  // Harvest boosts  
  | 'UO' | 'UHO2' | 'XUHO2'
  // Carry boosts
  | 'KH' | 'KH2O' | 'XKH2O'
  // Ranged attack boosts
  | 'KO' | 'KHO2' | 'XKHO2'
  // Build/repair boosts
  | 'LH' | 'LH2O' | 'XLH2O'
  // Heal boosts
  | 'LO' | 'LHO2' | 'XLHO2'
  // Dismantle boosts
  | 'ZH' | 'ZH2O' | 'XZH2O'
  // Move boosts
  | 'ZO' | 'ZHO2' | 'XZHO2'
  // Upgrade controller boosts
  | 'GH' | 'GH2O' | 'XGH2O'
  // Tough boosts
  | 'GO' | 'GHO2' | 'XGHO2'

export interface BodyPart {
  type: BodyPartType
  count: number
  boost?: BoostType
}

export interface CreepStats {
  totalCost: number
  totalParts: number
  hp: number
  effectiveHp: number
  damageReduction: number
  capacity: number
  attack: number
  rangedAttack: number
  heal: number
  rangedHeal: number
  work: number
  claim: number
  fatigue: number
  harvest: number
  repair: number
  dismantle: number
  build: number
  upgradeController: number
}

export interface TimeStats {
  perTick: CreepStats
  perUnit: CreepStats
  perHour: CreepStats
  perDay: CreepStats
}

export const BODY_PART_COSTS: Record<BodyPartType, number> = {
  tough: 10,
  move: 50,
  work: 100,
  carry: 50,
  attack: 80,
  ranged_attack: 150,
  heal: 250,
  claim: 600
}

export const BODY_PART_HP: Record<BodyPartType, number> = {
  tough: 100,
  move: 100,
  work: 100,
  carry: 100,
  attack: 100,
  ranged_attack: 100,
  heal: 100,
  claim: 100
}

export interface BoostEffect {
  harvest?: number
  repair?: number
  dismantle?: number
  build?: number
  upgradeController?: number
  attack?: number
  rangedAttack?: number
  rangedMassAttack?: number
  heal?: number
  rangedHeal?: number
  capacity?: number
  fatigue?: number
  damage?: number
}

export const BOOSTS: Record<BodyPartType, Partial<Record<BoostType, BoostEffect>>> = {
  work: {
    // 一级: UO +200% harvest = 3倍
    UO: { harvest: 3 },
    // 二级: UHO2 +400% harvest = 5倍
    UHO2: { harvest: 5 },
    // 三级: XUHO2 +600% harvest = 7倍
    XUHO2: { harvest: 7 },
    // 一级: LH +50% build/repair = 1.5倍
    LH: { build: 1.5, repair: 1.5 },
    // 二级: LH2O +80% build/repair = 1.8倍
    LH2O: { build: 1.8, repair: 1.8 },
    // 三级: XLH2O +100% build/repair = 2倍
    XLH2O: { build: 2, repair: 2 },
    // 一级: ZH +100% dismantle = 2倍
    ZH: { dismantle: 2 },
    // 二级: ZH2O +200% dismantle = 3倍
    ZH2O: { dismantle: 3 },
    // 三级: XZH2O +300% dismantle = 4倍
    XZH2O: { dismantle: 4 },
    // 一级: GH +50% upgradeController = 1.5倍
    GH: { upgradeController: 1.5 },
    // 二级: GH2O +80% upgradeController = 1.8倍
    GH2O: { upgradeController: 1.8 },
    // 三级: XGH2O +100% upgradeController = 2倍
    XGH2O: { upgradeController: 2 }
  },
  attack: {
    // 一级: UH +100% attack = 2倍
    UH: { attack: 2 },
    // 二级: UH2O +200% attack = 3倍
    UH2O: { attack: 3 },
    // 三级: XUH2O +300% attack = 4倍
    XUH2O: { attack: 4 }
  },
  ranged_attack: {
    // 一级: KO +100% rangedAttack = 2倍
    KO: { rangedAttack: 2, rangedMassAttack: 2 },
    // 二级: KHO2 +200% rangedAttack = 3倍
    KHO2: { rangedAttack: 3, rangedMassAttack: 3 },
    // 三级: XKHO2 +300% rangedAttack = 4倍
    XKHO2: { rangedAttack: 4, rangedMassAttack: 4 }
  },
  heal: {
    // 一级: LO +100% heal = 2倍
    LO: { heal: 2, rangedHeal: 2 },
    // 二级: LHO2 +200% heal = 3倍
    LHO2: { heal: 3, rangedHeal: 3 },
    // 三级: XLHO2 +300% heal = 4倍
    XLHO2: { heal: 4, rangedHeal: 4 }
  },
  carry: {
    // 一级: KH +50 capacity = 2倍 (50 -> 100)
    KH: { capacity: 2 },
    // 二级: KH2O +100 capacity = 3倍 (50 -> 150)
    KH2O: { capacity: 3 },
    // 三级: XKH2O +150 capacity = 4倍 (50 -> 200)
    XKH2O: { capacity: 4 }
  },
  move: {
    // 一级: ZO +100% fatigue减少 = 2倍
    ZO: { fatigue: 2 },
    // 二级: ZHO2 +200% fatigue减少 = 3倍
    ZHO2: { fatigue: 3 },
    // 三级: XZHO2 +300% fatigue减少 = 4倍
    XZHO2: { fatigue: 4 }
  },
  tough: {
    // 一级: GO 30%伤害减免 = 受到70%伤害
    GO: { damage: 0.7 },
    // 二级: GHO2 50%伤害减免 = 受到50%伤害
    GHO2: { damage: 0.5 },
    // 三级: XGHO2 70%伤害减免 = 受到30%伤害
    XGHO2: { damage: 0.3 }
  },
  claim: {}
}

export const BOOSTS_FOR_PART: Record<BodyPartType, BoostType[]> = {
  tough: ['GO', 'GHO2', 'XGHO2'],
  move: ['ZO', 'ZHO2', 'XZHO2'],
  work: ['UO', 'UHO2', 'XUHO2', 'LH', 'LH2O', 'XLH2O', 'ZH', 'ZH2O', 'XZH2O', 'GH', 'GH2O', 'XGH2O'],
  carry: ['KH', 'KH2O', 'XKH2O'],
  attack: ['UH', 'UH2O', 'XUH2O'],
  ranged_attack: ['KO', 'KHO2', 'XKHO2'],
  heal: ['LO', 'LHO2', 'XLHO2'],
  claim: []
}

export const BOOST_DESCRIPTIONS: Record<BoostType, string> = {
  // Attack
  UH: '攻击×2',
  UH2O: '攻击×3',
  XUH2O: '攻击×4',
  // Harvest
  UO: '采集×3',
  UHO2: '采集×5',
  XUHO2: '采集×7',
  // Carry
  KH: '容量×2',
  KH2O: '容量×3',
  XKH2O: '容量×4',
  // Ranged attack
  KO: '远攻×2',
  KHO2: '远攻×3',
  XKHO2: '远攻×4',
  // Build/repair
  LH: '建造×1.5',
  LH2O: '建造×1.8',
  XLH2O: '建造×2',
  // Heal
  LO: '治疗×2',
  LHO2: '治疗×3',
  XLHO2: '治疗×4',
  // Dismantle
  ZH: '拆解×2',
  ZH2O: '拆解×3',
  XZH2O: '拆解×4',
  // Move
  ZO: '移动×2',
  ZHO2: '移动×3',
  XZHO2: '移动×4',
  // Upgrade
  GH: '升级×1.5',
  GH2O: '升级×1.8',
  XGH2O: '升级×2',
  // Tough
  GO: '减伤30%',
  GHO2: '减伤50%',
  XGHO2: '减伤70%'
}

export const CONTROLLER_LEVELS: Record<number, number> = {
  1: 300,
  2: 550,
  3: 800,
  4: 1300,
  5: 1800,
  6: 2300,
  7: 5600,
  8: 12900
}

export function calculateCreepStats(parts: BodyPart[], tickDuration: number = 1): CreepStats {
  let totalCost = 0
  let totalParts = 0
  let hp = 0
  let capacity = 0
  let attack = 0
  let rangedAttack = 0
  let heal = 0
  let rangedHeal = 0
  let work = 0
  let claim = 0
  let fatigue = 0
  let harvest = 0
  let repair = 0
  let dismantle = 0
  let build = 0
  let upgradeController = 0
  let toughHp = 0
  let damageReduction = 1

  parts.forEach(part => {
    const cost = BODY_PART_COSTS[part.type]
    const count = part.count
    const boostEffect = part.boost ? (BOOSTS[part.type]?.[part.boost] || {}) : {}

    totalCost += cost * count
    totalParts += count
    hp += BODY_PART_HP[part.type] * count

    switch (part.type) {
      case 'carry':
        capacity += 50 * count * (boostEffect.capacity || 1)
        break
      case 'attack':
        attack += 30 * count * (boostEffect.attack || 1)
        break
      case 'ranged_attack':
        rangedAttack += 10 * count * (boostEffect.rangedAttack || 1)
        break
      case 'heal':
        heal += 12 * count * (boostEffect.heal || 1)
        rangedHeal += 4 * count * (boostEffect.rangedHeal || 1)
        break
      case 'work':
        work += count
        harvest += 2 * count * (boostEffect.harvest || 1)
        repair += 100 * count * (boostEffect.repair || 1)
        dismantle += 50 * count * (boostEffect.dismantle || 1)
        build += 5 * count * (boostEffect.build || 1)
        upgradeController += 1 * count * (boostEffect.upgradeController || 1)
        break
      case 'claim':
        claim += count
        break
      case 'move':
        fatigue += 2 * count * (boostEffect.fatigue || 1)
        break
      case 'tough':
        toughHp += 100 * count
        if (boostEffect.damage) {
          damageReduction = boostEffect.damage
        }
        break
    }
  })

  // 计算有效HP：tough部件的HP除以伤害系数 + 其他部件HP
  const otherHp = hp - toughHp
  const effectiveHp = toughHp > 0 ? Math.floor(toughHp / damageReduction) + otherHp : hp

  return {
    totalCost,
    totalParts,
    hp,
    effectiveHp,
    damageReduction,
    capacity,
    attack,
    rangedAttack,
    heal,
    rangedHeal,
    work,
    claim,
    fatigue,
    harvest,
    repair,
    dismantle,
    build,
    upgradeController
  }
}

export function calculateTimeStats(baseStats: CreepStats, tickDuration: number): TimeStats {
  const ticksPerHour = 3600 / tickDuration
  const ticksPerDay = 86400 / tickDuration

  const multiplyStats = (stats: CreepStats, multiplier: number): CreepStats => ({
    totalCost: stats.totalCost * multiplier,
    totalParts: stats.totalParts * multiplier,
    hp: stats.hp * multiplier,
    effectiveHp: stats.effectiveHp * multiplier,
    damageReduction: stats.damageReduction,
    capacity: stats.capacity * multiplier,
    attack: stats.attack * multiplier,
    rangedAttack: stats.rangedAttack * multiplier,
    heal: stats.heal * multiplier,
    rangedHeal: stats.rangedHeal * multiplier,
    work: stats.work * multiplier,
    claim: stats.claim * multiplier,
    fatigue: stats.fatigue * multiplier,
    harvest: stats.harvest * multiplier,
    repair: stats.repair * multiplier,
    dismantle: stats.dismantle * multiplier,
    build: stats.build * multiplier,
    upgradeController: stats.upgradeController * multiplier
  })

  // 每 work 部件的产出（用于比较效率）
  const workCount = baseStats.work || 1
  const perWorkStats: CreepStats = {
    ...baseStats,
    harvest: baseStats.harvest / workCount,
    repair: baseStats.repair / workCount,
    dismantle: baseStats.dismantle / workCount,
    build: baseStats.build / workCount,
    upgradeController: baseStats.upgradeController / workCount
  }

  return {
    perTick: baseStats,
    perUnit: perWorkStats,
    perHour: multiplyStats(baseStats, ticksPerHour),
    perDay: multiplyStats(baseStats, ticksPerDay)
  }
}

export function getRemainingEnergy(totalCost: number, controllerLevel: number): number {
  const maxEnergy = CONTROLLER_LEVELS[controllerLevel] || 300
  return maxEnergy - totalCost
}

export function generateBodyProfile(parts: BodyPart[]): string {
  const profile: Record<string, number> = {}
  parts.forEach(part => {
    if (part.count > 0) {
      profile[part.type] = (profile[part.type] || 0) + part.count
    }
  })
  return JSON.stringify(profile)
}

export function parseBodyProfile(profile: string): BodyPart[] {
  try {
    const parsed = JSON.parse(profile)
    return Object.entries(parsed).map(([type, count]) => ({
      type: type as BodyPartType,
      count: count as number,
      boost: '' as BoostType
    }))
  } catch {
    return []
  }
}
