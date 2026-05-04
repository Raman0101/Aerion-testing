import { Suspense } from "react"
import DashboardPage from "./DashboardPage.tsx"
import Market from "./Market"
import Navbar from "./Navbar"
import { AppView } from "../types"

type ContainerProps = {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-73px)] bg-[#0e0f14]">
      <div className="text-white text-lg">Loading...</div>
    </div>
  )
}

export default function Container({
  activeView,
  onNavigate,
  onLogout
}: ContainerProps) {

  return (
    <main className="font-Poppins w-full h-full min-h-[100vh] bg-[#0e0f14] overflow-x-hidden">
      <Navbar
        activeView={activeView}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <Suspense fallback={<LoadingFallback />}>
        {activeView === "dashboard" ? <DashboardPage /> : <Market />}
      </Suspense>
    </main>
  )
}