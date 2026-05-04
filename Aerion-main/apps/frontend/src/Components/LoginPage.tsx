import { FormEvent, useState } from "react"
import { demoUsers, getDemoUser, DemoUser } from "../data/users.ts"

type LoginPageProps = {
  onLogin: (userId: string) => void
}

export default function LoginPage({
  onLogin
}: LoginPageProps) {

  const [selectedUserId, setSelectedUserId] = useState(demoUsers[0].id)
  const [email, setEmail] = useState(demoUsers[0].email)
  const [password, setPassword] = useState("aerion-demo")

  const selectedUser = getDemoUser(selectedUserId)

  function selectUser(userId: string) {
    const nextUser = getDemoUser(userId)

    setSelectedUserId(userId)
    setEmail(nextUser.email)
  }

  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onLogin(selectedUserId)
  }

  return (
    <main className="min-h-screen bg-[#0e0f14] font-Poppins text-white">

      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 gap-8 px-5 py-8 lg:grid-cols-[1fr_420px] lg:items-center">

        <section className="flex min-h-[440px] flex-col justify-between border border-gray-800 bg-[#14161d] p-6 sm:p-8">

          <div>

            <div className="mb-8 flex items-center gap-3">

              <img
                className="h-11 w-11 rounded-full object-cover"
                src="/profile.jpg"
                alt="Aerion"
              />

              <div>
                <h1 className="text-3xl font-semibold tracking-normal">
                  Aerion
                </h1>

                <p className="text-sm text-gray-400">
                  Centralized stock exchange
                </p>
              </div>

            </div>

            <div className="grid gap-3 sm:grid-cols-3">

              {demoUsers.map((user: DemoUser) => (

                <button
                  key={user.id}
                  type="button"
                  onClick={() => selectUser(user.id)}
                  className={`border p-4 text-left transition ${
                    selectedUserId === user.id
                      ? "border-[#4c94ff] bg-[#182234]"
                      : "border-gray-800 bg-[#101219] hover:border-gray-600"
                  }`}
                >

                  <img
                    className="mb-4 h-12 w-12 rounded-full object-cover"
                    src={user.profile}
                    alt={user.name}
                  />

                  <p className="text-sm font-semibold">
                    {user.name}
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    {user.role}
                  </p>

                </button>

              ))}

            </div>

          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 border-t border-gray-800 pt-6 text-sm">

            <div>
              <p className="text-gray-500">Markets</p>
              <p className="mt-1 text-lg font-semibold">2K</p>
            </div>

            <div>
              <p className="text-gray-500">Mode</p>
              <p className="mt-1 text-lg font-semibold">Spot</p>
            </div>

            <div>
              <p className="text-gray-500">Quote</p>
              <p className="mt-1 text-lg font-semibold">INR</p>
            </div>

          </div>

        </section>

        <section className="border border-gray-800 bg-[#14161d] p-6 sm:p-8">

          <div className="mb-6 flex items-center gap-4">

            <img
              className="h-14 w-14 rounded-full object-cover"
              src={selectedUser.profile}
              alt={selectedUser.name}
            />

            <div>

              <h2 className="text-2xl font-semibold">
                Sign in
              </h2>

              <p className="text-sm text-gray-400">
                {selectedUser.email}
              </p>

            </div>

          </div>

          <form
            className="space-y-5"
            onSubmit={submitLogin}
          >

            <label className="block">

              <span className="mb-2 block text-sm text-gray-400">
                Email
              </span>

              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 w-full border border-gray-700 bg-[#0e0f14] px-4 text-sm text-white outline-none transition focus:border-[#4c94ff]"
                type="email"
              />

            </label>

            <label className="block">

              <span className="mb-2 block text-sm text-gray-400">
                Password
              </span>

              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full border border-gray-700 bg-[#0e0f14] px-4 text-sm text-white outline-none transition focus:border-[#4c94ff]"
                type="password"
              />

            </label>

            <button
              type="submit"
              className="h-12 w-full bg-[#02a166] text-sm font-semibold text-white transition hover:bg-[#058d5b]"
            >
              Login
            </button>

          </form>

          <div className="mt-6 border-t border-gray-800 pt-5 text-sm text-gray-400">

            <div className="flex items-center justify-between">

              <span>Selected account</span>

              <span className="font-medium text-white">
                {selectedUser.name}
              </span>

            </div>

          </div>

        </section>

      </div>

    </main>
  )
}
