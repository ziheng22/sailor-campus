// Coordinate system:
// Origin = 未名湖 center (0, 0, 0)
// X+: East,  X-: West
// Z+: South, Z-: North
// Y+: Up

export interface BuildingData {
  id: string
  name: string
  x: number
  z: number
  width: number
  depth: number
  height: number
  floors: number
  roofColor: string
  wallColor: string
  info: string
  enterable?: boolean
  interiorId?: string
  tags?: string[]
}

export interface RoadData {
  x1: number; z1: number; x2: number; z2: number
  width: number
  type: "main" | "branch" | "external"
}

export interface LakeData {
  id: string; name: string
  centerX: number; centerZ: number
  shape: "crescent" | "irregular"
  width: number; depth: number
}

export interface PlazaData {
  id: string; name: string
  x: number; z: number
  width: number; depth: number
  tileColor: string
}

export interface TrackFieldData {
  id: string; name: string
  centerX: number; centerZ: number
}

export interface SportAreaData {
  id: string; name: string
  centerX: number; centerZ: number
  type: "basketball" | "tennis" | "volleyball"
  width: number; depth: number
  count: number
  layout: "row" | "grid"
}

export interface LandmarkData {
  id: string; name: string
  x: number; z: number
  type: "sculpture" | "bridge" | "arch" | "pavilion"
  description: string
}

// ==================== COLOR PALETTE ====================
const ORANGE_ROOF = "#c74c3c"
const DARK_GREY_ROOF = "#5a5a5a"
const DARK_BROWN_ROOF = "#6b4c3b"
const WHITE_WALL = "#f5f0e8"
const CREAM_WALL = "#faf3e6"
const GREY_WALL = "#d5d0c8"
const RED = "#c0392b"

// ==================== BUILDINGS ====================

export const buildings: BuildingData[] = [
  // ==========================================
  // 教学中轴线 — W、S、E 连体教学楼 (未名湖正北)
  // ==========================================
  {
    id: "w-building",
    name: "W教学楼",
    x: 24, z: -25,
    width: 42, depth: 22, height: 15, floors: 5,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "教学主楼，坐落于未名湖正北中轴线西侧，与S楼、E楼一字排开形成教学中轴",
    enterable: true, interiorId: "w-building",
    tags: ["教学", "中轴线"],
  },
  {
    id: "s-building",
    name: "S实验楼",
    x: 45, z: -24,
    width: 36, depth: 22, height: 15, floors: 5,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "实验楼/计算机室，教学中轴中部，二楼设学术报告厅，楼梯正对未名湖小桥",
    tags: ["教学", "中轴线"],
  },
  {
    id: "e-building",
    name: "E教学楼",
    x: 66, z: -25,
    width: 36, depth: 22, height: 15, floors: 5,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "教学楼东段，关于S楼与W楼轴对称，与W/S楼连通形成教学中轴线建筑群",
    tags: ["教学", "中轴线"],
  },

  // ==========================================
  // 文体区 — 大礼堂 + 室内体育馆（西区，未名湖南侧）
  // 大礼堂在体育馆正西，中间隔窄过道，顶部大棚相连
  // ==========================================
  {
    id: "auditorium",
    name: "大礼堂",
    x: -75, z: 18,
    width: 32, depth: 38, height: 12, floors: 2,
    roofColor: DARK_BROWN_ROOF, wallColor: "#c4956a",
    info: "校园大礼堂，文体活动核心场地，坐西朝东，与体育馆顶部大棚相连，中间隔一条窄过道",
    enterable: true, interiorId: "auditorium",
    tags: ["文体"],
  },
  {
    id: "gymnasium",
    name: "室内体育馆",
    x: -42, z: 18,
    width: 32, depth: 38, height: 12, floors: 2,
    roofColor: DARK_BROWN_ROOF, wallColor: "#e8e8e8",
    info: "室内体育馆，钢结构桁架屋顶，可进行篮球/羽毛球活动，设红蓝阶梯看台，西邻大礼堂、顶部大棚相连",
    enterable: true, interiorId: "gymnasium",
    tags: ["文体"],
  },

  // ==========================================
  // 西南400米标准塑胶操场
  // ==========================================
  {
    id: "west-track-field",
    name: "西南400米操场",
    x: -145, z: 95,
    width: 78, depth: 115, height: 0.5, floors: 0,
    roofColor: "#000000", wallColor: "#000000",
    info: "西区400米标准塑胶跑道操场，含足球场绿茵、西侧主席台看台",
    tags: ["运动"],
  },

  // ==========================================
  // 东北400米标准塑胶操场
  // ==========================================
  {
    id: "east-track-field",
    name: "东北400米操场",
    x: 75, z: -95,
    width: 78, depth: 115, height: 0.5, floors: 0,
    roofColor: "#000000", wallColor: "#000000",
    info: "东区400米标准塑胶跑道操场，含足球场绿茵、西侧主席台看台",
    tags: ["运动"],
  },

  // ==========================================
  // 宿舍区 — 1-17号楼（校园北侧中部，大规模宿舍集群）
  // 坐标来源：GLB 3D 模型碰撞体实际位置
  // ==========================================
  {
    id: "dorm-01", name: "1号楼",
    x: -36.53, z: -11.55,
    width: 20, depth: 10, height: 12, floors: 6,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "学生宿舍1号楼，6层板式楼，橙顶白墙",
    tags: ["宿舍"],
  },
  {
    id: "dorm-02", name: "2号楼",
    x: -36.02, z: -26.25,
    width: 20, depth: 10, height: 12, floors: 6,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "学生宿舍2号楼，6层板式楼，橙顶白墙",
    tags: ["宿舍"],
  },
  {
    id: "dorm-03", name: "3号楼",
    x: -36.23, z: -40.30,
    width: 20, depth: 10, height: 12, floors: 6,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "学生宿舍3号楼，6层板式楼，橙顶白墙",
    tags: ["宿舍"],
  },
  {
    id: "dorm-04", name: "4号楼",
    x: -35.32, z: -65.34,
    width: 20, depth: 10, height: 12, floors: 6,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "学生宿舍4号楼，6层板式楼，橙顶白墙",
    tags: ["宿舍"],
  },
  {
    id: "dorm-05", name: "5号楼",
    x: -35.02, z: -84.24,
    width: 20, depth: 10, height: 12, floors: 6,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "学生宿舍5号楼，6层板式楼，橙顶白墙",
    tags: ["宿舍"],
  },
  {
    id: "dorm-06", name: "6号楼",
    x: -16.66, z: -10.04,
    width: 20, depth: 10, height: 12, floors: 6,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "学生宿舍6号楼，6层板式楼，橙顶白墙",
    tags: ["宿舍"],
  },
  {
    id: "dorm-07", name: "7号楼",
    x: -15.91, z: -25.12,
    width: 20, depth: 10, height: 12, floors: 6,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "学生宿舍7号楼，6层板式楼，橙顶白墙",
    tags: ["宿舍"],
  },
  {
    id: "dorm-08", name: "8号楼",
    x: -16.16, z: -39.12,
    width: 20, depth: 10, height: 12, floors: 6,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "学生宿舍8号楼，6层板式楼，橙顶白墙",
    tags: ["宿舍"],
  },
  {
    id: "dorm-09", name: "9号楼",
    x: -15.66, z: -66.17,
    width: 20, depth: 10, height: 12, floors: 6,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "学生宿舍9号楼，6层板式楼，橙顶白墙",
    tags: ["宿舍"],
  },
  {
    id: "dorm-10", name: "10号楼",
    x: -16.08, z: -83.27,
    width: 20, depth: 10, height: 12, floors: 6,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "学生宿舍10号楼，6层板式楼，橙顶白墙",
    tags: ["宿舍"],
  },
  {
    id: "dorm-11", name: "11号楼",
    x: 1.43, z: -19.74,
    width: 20, depth: 10, height: 12, floors: 6,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "学生宿舍11号楼，6层板式楼，橙顶白墙",
    tags: ["宿舍"],
  },
  {
    id: "dorm-12", name: "12号楼",
    x: 0.75, z: -34.31,
    width: 20, depth: 10, height: 12, floors: 6,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "学生宿舍12号楼，6层板式楼，橙顶白墙",
    tags: ["宿舍"],
  },
  {
    id: "dorm-13", name: "13号楼",
    x: 1.52, z: -51.37,
    width: 20, depth: 10, height: 12, floors: 6,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "学生宿舍13号楼，6层板式楼，橙顶白墙",
    tags: ["宿舍"],
  },
  {
    id: "dorm-14", name: "14号楼",
    x: 1.19, z: -65.50,
    width: 20, depth: 10, height: 12, floors: 6,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "学生宿舍14号楼，6层板式楼，橙顶白墙",
    tags: ["宿舍"],
  },
  {
    id: "dorm-15", name: "15号楼",
    x: 1.10, z: -82.06,
    width: 20, depth: 10, height: 12, floors: 6,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "学生宿舍15号楼，6层板式楼，橙顶白墙",
    tags: ["宿舍"],
  },
  {
    id: "dorm-16", name: "16号楼",
    x: -53.70, z: -65.40,
    width: 20, depth: 10, height: 12, floors: 6,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "学生宿舍16号楼，6层板式楼，橙顶白墙",
    tags: ["宿舍"],
  },
  {
    id: "dorm-17", name: "17号楼",
    x: -53.56, z: -83.54,
    width: 20, depth: 10, height: 12, floors: 6,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "学生宿舍17号楼，6层板式楼，橙顶白墙",
    tags: ["宿舍"],
  },

  // ==========================================
  // 创业园（宿舍区西部，16号楼与18号楼之间）
  // ==========================================
  {
    id: "startup-park",
    name: "创业园",
    x: -80.51, z: -85.81,
    width: 38, depth: 28, height: 6, floors: 2,
    roofColor: DARK_GREY_ROOF, wallColor: WHITE_WALL,
    info: "大学生创业孵化园",
    tags: ["配套"],
  },

  // ==========================================
  // 18-19号宿舍楼（西北区域）
  // ==========================================
  {
    id: "dorm-18",
    name: "18号楼",
    x: -100.26, z: -85.32,
    width: 18, depth: 10, height: 12, floors: 6,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "学生宿舍18号楼，6层板式楼",
    tags: ["宿舍"],
  },
  {
    id: "dorm-19",
    name: "19号楼",
    x: -118, z: -46,
    width: 18, depth: 10, height: 12, floors: 6,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "学生宿舍19号楼，旁设超市",
    tags: ["宿舍"],
  },

  // ==========================================
  // 西北生活配套区
  // ==========================================
  {
    id: "food-plaza",
    name: "美食广场",
    x: -51.08, z: -34.73,
    width: 48, depth: 48, height: 2, floors: 1,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "美食广场，校园主要餐饮聚集地",
    tags: ["生活"],
  },
  {
    id: "logistics",
    name: "后勤小楼",
    x: -81.69, z: -37.40,
    width: 18, depth: 28, height: 8, floors: 2,
    roofColor: DARK_GREY_ROOF, wallColor: WHITE_WALL,
    info: "后勤服务楼，位于美食广场西侧，楼后为校内小路与校园围墙",
    tags: ["后勤"],
  },
  {
    id: "canteen-taoyuan",
    name: "桃源餐厅食堂",
    x: -63.94, z: -50.65,
    width: 38, depth: 28, height: 10, floors: 2,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "桃源餐厅，校园主要食堂",
    tags: ["食堂", "生活"],
  },

  // ==========================================
  // 东南连体建筑群 — A楼·B楼·办公楼（一体连通，合围相连）
  // 北侧B楼 + 居中A楼 + 南侧L型转角办公楼
  // ==========================================
  {
    id: "b-building",
    name: "B楼（连体北段）",
    x: 45, z: 42,
    width: 55, depth: 15, height: 15, floors: 5,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "东南连体建筑群北段，B楼，与A楼、办公楼内部互通、外观无缝衔接",
    tags: ["教学", "连体建筑"],
  },
  {
    id: "a-building",
    name: "A楼（连体中段）",
    x: 45, z: 60,
    width: 55, depth: 15, height: 15, floors: 5,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "东南连体建筑群居中主体段，A楼，南北连接B楼与办公楼，地处校园南部主干道内侧",
    tags: ["教学", "连体建筑"],
  },
  {
    id: "office-building",
    name: "办公楼（连体南段·L型转角）",
    x: 45, z: 80,
    width: 55, depth: 15, height: 12, floors: 4,
    roofColor: DARK_GREY_ROOF, wallColor: WHITE_WALL,
    info: "东南连体建筑群南段，L型转角办公楼，南侧靠校园边界，墙外为校外汉庭酒店与临街商铺",
    tags: ["办公", "连体建筑"],
  },

  // ==========================================
  // 图书馆（校园南部，单体体量最大建筑）
  // ==========================================
  {
    id: "library",
    name: "图书馆",
    x: 65, z: 95,
    width: 48, depth: 38, height: 18, floors: 6,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "校园地标建筑，弧形红顶造型，校园单体体量最大建筑，西南紧邻A-B-办公楼群",
    enterable: true, interiorId: "library",
    tags: ["教学"],
  },

  // ==========================================
  // 行政楼（东区，e楼南侧）
  // ==========================================
  {
    id: "admin-building",
    name: "行政楼",
    x: 64.26, z: -66.59,
    width: 28, depth: 22, height: 12, floors: 4,
    roofColor: DARK_GREY_ROOF, wallColor: WHITE_WALL,
    info: "校园行政楼",
    tags: ["办公"],
  },

  // ==========================================
  // 校医院（校园最北侧独立建筑）
  // ==========================================
  {
    id: "hospital",
    name: "校医院",
    x: 95, z: -115,
    width: 24, depth: 18, height: 8, floors: 2,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "校园医院，位于校园最北侧，独立低层建筑",
    tags: ["配套"],
  },

  // ==========================================
  // 辅助配套建筑
  // ==========================================
  {
    id: "main-gate",
    name: "主校门",
    x: 0, z: 100,
    width: 16, depth: 2, height: 6, floors: 1,
    roofColor: RED, wallColor: RED,
    info: "校园南侧主入口，红色拱门造型",
    tags: ["校门"],
  },
  {
    id: "cainiao",
    name: "菜鸟驿站",
    x: -80.10, z: -55.63,
    width: 8, depth: 6, height: 3, floors: 1,
    roofColor: DARK_GREY_ROOF, wallColor: WHITE_WALL,
    info: "校园快递收发点",
    tags: ["生活"],
  },
  {
    id: "bathhouse",
    name: "澡堂",
    x: -67.46, z: -81.73,
    width: 10, depth: 8, height: 3, floors: 1,
    roofColor: DARK_GREY_ROOF, wallColor: WHITE_WALL,
    info: "公共浴室，位于宿舍区中部",
    tags: ["生活"],
  },
  {
    id: "shop-dorm",
    name: "宿舍服务中心",
    x: 10, z: -85,
    width: 10, depth: 8, height: 3, floors: 1,
    roofColor: ORANGE_ROOF, wallColor: WHITE_WALL,
    info: "宿舍区综合服务中心（便利店、打印店、热水房）",
    tags: ["生活"],
  },
]

// ==================== ROADS ====================

export const roads: RoadData[] = [
  // --- External roads (campus perimeter) ---
  { x1: -160, z1: 125, x2: 120, z2: 125, width: 6, type: "external" },   // 南侧英才街
  { x1: -160, z1: -130, x2: 120, z2: -130, width: 6, type: "external" },  // 北侧大元路
  { x1: 120, z1: -130, x2: 120, z2: 125, width: 6, type: "external" },    // 东侧路
  { x1: -160, z1: -130, x2: -160, z2: 125, width: 6, type: "external" },  // 西侧路

  // --- Internal main roads ---
  // 中轴主路 (from 南校门 → 未名湖 → 教学区 → 宿舍区)
  { x1: 0, z1: 100, x2: 0, z2: -80, width: 5, type: "main" },

  // 教学区前东西主路 (W/S/E楼前)
  { x1: -80, z1: -16, x2: 80, z2: -16, width: 5, type: "main" },

  // 南侧东西主路 (A-B-办公楼前)
  { x1: -20, z1: 65, x2: 100, z2: 65, width: 5, type: "main" },

  // 西侧南北主路 (文体区—生活区)
  { x1: -90, z1: -80, x2: -90, z2: 40, width: 4.5, type: "main" },

  // 东侧南北主路
  { x1: 50, z1: -80, x2: 50, z2: 100, width: 4.5, type: "main" },

  // 宿舍区前东西主路
  { x1: -80, z1: -80, x2: 80, z2: -80, width: 4.5, type: "main" },

  // --- Branch roads ---
  // 湖边小径 (未名湖一周，简化为南北两段)
  { x1: -30, z1: 0, x2: 30, z2: 0, width: 3, type: "branch" },
  { x1: 0, z1: -12, x2: 0, z2: 12, width: 2.5, type: "branch" },

  // 文体区连接路
  { x1: -75, z1: 0, x2: -75, z2: 40, width: 3, type: "branch" },

  // 操场连接路
  { x1: -145, z1: 40, x2: -145, z2: 95, width: 3, type: "branch" },
  { x1: 75, z1: -40, x2: 75, z2: -95, width: 3, type: "branch" },

  // 图书馆连接路
  { x1: 45, z1: 95, x2: 65, z2: 95, width: 3, type: "branch" },

  // 西北生活区支路
  { x1: -118, z1: -80, x2: -118, z2: 0, width: 3, type: "branch" },
  { x1: -160, z1: -20, x2: -90, z2: -20, width: 3, type: "branch" },

  // 校医院支路
  { x1: 50, z1: -115, x2: 95, z2: -115, width: 3, type: "branch" },
]

// ==================== PLAZAS ====================

export const plazas: PlazaData[] = [
  {
    id: "south-gate-plaza",
    name: "南门广场",
    x: 0, z: 95,
    width: 50, depth: 20,
    tileColor: "#d5d0c8",
  },
  {
    id: "central-plaza",
    name: "中心广场（升旗台）",
    x: 0, z: 40,
    width: 50, depth: 30,
    tileColor: "#d5d0c8",
  },
  {
    id: "lakefront-plaza",
    name: "未名湖前广场",
    x: 0, z: -16,
    width: 60, depth: 12,
    tileColor: "#d5d0c8",
  },
  {
    id: "food-plaza-ground",
    name: "美食广场地面",
    x: -51.08, z: -34.73,
    tileColor: "#d0ccc4",
  },
  {
    id: "teaching-plaza",
    name: "教学楼前广场",
    x: 0, z: -40,
    width: 80, depth: 10,
    tileColor: "#d5d0c8",
  },
]

// ==================== LAKES ====================

export const lakes: LakeData[] = [
  {
    id: "weiming-lake",
    name: "未名湖",
    centerX: 0, centerZ: 0,
    shape: "crescent",
    width: 55, depth: 24,
  },
  {
    id: "qingren-lake",
    name: "情人湖",
    centerX: 85, centerZ: 35,
    shape: "irregular",
    width: 38, depth: 18,
  },
]

// ==================== TRACK FIELDS ====================

export const trackFields: TrackFieldData[] = [
  { id: "west-track", name: "西南400米操场", centerX: -145, centerZ: 95 },
  { id: "east-track", name: "东北400米操场", centerX: 75, centerZ: -95 },
]

// ==================== SPORT AREAS ====================

export const sportAreas: SportAreaData[] = [
  {
    id: "basketball-courts",
    name: "篮球场",
    centerX: 40, centerZ: -75,
    type: "basketball",
    width: 60, depth: 35,
    count: 12,
    layout: "grid",
  },
  {
    id: "tennis-courts",
    name: "网球场",
    centerX: 40, centerZ: -45,
    type: "tennis",
    width: 40, depth: 20,
    count: 4,
    layout: "row",
  },
  {
    id: "volleyball-courts",
    name: "排球场",
    centerX: -140, centerZ: 40,
    type: "volleyball",
    width: 30, depth: 20,
    count: 4,
    layout: "row",
  },
]

// ==================== LANDMARKS ====================

export const landmarks: LandmarkData[] = [
  {
    id: "red-flower-sculpture",
    name: "红色花蕊雕塑",
    x: 0, z: -10,
    type: "sculpture",
    description: "抽象花瓣造型，通体红色金属，顶端金色球形花蕊，圆形石材花坛底座，位于未名湖北岸",
  },
  {
    id: "stone-bridge",
    name: "未名湖石拱桥",
    x: 0, z: -5,
    type: "bridge",
    description: "多拱洞石桥，汉白玉雕花栏杆，连接未名湖两岸，S楼学术报告厅楼梯正对此桥",
  },
  {
    id: "jiulongbi",
    name: "九龙壁",
    x: 0, z: 50,
    type: "arch",
    description: "灰色仿古城墙矮墙，垛口造型，中央红褐色九龙浮雕，位于中心广场南侧",
  },
  {
    id: "pavilion-white",
    name: "白色景观亭",
    x: -15, z: 55,
    type: "pavilion",
    description: "白色伞状景观亭，九龙壁广场西侧",
  },
  {
    id: "qingren-bridge",
    name: "情人湖石拱桥",
    x: 85, z: 30,
    type: "bridge",
    description: "小型石拱桥，汉白玉雕花栏杆，横跨情人湖",
  },
  {
    id: "flag-platform",
    name: "升旗台",
    x: 0, z: 35,
    type: "sculpture",
    description: "红色花岗岩平台，三级台阶，三根旗杆，位于中心广场北端",
  },
]
