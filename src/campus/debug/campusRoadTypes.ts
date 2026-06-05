import type { PolygonPoint } from "../utils/colliderPolygon"

export interface RoadDef {
  id: string
  name: string
  polygon: PolygonPoint[]
}

export interface RoadOverrides {
  version: 2 | 3
  roads: RoadDef[]
  /** 用户删掉的默认路 id，刷新后不再从代码默认里补回 */
  removedIds?: string[]
}
