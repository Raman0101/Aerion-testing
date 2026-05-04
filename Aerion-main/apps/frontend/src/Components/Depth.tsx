import { useRecoilValue } from "recoil"
import { DepthState, ticker } from "../state"
export default function() {
    const Depth = useRecoilValue(DepthState)
    const tickerValue = useRecoilValue(ticker)
    // Will be used to determine graph behind the bids and the asks
    let accumulatedQuantity = 0
    const updatedDepth: { bids: [number, number, number][], asks: [number, number, number][] } = {
        bids: [],
        asks: []
    }
    const total: { bids: number, asks: number } = {
        bids: Depth.bids.reduce((acc, bid) => acc + bid[1], 0),
        asks: Depth.asks.reduce((acc, ask) => acc + ask[1], 0)
    }
    updatedDepth.asks = Depth.asks.slice(0, 6).reverse().map(([price, quantity]) => [price, quantity, accumulatedQuantity += quantity])
    updatedDepth.asks.reverse()

    accumulatedQuantity = 0
    updatedDepth.bids = Depth.bids.slice(0, 6).map(([price, quantity]) => [price, quantity, accumulatedQuantity += quantity])
    return (
        <div className="Depth text-[12px]" >
            <div className="asks" >
                <div className="flex font-semibold justify-between mb-3 mr-2" >
                    <h1>Price(INR) </h1>
                    < h1 className="opacity-50" > Size(TATA) </h1>
                    < h1 className="opacity-50" > TOTAL(TATA) </h1>
                </div>
                {
                    updatedDepth.asks.map((ask, idx) => {
                        const volumePercent = (ask[2] * 100 / total.asks)
                        const currentAmountPercent = (ask[1] * Number(volumePercent) / ask[2]).toFixed(2)
                        return ask.length ? <div key={`ask-${ask[0]}-${idx}`} className="flex p-1 px-1 pl-0 my-[2px] relative opacity-75 text-[13px] font-medium justify-between" >
                            <div style={{ width: volumePercent + "%", transition: "width 0.3s ease-in-out" }} className={`h-full graph top-0 right-0 bg-[#291419] absolute`
                            } > </div>
                            < div style={{ width: currentAmountPercent + "%", transition: "width 0.3s ease-in-out" }} className={`h-full graph top-0 right-0 bg-[#76292d] absolute`
                            } > </div>
                            < h1 className="text-[#fd4b4e]" > {ask[0].toFixed(2)} </h1>
                            < h1 className="" > {ask[1].toFixed(2)} </h1>
                            < h1 className="" > {ask[2].toFixed(2)} </h1>
                        </div> : ""
                    })
                }
            </div>
            < h1 className="text-xl text-[#02a166] my-2 font-semibold" > {tickerValue} </h1>
            < div className="bids" >
                {
                    updatedDepth.bids.map((bid, idx) => {
                        const volumePercent = (bid[2] * 100 / total.bids).toFixed(2)
                        const currentAmountPercent = (bid[1] * Number(volumePercent) / bid[2]).toFixed(2)
                        return bid.length ? <div key={`bid-${bid[0]}-${idx}`} className="flex p-1 px-1 pl-0 my-[2px] relative opacity-75 text-[13px] font-medium justify-between" >
                            <div style={{ width: volumePercent + "%", transition: "width 0.3s ease-in-out" }} className={`h-full graph top-0 right-0 bg-[#0d1d1b] absolute`
                            } > </div>
                            < div style={{ width: currentAmountPercent + "%", transition: "width 0.3s ease-in-out" }} className={`h-full graph top-0 right-0 bg-[#085c3e] absolute`} > </div>
                            < h1 className="text-[#02a166]" > {bid[0].toFixed(2)} </h1>
                            < h1 className="" > {bid[1].toFixed(2)} </h1>
                            < h1 className="" > {bid[2].toFixed(2)} </h1>
                        </div> : ""
                    })
                }

            </div>
        </div>
    )

}
