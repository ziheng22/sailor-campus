import { useState, useRef, useCallback } from "react"
import { campusZones, type CampusZone } from "./campusZones"
import { playerWorldPos } from "./playerPosition"
import { AreaDiscoveryBanner } from "./AreaDiscoveryBanner"

const COOLDOWN_MS = 3000

export function AreaHUD() {
  const [bannerZone, setBannerZone] = useState<CampusZone | null>(null)
  const lastZoneIdRef = useRef<string | null>(null)
  const cooldownRef = useRef(0)

  const tickRef = useRef<ReturnType<typeof setInterval>>()
  const startPolling = useCallback(() => {
    if (tickRef.current) return
    tickRef.current = setInterval(() => {
      const now = Date.now()
      if (now < cooldownRef.current) return

      const px = playerWorldPos.x
      const pz = playerWorldPos.z

      let found: CampusZone | null = null
      for (const z of campusZones) {
        if (Math.hypot(px - z.x, pz - z.z) <= z.radius) {
          found = z
          break
        }
      }

      if (found && found.id !== lastZoneIdRef.current) {
        lastZoneIdRef.current = found.id
        setBannerZone(found)
      } else if (!found) {
        lastZoneIdRef.current = null
      }
    }, 250)
  }, [])

  const startedRef = useRef(false)
  if (!startedRef.current) {
    startedRef.current = true
    startPolling()
  }

  if (!bannerZone) return null

  return (
    <AreaDiscoveryBanner
      areaName={bannerZone.name}
      icon={bannerZone.icon}
      color={bannerZone.color}
      subtitle={bannerZone.subtitle}
      onDone={() => {
        setBannerZone(null)
        cooldownRef.current = Date.now() + COOLDOWN_MS
      }}
    />
  )
}
