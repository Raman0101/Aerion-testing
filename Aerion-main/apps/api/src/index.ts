import express from "express"
import cors from "cors"
import { orderRouter } from "./Router/Order"
import { depthRouter } from "./Router/Depth"
import { requestPayload } from "@repo/types"
import RedisManager from "./RedisManager"
import { klineRouter } from "./Router/Klines"

const app = express()

app.use(cors())
app.use(express.json())

app.get("/", (_, res) => {
    return res.json("Healthy!")
})

app.use("/order", orderRouter)
app.use("/depth", depthRouter)
app.use("/klines", klineRouter);

app.use("/ticker", async (req, res) => {
    const { clientId, symbol } = req.query as { clientId: string, symbol: string }
    const payload: Omit<requestPayload, "id"> = {
        message: {
            Action: "GET_TICKER",
            Data: {
                symbol
            }
        },
        clientId
    }
    const response = await RedisManager.getInstance().pushAndWait(payload)
    res.json(response)
})


app.get("/balance", async (req, res) => {
    const { clientId } = req.query as { clientId: string }
    const payload: Omit<requestPayload, "id"> = {
        message: {
            Action: "GET_BALANCE",
            Data: {
                id: clientId
            }
        },
        clientId
    }
    const response = await RedisManager.getInstance().pushAndWait(payload)
    res.json(response)
})


// todo: store request somewhere which came while server was preparing 
async function start() {
    app.listen(3001, () => {
        console.log("API Server ready.");
    })
}
start()
