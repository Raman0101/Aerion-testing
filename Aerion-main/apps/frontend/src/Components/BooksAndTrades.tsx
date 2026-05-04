import Depth from "./Depth"
import TradeList from "./TradeList"
import { useState } from "react"
export default function() {
    const [Tab, setTab] = useState<"Book" | "Trade">("Book")

    function changeTab() {
        setTab(Tab === "Book" ? "Trade" : "Book")
    }
    return (
        <div className="w-[30%] border-l border-gray-800 pl-4 pb-4 text-white" >
            <div className="py-3 text-[16px] flex gap-4" >
                <div onClick={changeTab} className={`${Tab === "Book" && "border-b-2 border-[#4c94ff]"} cursor-pointer pb-1`
                } >
                    Book
                </div>
                < div onClick={changeTab} className={`${Tab === "Trade" && "border-b-2 border-[#4c94ff]"} cursor-pointer`} >
                    Trades
                </div>
            </div>
            {
                Tab === "Book" ? <Depth /> : <TradeList />
            }
        </div >
    )
}

