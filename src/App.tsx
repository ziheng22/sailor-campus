import { CampusPage } from "./campus/CampusPage"

export default function App() {
  return (
    <CampusPage
      onExit={() => {
        // 独立部署：退出回到首页
        if (window.history.length > 1) {
          window.history.back()
        } else {
          window.location.href = "/"
        }
      }}
    />
  )
}
