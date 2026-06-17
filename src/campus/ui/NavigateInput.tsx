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
  const modalRef = useRef<HTMLDivElement | null>(null)

  const handleOpen = useCallback(() => {
    setOpen(true)
    setQuery("")
    setResults([])
    // 延迟聚焦，等 DOM 渲染完
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const handleClose = useCallback(() => {
    setOpen(false)
    setQuery("")
    setResults([])
  }, [])

  const handleInput = useCallback((value: string) => {
    setQuery(value)
    setResults(searchTargets(value))
  }, [])

  const handleSelect = useCallback((item: SearchItem) => {
    onSelect(item.target)
    setOpen(false)
    setQuery("")
    setResults([])
  }, [onSelect])

  const handleClear = useCallback(() => {
    setOpen(false)
    setQuery("")
    setResults([])
    onClear()
  }, [onClear])

  // 点击模态外部关闭
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        handleClose()
      }
    }
    // 延迟绑定，避免打开按钮的点击事件立即触发关闭
    const timer = setTimeout(() => {
      window.addEventListener("pointerdown", onClick)
    }, 100)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("pointerdown", onClick)
    }
  }, [open, handleClose])

  return (
    <>
      {/* 浮动搜索按钮 */}
      <button
        data-campus-ui
        onClick={handleOpen}
        title="导航"
        style={{
          position: "fixed",
          top: 72,
          right: 16,
          zIndex: 20,
          width: 44,
          height: 44,
          borderRadius: 22,
          border: "1px solid rgba(255,255,255,0.2)",
          background: activeTarget
            ? "rgba(255,200,0,0.25)"
            : "rgba(30,30,30,0.78)",
          color: "white",
          fontSize: 20,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(10px)",
          transition: "background 0.2s",
        }}
        onPointerEnter={(e) => {
          (e.target as HTMLElement).style.background = "rgba(255,255,255,0.15)"
        }}
        onPointerLeave={(e) => {
          (e.target as HTMLElement).style.background = activeTarget
            ? "rgba(255,200,0,0.25)"
            : "rgba(30,30,30,0.78)"
        }}
      >
        {activeTarget ? "🎯" : "🔍"}
      </button>

      {/* 当前导航目标标签 */}
      {activeTarget && (
        <div
          data-campus-ui
          style={{
            position: "fixed",
            top: 74,
            right: 68,
            zIndex: 20,
            background: "rgba(30,30,30,0.82)",
            borderRadius: 20,
            padding: "6px 14px 6px 6px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "white",
            fontSize: 13,
            maxWidth: "50vw",
          }}
        >
          <span style={{ fontSize: 14 }}>📍</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {activeTarget.name}
          </span>
          <button
            onClick={handleClear}
            style={{
              background: "rgba(255,80,80,0.55)",
              border: "none",
              borderRadius: 14,
              color: "white",
              width: 22,
              height: 22,
              fontSize: 12,
              cursor: "pointer",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 搜索弹窗 */}
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: "18vh",
            backdropFilter: "blur(2px)",
          }}
        >
          <div
            ref={modalRef}
            style={{
              width: "min(400px, 90vw)",
              background: "rgba(24,24,24,0.96)",
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            }}
          >
            {/* 搜索输入栏 */}
            <div style={{
              display: "flex",
              gap: 8,
              padding: "12px 16px",
              alignItems: "center",
              borderBottom: results.length > 0 ? "1px solid rgba(255,255,255,0.08)" : "none",
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>📍</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleInput(e.target.value)}
                placeholder="搜索目的地…"
                autoComplete="off"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "white",
                  fontSize: 16,
                  fontFamily: "inherit",
                }}
              />
              <button
                onClick={handleClose}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "none",
                  borderRadius: 14,
                  color: "rgba(255,255,255,0.6)",
                  width: 28,
                  height: 28,
                  fontSize: 14,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* 搜索结果 */}
            {results.length > 0 && (
              <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
                {results.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleSelect(item)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "13px 18px",
                      border: "none",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      background: "transparent",
                      color: "white",
                      cursor: "pointer",
                      fontSize: 14,
                      fontFamily: "inherit",
                    }}
                    onPointerEnter={(e) => {
                      (e.target as HTMLElement).style.background = "rgba(255,255,255,0.08)"
                    }}
                    onPointerLeave={(e) => {
                      (e.target as HTMLElement).style.background = "transparent"
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontSize: 12, opacity: 0.5, marginTop: 2 }}>{item.subtitle}</div>
                  </button>
                ))}
              </div>
            )}

            {query.length > 0 && results.length === 0 && (
              <div style={{
                padding: "28px 18px",
                textAlign: "center",
                color: "rgba(255,255,255,0.4)",
                fontSize: 14,
              }}>
                无匹配地点
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
