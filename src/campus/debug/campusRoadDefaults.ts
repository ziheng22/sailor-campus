import type { RoadDef } from "./campusRoadTypes"
import type { PolygonPoint } from "../utils/colliderPolygon"

interface RoadSegment {
  x1: number; z1: number
  x2: number; z2: number
  width: number
}

function segmentToPolygon(seg: RoadSegment): PolygonPoint[] {
  const dx = seg.x2 - seg.x1
  const dz = seg.z2 - seg.z1
  const len = Math.sqrt(dx * dx + dz * dz)
  if (len < 0.01) return []
  const px = (-dz / len) * (seg.width / 2)
  const pz = (dx / len) * (seg.width / 2)
  return [
    { x: seg.x1 + px, z: seg.z1 + pz },
    { x: seg.x1 - px, z: seg.z1 - pz },
    { x: seg.x2 - px, z: seg.z2 - pz },
    { x: seg.x2 + px, z: seg.z2 + pz },
  ]
}

/** 主干与支路：坐标对齐 GLB 世界空间（X 东 +，Z 南 +，湖心约 52, 6） */
const ROAD_SEGMENTS: { name: string; segments: RoadSegment[] }[] = [
  {
    name: "中轴主路",
    segments: [
      { x1: 50, z1: 94, x2: 50, z2: 13, width: 6 },
      // 湖西侧绕行（湖约 x30–55, z0–10）
      { x1: 50, z1: 13, x2: 26, z2: 13, width: 4.5 },
      { x1: 26, z1: 13, x2: 26, z2: -3, width: 4.5 },
      { x1: 26, z1: -3, x2: 50, z2: -3, width: 4.5 },
      { x1: 50, z1: -3, x2: 50, z2: -88, width: 6 },
    ],
  },
  {
    name: "教学区东西主路",
    segments: [{ x1: -72, z1: -18, x2: 78, z2: -18, width: 5 }],
  },
  {
    name: "中部东西主路",
    segments: [{ x1: -88, z1: 22, x2: 72, z2: 22, width: 5 }],
  },
  {
    name: "南侧东西主路",
    segments: [{ x1: -15, z1: 62, x2: 82, z2: 62, width: 5 }],
  },
  {
    name: "西侧南北主路",
    segments: [{ x1: -87, z1: -85, x2: -87, z2: 75, width: 4.5 }],
  },
  {
    name: "东侧南北主路",
    segments: [{ x1: 55, z1: -85, x2: 55, z2: 88, width: 4.5 }],
  },
  {
    name: "宿舍区东西主路",
    segments: [{ x1: -75, z1: -78, x2: 75, z2: -78, width: 4.5 }],
  },
  {
    name: "东侧半环路",
    segments: [
      { x1: 55, z1: -62, x2: 70, z2: -62, width: 4 },
      { x1: 70, z1: -62, x2: 80, z2: -48, width: 4 },
      { x1: 80, z1: -48, x2: 80, z2: -18, width: 4 },
      { x1: 80, z1: -18, x2: 70, z2: 2, width: 4 },
      { x1: 70, z1: 2, x2: 55, z2: 2, width: 4 },
    ],
  },
  {
    name: "湖边路（北岸）",
    segments: [{ x1: 28, z1: -1, x2: 62, z2: -1, width: 3 }],
  },
  {
    name: "文体区连接路",
    segments: [{ x1: -78, z1: -14, x2: -78, z2: 45, width: 3.5 }],
  },
  {
    name: "西侧生活区南北路",
    segments: [{ x1: -76, z1: -78, x2: -76, z2: -12, width: 3 }],
  },
  {
    name: "操场连接路",
    segments: [
      { x1: -91, z1: 38, x2: -91, z2: 88, width: 3 },
      { x1: -91, z1: 38, x2: -87, z2: 38, width: 3 },
    ],
  },
  {
    name: "图书馆前东西路",
    segments: [{ x1: 52, z1: 68, x2: 76, z2: 68, width: 3 }],
  },
  {
    name: "西北生活区东西支路",
    segments: [{ x1: -88, z1: -18, x2: -50, z2: -18, width: 3 }],
  },
  {
    name: "北侧行政区东西路",
    segments: [{ x1: 52, z1: -72, x2: 78, z2: -72, width: 3 }],
  },
  {
    name: "南门广场周边",
    segments: [
      { x1: 25, z1: 90, x2: 75, z2: 90, width: 4 },
      { x1: 25, z1: 94, x2: 25, z2: 62, width: 3 },
      { x1: 75, z1: 94, x2: 75, z2: 62, width: 3 },
    ],
  },
  {
    name: "东南连体建筑前路",
    segments: [{ x1: 15, z1: 62, x2: 15, z2: 38, width: 3 }],
  },
]

export function buildDefaultRoadDefs(): RoadDef[] {
  const defs: RoadDef[] = []
  let idx = 0
  for (const group of ROAD_SEGMENTS) {
    group.segments.forEach((seg, segIdx) => {
      const polygon = segmentToPolygon(seg)
      if (polygon.length < 3) return
      const suffix = group.segments.length > 1 ? `-${segIdx + 1}` : ""
      defs.push({
        id: `default-road-${idx++}`,
        name: `${group.name}${suffix}`,
        polygon,
      })
    })
  }
  return defs
}
