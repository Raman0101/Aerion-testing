import { useState } from "react"
import { useSetRecoilState } from "recoil"
import Container from "./Components/Container"
import LoginPage from "./Components/LoginPage"
import { user } from "./state"
import { AppView } from "./types"
import { Balance } from "@repo/types"

function getEmptyBalance(): Balance {
  return {
    balance: {
      available: 0,
      locked: 0
    }
  }
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeView, setActiveView] = useState<AppView>("dashboard")
  const setCurrentUser = useSetRecoilState(user)

  function login(userId: string) {
    setCurrentUser({
      id: userId,
      balance: getEmptyBalance()
    })

    setActiveView("dashboard")
    setIsAuthenticated(true)
  }

  function logout() {
    setIsAuthenticated(false)
    setActiveView("dashboard")
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={login} />
  }

  return (
    <Container
      activeView={activeView}
      onNavigate={setActiveView}
      onLogout={logout}
    />
  )
}

export default App