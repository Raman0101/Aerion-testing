import { useRecoilValue } from "recoil"
import { symbol, ticker, TradesState, user } from "../state/index.ts"
import { getDemoUser } from "../data/users.ts"

const watchlist = [
  { market: "TATA_INR", base: "TATA", change: "+2.4%", volume: "18.2K" },
  { market: "TEST_INR", base: "TEST", change: "-0.8%", volume: "9.7K" }
]

export default function DashboardPage() {

  const currentUser = useRecoilValue(user)
  const currentSymbol = useRecoilValue(symbol)
  const tickerValue = useRecoilValue(ticker)
  const trades = useRecoilValue(TradesState)

  const profile = getDemoUser(currentUser.id)

  const quoteBalance = currentUser.balance.balance ?? {
    available: 0,
    locked: 0
  }

  const assets = Object.entries(currentUser.balance)
    .filter(([asset]) => asset !== "balance")

  const baseAsset = currentSymbol.split("_")[0]

  const baseHolding = currentUser.balance[baseAsset] ?? {
    available: 0,
    locked: 0
  }

  const latestTrades = trades.slice(0, 5)

  return (
    <section className="min-h-[calc(100vh-73px)] bg-[#0e0f14] px-5 py-6 text-white lg:px-10">

      <div className="mb-6 flex flex-col gap-4 border-b border-gray-800 pb-6 lg:flex-row lg:items-end lg:justify-between">

        <div className="flex items-center gap-4">
          <img
            className="h-16 w-16 rounded-full object-cover"
            src={profile.profile}
            alt={profile.name}
          />

          <div>
            <p className="text-sm text-gray-400">{profile.role}</p>
            <h1 className="text-3xl font-semibold tracking-normal">
              {profile.name}
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Metric
            label="INR Available"
            value={`₹${quoteBalance.available.toFixed(2)}`}
            tone="green"
          />

          <Metric
            label="INR Locked"
            value={`₹${quoteBalance.locked.toFixed(2)}`}
          />

          <Metric
            label={`${baseAsset} Available`}
            value={baseHolding.available.toFixed(2)}
          />

          <Metric
            label="Live Price"
            value={`₹${tickerValue.toFixed(2)}`}
            tone="red"
          />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">

        <div className="space-y-5">

          <section className="border border-gray-800 bg-[#14161d]">

            <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
              <h2 className="text-lg font-semibold">Portfolio</h2>
              <span className="text-sm text-gray-400">{currentSymbol}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">

                <thead className="text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Asset</th>
                    <th className="px-5 py-3 font-medium">Available</th>
                    <th className="px-5 py-3 font-medium">Locked</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>

                <tbody>

                  <AssetRow
                    asset="INR"
                    available={quoteBalance.available}
                    locked={quoteBalance.locked}
                  />

                  {assets.map(([asset, balance]) => (
                    <AssetRow
                      key={asset}
                      asset={asset}
                      available={balance.available}
                      locked={balance.locked}
                    />
                  ))}

                </tbody>
              </table>
            </div>

          </section>

          <section className="border border-gray-800 bg-[#14161d]">

            <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
              <h2 className="text-lg font-semibold">Recent Trades</h2>
              <span className="text-sm text-gray-400">
                {latestTrades.length} filled
              </span>
            </div>

            <div className="divide-y divide-gray-800">

              {latestTrades.length ? (
                latestTrades.map((trade: any, index: number) => (

                  <div
                    key={`${trade.amount}-${trade.quantity}-${index}`}
                    className="grid grid-cols-3 px-5 py-4 text-sm"
                  >

                    <span className="text-[#fd4b4e]">
                      ₹{Number(trade.amount).toFixed(2)}
                    </span>

                    <span>
                      {Number(trade.quantity).toFixed(2)} {baseAsset}
                    </span>

                    <span className="text-right text-gray-400">
                      Filled
                    </span>

                  </div>

                ))
              ) : (

                <div className="px-5 py-10 text-center text-sm text-gray-400">
                  No trades yet
                </div>

              )}

            </div>

          </section>

        </div>

        <aside className="space-y-5">

          <section className="border border-gray-800 bg-[#14161d]">

            <div className="border-b border-gray-800 px-5 py-4">
              <h2 className="text-lg font-semibold">Watchlist</h2>
            </div>

            <div className="divide-y divide-gray-800">

              {watchlist.map((market) => (

                <div
                  key={market.market}
                  className="flex items-center justify-between px-5 py-4 text-sm"
                >

                  <div>
                    <p className="font-semibold">
                      {market.market.replace("_", " / ")}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {market.volume} volume
                    </p>
                  </div>

                  <div className="text-right">

                    <p
                      className={
                        market.change.startsWith("+")
                          ? "text-[#02a166]"
                          : "text-[#fd4b4e]"
                      }
                    >
                      {market.change}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {market.base}
                    </p>

                  </div>

                </div>

              ))}

            </div>

          </section>

          <section className="border border-gray-800 bg-[#14161d] px-5 py-4">

            <h2 className="text-lg font-semibold">Session</h2>

            <div className="mt-4 space-y-3 text-sm">

              <InfoRow
                label="Account"
                value={profile.email}
              />

              <InfoRow
                label="User ID"
                value={currentUser.id}
              />

              <InfoRow
                label="Market"
                value={currentSymbol}
              />

              <InfoRow
                label="Quote asset"
                value="INR"
              />

            </div>

          </section>

        </aside>

      </div>

    </section>
  )
}

function Metric({
  label,
  value,
  tone
}: {
  label: string
  value: string
  tone?: "green" | "red"
}) {

  const toneClass =
    tone === "green"
      ? "text-[#02a166]"
      : tone === "red"
      ? "text-[#fd4b4e]"
      : "text-white"

  return (
    <div className="border border-gray-800 bg-[#14161d] px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>

      <p className={`mt-2 text-lg font-semibold ${toneClass}`}>
        {value}
      </p>
    </div>
  )
}

function AssetRow({
  asset,
  available,
  locked
}: {
  asset: string
  available: number
  locked: number
}) {

  return (
    <tr className="border-t border-gray-800">

      <td className="px-5 py-4 font-semibold">
        {asset}
      </td>

      <td className="px-5 py-4">
        {available.toFixed(2)}
      </td>

      <td className="px-5 py-4">
        {locked.toFixed(2)}
      </td>

      <td className="px-5 py-4 text-[#02a166]">
        Active
      </td>

    </tr>
  )
}

function InfoRow({
  label,
  value
}: {
  label: string
  value: string
}) {

  return (
    <div className="flex items-center justify-between gap-4">

      <span className="text-gray-500">
        {label}
      </span>

      <span className="truncate text-right text-white">
        {value}
      </span>

    </div>
  )
}
