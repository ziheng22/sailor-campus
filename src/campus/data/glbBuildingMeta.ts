import * as THREE from "three"
import { type BuildingData } from "./campusData"

const ORANGE_ROOF = "#c74c3c"
const WHITE_WALL = "#f5f0e8"

interface Meta {
  id: string
  name: string
  info: string
  floors?: number
  tags?: string[]
  enterable?: boolean
  interiorId?: string
}

export const GLB_MESH_META: Record<string, Meta> = {
  "w楼": { id: "w-building", name: "W教学楼", info: "教学主楼", floors: 5, tags: ["教学"], enterable: true, interiorId: "w-building" },
  "s楼": { id: "s-building", name: "S实验楼", info: "实验楼/计算机室", floors: 5, tags: ["教学"] },
  "e楼": { id: "e-building", name: "E教学楼", info: "教学楼东段", floors: 5, tags: ["教学"] },
  "a楼": { id: "a-building", name: "A楼", info: "东南连体建筑群", floors: 5, tags: ["教学"] },
  "b楼": { id: "b-building", name: "B楼", info: "东南连体建筑群", floors: 5, tags: ["教学"] },
  "办公楼": { id: "office-building", name: "办公楼", info: "行政办公楼", floors: 4, tags: ["办公"] },
  "办公室": { id: "office-wing", name: "办公室", info: "配套办公室", floors: 2, tags: ["办公"] },
  "报告厅": { id: "lecture-hall", name: "学术报告厅", info: "学术报告厅", floors: 2, tags: ["教学"] },
  "行政楼": { id: "admin-building", name: "行政楼", info: "校园行政楼", floors: 4, tags: ["办公"] },
  "大礼堂": { id: "auditorium", name: "大礼堂", info: "校园大礼堂", floors: 2, tags: ["文体"], enterable: true, interiorId: "auditorium" },
  "体育馆": { id: "gymnasium", name: "室内体育馆", info: "室内体育馆", floors: 2, tags: ["文体"], enterable: true, interiorId: "gymnasium" },
  "看台": { id: "stadium-stands", name: "操场看台", info: "标准操场看台", floors: 1, tags: ["运动"] },
  "宿舍": { id: "dorm-cluster", name: "宿舍区", info: "学生宿舍集群", floors: 6, tags: ["宿舍"] },
  "18号寝室楼": {
    id: "dorm-18",
    name: "18号宿舍楼",
    info: "学生宿舍18号楼，6层板式楼，橙顶白墙",
    floors: 6,
    tags: ["宿舍"],
  },
  "18号宿舍楼": {
    id: "dorm-18",
    name: "18号宿舍楼",
    info: "学生宿舍18号楼，6层板式楼，橙顶白墙",
    floors: 6,
    tags: ["宿舍"],
  },
  "餐厅": { id: "canteen", name: "英才食堂", info: "校园主食堂", floors: 2, tags: ["食堂", "生活"] },
  "校内驿站": {
    id: "campus-station",
    name: "校内驿站",
    info: "校园快递收发与便民服务点",
    floors: 1,
    tags: ["生活"],
  },
  "商业街": { id: "commercial-street", name: "商业街", info: "校园商业街", floors: 1, tags: ["生活"] },
  "商店": { id: "shop", name: "商店", info: "校园便利店", floors: 1, tags: ["生活"] },
  "澡堂": { id: "bathhouse", name: "澡堂", info: "公共浴室", floors: 1, tags: ["生活"] },
  "创业园": { id: "startup-park", name: "创业园", info: "大学生创业孵化园", floors: 2, tags: ["配套"] },
  "连廊": { id: "corridor", name: "连廊", info: "建筑连廊", floors: 1, tags: ["连体建筑"] },
  "图书馆": { id: "library", name: "图书馆", info: "校园图书馆", floors: 6, tags: ["教学"], enterable: true, interiorId: "library" },
  "校医院": { id: "hospital", name: "校医院", info: "校园医院", floors: 2, tags: ["配套"] },
  "广播站": { id: "radio-station", name: "广播站", info: "校园广播站", floors: 1, tags: ["配套"] },
  "邮政": { id: "post-office", name: "邮政", info: "邮政服务点", floors: 1, tags: ["生活"] },
  "桥": { id: "stone-bridge", name: "石桥", info: "校园石桥", tags: ["地标"] },
  "红色花蕊": { id: "red-flower", name: "红色花蕊雕塑", info: "未名湖地标雕塑", tags: ["地标"] },
  "湖1": { id: "lake-1", name: "未名湖", info: "校园中心湖泊", tags: ["景观"] },
  "湖2": { id: "lake-2", name: "情人湖", info: "校园湖泊", tags: ["景观"] },
  "操场": { id: "track-field", name: "标准操场", info: "400米塑胶跑道", tags: ["运动"] },
  "球场": { id: "basketball-courts", name: "篮球场", info: "室外篮球场", tags: ["运动"] },
  "网球场": { id: "tennis-courts", name: "网球场", info: "室外网球场", tags: ["运动"] },
  "排球场": { id: "volleyball-courts", name: "排球场", info: "室外排球场", tags: ["运动"] },
}

export function buildingDataFromGlbMesh(
  meshName: string,
  center: THREE.Vector3,
  size: THREE.Vector3,
  nameOverrides?: Record<string, string>,
): BuildingData {
  const meta = resolveGlbMeshMeta(meshName)
  const buildingId = meta?.id ?? meshName
  const overrideName = nameOverrides?.[buildingId]
  return {
    id: buildingId,
    name: overrideName || (meta?.name ?? meshName),
    x: center.x,
    z: center.z,
    width: size.x,
    depth: size.z,
    height: size.y,
    floors: meta?.floors ?? 1,
    roofColor: ORANGE_ROOF,
    wallColor: WHITE_WALL,
    info: meta?.info ?? meshName,
    tags: meta?.tags,
    enterable: meta?.enterable,
    interiorId: meta?.interiorId,
  }
}

const DORM_PARTS_PER_BUILDING = 6
const OFFICE_PARTS_PER_BUILDING = 6

export function resolveGlbMeshMeta(meshName: string): Meta | undefined {
  if (GLB_MESH_META[meshName]) return GLB_MESH_META[meshName]

  const dormPart = meshName.match(/^宿舍(\d+)$/)
  if (dormPart) {
    const partIndex = Number.parseInt(dormPart[1], 10)
    const buildingNo = Math.floor((partIndex - 1) / DORM_PARTS_PER_BUILDING) + 1
    return {
      id: `dorm-${buildingNo}`,
      name: `${buildingNo}号宿舍楼`,
      info: `学生宿舍${buildingNo}号楼，6层板式楼，橙顶白墙`,
      floors: 6,
      tags: ["宿舍"],
    }
  }

  const officePart = meshName.match(/^办公室(\d+)$/)
  if (officePart) {
    const partIndex = Number.parseInt(officePart[1], 10)
    const buildingNo = Math.floor((partIndex - 1) / OFFICE_PARTS_PER_BUILDING) + 1
    return {
      id: `office-wing-${buildingNo}`,
      name: `办公室${buildingNo}号`,
      info: "配套办公室，中间留空可通行",
      floors: 2,
      tags: ["办公"],
    }
  }

  return undefined
}
