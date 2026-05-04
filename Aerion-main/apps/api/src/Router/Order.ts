import express from "express"
import RedisManager from "../RedisManager"
import { requestPayload } from "@repo/types"


export const orderRouter = express.Router()
const redis = RedisManager.getInstance()

// {
//       "side": "bid",
//       "amount": 100, 
//       "quantity": 1,
//       "symbol": "TEST_INR"
//       "clientId": "1"
// }
orderRouter.post("/", async (req, res) => {
    const { side, amount, quantity, symbol, clientId } = req.body
    const payload: Omit<requestPayload, "id"> = {
        message: {
            Action: "CREATE_ORDER",
            Data: {
                side, amount, quantity, symbol
            }
        },
        clientId
    }
    // response from pubsub
    const response = await redis.pushAndWait(payload)

    res.json(response)
})

orderRouter.delete("/", async (req, res) => {
    const { orderId, symbol, clientId } = req.body
    const payload: Omit<requestPayload, "id"> = {
        message: {
            Action: "CANCEL_ORDER",
            Data: {
                orderId, symbol
            }
        },
        clientId
    }
    const response = await redis.pushAndWait(payload)
    res.json(response)
})
