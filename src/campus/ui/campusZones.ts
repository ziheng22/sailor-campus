export interface CampusZone {
  id: string
  name: string
  x: number
  z: number
  radius: number
  icon?: string
  color?: string
  subtitle?: string
}

export const campusZones: CampusZone[] = [
  // ══════════════════════════════════════════
  // 北区 — 宿舍 & 生活配套
  // ══════════════════════════════════════════

  // 1-17 号楼主体（南至教学区前路 z=-16、东至东侧路 x=50）
  {
    id: "dorm-main", name: "学生宿舍区",
    x: -25, z: -53, radius: 43,
    icon: "🏠", color: "#60a5fa",
    subtitle: "1 ~ 17 号楼",
  },
  // 西北 18-19 号楼 + 创业园 + 澡堂
  {
    id: "dorm-northwest", name: "西北宿舍区",
    x: -82, z: -78, radius: 28,
    icon: "🏘️", color: "#818cf8",
    subtitle: "18 · 19 号楼 · 创业园 · 澡堂",
  },
  // 菜鸟驿站
  {
    id: "cainiao", name: "菜鸟驿站",
    x: -80, z: -55, radius: 14,
    icon: "📦", color: "#f97316",
    subtitle: "快递收发点",
  },
  // 美食广场 + 商业街 + 桃源餐厅 + 驿站
  {
    id: "food-area", name: "美食广场",
    x: -75, z: -35, radius: 22,
    icon: "🍜", color: "#f97316",
    subtitle: "桃源餐厅 · 商业街 · 驿站",
  },

  // ══════════════════════════════════════════
  // 北区 — 教学轴
  // ══════════════════════════════════════════

  {
    id: "teaching-plaza", name: "S楼前广场",
    x: 44, z: -14, radius: 18,
    icon: "🏫", color: "#d4d4d8",
  },
  // 行政楼
  {
    id: "admin-building", name: "行政楼",
    x: 64, z: -67, radius: 20,
    icon: "🏛️", color: "#94a3b8",
  },
  // 东操场
  {
    id: "east-track", name: "东区操场",
    x: 75, z: -100, radius: 50,
    icon: "⚽", color: "#22c55e",
    subtitle: "400 米标准跑道",
  },
  // 主校门
  {
    id: "main-gate", name: "主校门",
    x: 110, z: -42, radius: 18,
    icon: "🚪", color: "#d4d4d8",
  },

  // ══════════════════════════════════════════
  // 中心 — 未名湖 & 广场
  // ══════════════════════════════════════════

  {
    id: "weiming-lake", name: "未名湖",
    x: 43, z: 6, radius: 24,
    icon: "🌊", color: "#38bdf8",
    subtitle: "校园中心湖",
  },
  {
    id: "qingren-lake", name: "情人湖",
    x: 123, z: 65, radius: 20,
    icon: "💙", color: "#7dd3fc",
    subtitle: "未名湖东侧",
  },
  // ══════════════════════════════════════════
  // 南区 — 连体建筑 & 文体
  // ══════════════════════════════════════════

  {
    id: "southeast-complex", name: "A-B-L楼",
    x: 22, z: 57, radius: 34,
    icon: "🏗️", color: "#d4d4d8",
    subtitle: "A 楼 · B 楼 · 办公楼",
  },
  {
    id: "library", name: "图书馆",
    x: 67, z: 42, radius: 32,
    icon: "📖", color: "#a78bfa",
    subtitle: "校园地标建筑",
  },
  {
    id: "culture-sports", name: "文体中心",
    x: -20, z: 42, radius: 32,
    icon: "🎭", color: "#ec4899",
    subtitle: "大礼堂 · 室内体育馆",
  },
  {
    id: "hospital", name: "校医院",
    x: 87, z: 68, radius: 18,
    icon: "🏥", color: "#ef4444",
  },
  {
    id: "west-track", name: "西区操场",
    x: -145, z: 95, radius: 50,
    icon: "🏃", color: "#22c55e",
    subtitle: "400 米标准跑道",
  },

  // ══════════════════════════════════════════
  // 南区 — 广场景观
  // ══════════════════════════════════════════

  {
    id: "south-gate", name: "南门广场",
    x: 42, z: 118, radius: 24,
    icon: "🚪", color: "#d4d4d8",
  },
  {
    id: "south-landmarks", name: "校园景观带",
    x: 80, z: 110, radius: 30,
    icon: "🏯", color: "#c084fc",
    subtitle: "九龙壁 · 白色景观亭 · 情人湖石拱桥",
  },
]
