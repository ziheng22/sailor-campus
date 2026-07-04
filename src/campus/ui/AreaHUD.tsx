import { useState, useRef, useEffect } from "react"
import { campusZones, type CampusZone } from "./campusZones"
import { playerWorldPos } from "./playerPosition"
import { AreaDiscoveryBanner } from "./AreaDiscoveryBanner"

/** 根据区域大小动态计算冷却时间（ms） */
function zoneCooldown(zone: CampusZone): number {
  return Math.max(1500, Math.min(4000, zone.radius * 60))
}

export function AreaHUD() {
  const [bannerZone, setBannerZone] = useState<CampusZone | null>(null)
  const currentZoneIdRef = useRef<string | null>(null)
  const cooldownMapRef = useRef<Map<string, number>>(new Map())
  const rafRef = useRef(0)
  const lastPosRef = useRef({ x: 0, z: 0 })

  useEffect(() => {
    let running = true

    const tick = () => {
      if (!running) return
      rafRef.current = requestAnimationFrame(tick)

      const now = Date.now()
      const px = playerWorldPos.x
      const pz = playerWorldPos.z
      const currentId = currentZoneIdRef.current

      // 记录位置，banner 关闭时用于判断玩家是否仍在当前区域
      lastPosRef.current = { x: px, z: pz }

      // 检查是否已离开当前区域（带迟滞）
      if (currentId) {
        const currentZone = campusZones.find((z) => z.id === currentId)
        if (currentZone) {
          const exitDist = currentZone.radius * 1.25
          if (Math.hypot(px - currentZone.x, pz - currentZone.z) > exitDist) {
            currentZoneIdRef.current = null
          }
          // 仍在当前区域内 → 不切换
          return
        } else {
          currentZoneIdRef.current = null
        }
      }

      // 仅在无当前区域时查找新区域
      let found: CampusZone | null = null
      for (const z of campusZones) {
        if (Math.hypot(px - z.x, pz - z.z) <= z.radius) {
          const until = cooldownMapRef.current.get(z.id) ?? 0
          if (now >= until) {
            found = z
            break
          }
        }
      }

      if (found) {
        currentZoneIdRef.current = found.id
        setBannerZone(found)
      }
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      running = false
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  if (!bannerZone) return null

  return (
    <AreaDiscoveryBanner
      areaName={bannerZone.name}
      icon={bannerZone.icon}
      color={bannerZone.color}
      subtitle={bannerZone.subtitle}
      onDone={() => {
        const zoneId = bannerZone.id
        cooldownMapRef.current.set(zoneId, Date.now() + zoneCooldown(bannerZone))

        // 仅在玩家已离开当前区域时才清除，防止交替闪烁
        const pos = lastPosRef.current
        const currentZone = campusZones.find((z) => z.id === zoneId)
        if (currentZone) {
          const exitDist = currentZone.radius * 1.25
          if (Math.hypot(pos.x - currentZone.x, pos.z - currentZone.z) > exitDist) {
            currentZoneIdRef.current = null
          }
          // 否则保持 currentZoneIdRef，下次 tick 会 return 不切换
        }

        setBannerZone(null)
      }}
    />
  )
}
