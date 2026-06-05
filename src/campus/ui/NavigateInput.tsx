import { useState, useRef, useEffect, useCallback } from "react"
import { searchTargets, type SearchItem, type NavigateTarget } from "../navigate/NavigateTarget"

interface Props {
  activeTarget: NavigateTarget | null
  onSelect: (target: NavigateTarget) => void
  onClear: () => void
}

export function NavigateInput({ activeTarget, onSelect, onClear }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchItem[]>([])
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleInput = useCallback((value: string) => {
    setQuery(value)
    setResults(searchTargets(value))
    setOpen(true)
  }, [])

  const handleSelect = useCallback((item: SearchItem) => {
    onSelect(item.target)
    setQuery(item.label)
    setOpen(false)
    setResults([])
  }, [onSelect])

  const handleClear = useCallback(() => {
    setQuery("")
    setOpen(false)
    setResults([])
    onClear()
  }, [onClear])

  // 点击外部关闭
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener("pointerdown", onClick)
    return () => window.removeEventListener("pointerdown", onClick)
  }, [open])

  return (
    <div
      data-campus-ui
      ref={inputRef}
      style={{
        position: "fixed",
        bottom: activeTarget ? 110 : 28,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 20,
        width: "min(360px, 88vw)",
      }}
    >
      <div style={{
        display: "flex",
        gap: 6,
        background: "rgba(30,30,30,0.88)",
        borderRadius: 24,
        padding: "6px 6px 6px 16px",
        alignItems: "center",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.15)",
      }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>📍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          placeholder={activeTarget ? `导航至: ${activeTarget.name}` : "搜索地点..."}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "white",
            fontSize: 15,
            fontFamily: "inherit",
            minWidth: 0,
          }}
        />
        {activeTarget && (
          <button
            onClick={handleClear}
            style={{
              background: "rgba(255,80,80,0.7)",
              border: "none",
              borderRadius: 18,
              color: "white",
              width: 28,
              height: 28,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div style={{
          marginTop: 8,
          background: "rgba(30,30,30,0.92)",
          borderRadius: 16,
          overflow: "hidden",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}>
          {results.map((item) => (
            <button
              key={item.label}
              onClick={() => handleSelect(item)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "12px 18px",
                border: "none",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: "transparent",
                color: "white",
                cursor: "pointer",
                fontSize: 14,
                fontFamily: "inherit",
              }}
              onPointerEnter={(e) => {
                (e.target as HTMLElement).style.background = "rgba(255,255,255,0.1)"
              }}
              onPointerLeave={(e) => {
                (e.target as HTMLElement).style.background = "transparent"
              }}
            >
              <div style={{ fontWeight: 600 }}>{item.label}</div>
              <div style={{ fontSize: 12, opacity: 0.55, marginTop: 2 }}>{item.subtitle}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
