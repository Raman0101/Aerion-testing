import { useRecoilValue } from "recoil"
import { TradesState } from "../state"
export default function() {
    const Trades = useRecoilValue(TradesState)
    return (
        <div className="trades px-2" >
            <div className="flex font-semibold text-xs justify-between mb-3" >
                <h1>Price(INR) </h1>
                < h1 className="opacity-50" > Quantity(TATA) </h1>
            </div>
            {
                Trades.slice(0, 10).map((trade, idx) => {
                    return <div key={`trade-${trade.amount}-${trade.quantity}-${idx}`} className="flex p-1 py-0 px-1 pl-0 my-[1px] relative opacity-75 text-[14px] font-medium justify-between" >
                        <h1 className="text-[#fd4b4e]" > {Number(trade.amount).toFixed(2)
                        } </h1>
                        < h1 className="" > {Number(trade.quantity).toFixed(2)} </h1>
                    </div>
                })
            }
        </div>
    )
}
