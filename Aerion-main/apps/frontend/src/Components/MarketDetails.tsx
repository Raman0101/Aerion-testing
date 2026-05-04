import { useRecoilValue } from "recoil"
import { ticker } from "../state"

export default function() {
    const tickerValue = useRecoilValue(ticker)
    console.log(tickerValue)
    return (
        <div className="flex gap-2 border-b border-gray-800 h-max items-center px-10  py-2 " >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="size-6" >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M12 17.25h8.25" />
            </svg>
            < div className="text-white font-semibold text-lg" >
                TATA / INR
            </div>
            < div className="px-8" >
                <div>
                    <span className="font-medium text-[#fd4b4e] text-2xl" > {tickerValue} </span>
                </div>
                < div >
                    <span className="text-white" > ₹{tickerValue} </span>
                </div>
            </div>
        </div>
    )
}
