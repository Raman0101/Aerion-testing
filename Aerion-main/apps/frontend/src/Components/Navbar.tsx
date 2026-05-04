import { useEffect, useState } from "react"
import { useRecoilState } from "recoil"

import { user } from "../state"
import { WebSocketManager } from "../utils/WebSocketManager"
import { BalanceResponse } from "@repo/types"
import { getBalance } from "../utils"
import { demoUsers, getDemoUser, DemoUser } from "../data/users.ts"
import { AppView } from "../types"

type NavbarProps = {
  activeView: AppView
  onNavigate: (view: AppView) => void
  onLogout: () => void
}

export default function Navbar({
  activeView,
  onNavigate,
  onLogout
}: NavbarProps) {

  const [currentUser, setCurrentUser] = useRecoilState(user)
  const [tabOpened, setTabOpened] = useState(false)

  const activeUser = getDemoUser(currentUser.id)

  function toggleTab() {
    setTabOpened((prev) => !prev)
  }

  function balanceCallback({
    balance,
    id
  }: BalanceResponse) {

    setCurrentUser((previousUser) => {

      if (previousUser.id !== id) {
        return previousUser
      }

      return {
        id,
        balance
      }
    })
  }

  function changeUser(id: string) {

    setCurrentUser({
      id,
      balance: currentUser.balance
    })

    setTabOpened(false)
  }

  useEffect(() => {

    getBalance(currentUser.id)
      .then((data) => {

        setCurrentUser({
          id: currentUser.id,
          balance: data.data.balance
        })

      })
      .catch((error) => {
        console.error("Error fetching balance:", error)
      })

    WebSocketManager.getInstance().sendMessage({
      method: "SUBSCRIBE",
      params: [`balance@${currentUser.id}`]
    })

    WebSocketManager.getInstance().attachCallback(
      "BALANCE",
      balanceCallback
    )

    return () => {

      WebSocketManager.getInstance().sendMessage({
        method: "UNSUBSCRIBE",
        params: [`balance@${currentUser.id}`]
      })

      WebSocketManager.getInstance().detachCallback(
        "BALANCE",
        balanceCallback
      )
    }

  }, [currentUser.id])

  return (

    <nav className="border-b flex flex-wrap justify-between gap-4 border-gray-800 py-3 px-5 lg:px-10">

      <div className="flex flex-wrap gap-5 items-center">

        <button
          type="button"
          onClick={() => onNavigate("dashboard")}
          className="logo"
        >

          <img
            className="w-8 rounded-[50%]"
            src="/profile.jpg"
            alt=""
          />

        </button>

        <div className="search">

          <input
            type="text"
            className="rounded-md bg-[#202127] outline-none px-4 py-2 text-sm text-white"
            placeholder="Search Market"
          />

        </div>

        <div className="partition h-full w-[1px] bg-[#02a166]"></div>

        <div className="flex border border-gray-800 bg-[#14161d] text-sm text-white">

          <button
            type="button"
            onClick={() => onNavigate("dashboard")}
            className={`px-4 py-2 ${
              activeView === "dashboard"
                ? "bg-[#202127] text-[#4c94ff]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Dashboard
          </button>

          <button
            type="button"
            onClick={() => onNavigate("trade")}
            className={`border-l border-gray-800 px-4 py-2 ${
              activeView === "trade"
                ? "bg-[#202127] text-[#4c94ff]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Exchange
          </button>

        </div>

        <div className="text-[#02a166] transition-[2s] amount text-2xl">

          ₹
          {currentUser.balance.balance &&
            currentUser.balance.balance.available.toFixed(2)}

        </div>

      </div>

      <div className="relative flex items-center gap-3">

        <button
          type="button"
          onClick={onLogout}
          className="h-10 border border-gray-800 px-4 text-sm text-gray-300 transition hover:border-gray-600 hover:text-white"
        >
          Logout
        </button>

        <div
          onClick={toggleTab}
          className="avatar cursor-pointer flex gap-4 items-center text-white bg-[#202127] py-2 px-5 rounded-xl"
        >

          <div>

            <h1 className="font-Noto text-[12px] font-semibold">
              Hi, {activeUser.name}
            </h1>

            <h3 className="text-[10px] py-[1px] opacity-50">
              {activeUser.email}
            </h3>

          </div>

          <img
            className="w-8 rounded-[50%]"
            src={activeUser.profile}
            alt=""
          />

          <svg
            style={{
              transition: "0.25s",
              rotate: tabOpened ? "180deg" : ""
            }}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-6"
          >

            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m19.5 8.25-7.5 7.5-7.5-7.5"
            />

          </svg>

        </div>

        <div
          style={{
            transition: "0.25s",
            translate: tabOpened ? "0px" : "100%",
            opacity: tabOpened ? "1" : "0",
            boxShadow: `
              rgba(0, 0, 0, 0.25) 0px 54px 55px,
              rgba(0, 0, 0, 0.12) 0px -12px 30px,
              rgba(0, 0, 0, 0.12) 0px 4px 6px,
              rgba(0, 0, 0, 0.17) 0px 12px 13px,
              rgba(0, 0, 0, 0.09) 0px -3px 5px
            `
          }}
          className="absolute -right-2 bg-[#0e0f14] border-2 border-gray-800 w-max rounded-lg p-5 z-10 my-2"
        >

          {
            demoUsers
              .filter((user: DemoUser) => user.id !== currentUser.id)
              .map((user: DemoUser) => (

                <div
                  key={user.id}
                  className="avatar cursor-pointer my-1 flex gap-4 justify-between items-center text-white bg-[#202127] py-2 px-5 rounded-xl"
                  onClick={() => {
                    changeUser(user.id)
                  }}
                >

                  <div>

                    <h1 className="font-Noto text-[12px] font-semibold">
                      Hi, {user.name}
                    </h1>

                    <h3 className="text-[10px] py-[1px] opacity-50">
                      {user.email}
                    </h3>

                  </div>

                  <div className="flex gap-2 items-center">

                    <img
                      className="w-8 rounded-[50%]"
                      src={user.profile}
                      alt=""
                    />

                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="size-6"
                    >

                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m19.5 8.25-7.5 7.5-7.5-7.5"
                      />

                    </svg>

                  </div>

                </div>

              ))
          }

        </div>

      </div>

    </nav>
  )
}
