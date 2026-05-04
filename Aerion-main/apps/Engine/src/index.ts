import { Engine } from "./trade/Engine";
import RedisManager from "./RedisManager";
import { RedisClientType } from "redis";
import { requestPayload } from "@repo/types";

const engine = Engine.getInstance()
async function submitProcesses() {
        const redis: RedisManager = RedisManager.getInstance()
        while (1) {
            const Payload: requestPayload = await redis.getFromQueue()
            try {
                const response = await engine.Process(Payload)
                if (Payload.id) {
                    redis.publishToAPI(Payload.id, JSON.stringify(response))
                }
            }
            catch (e: unknown) {
                if (e instanceof Error) {
                    if (Payload.id) {
                    redis.publishToAPI(Payload.id, JSON.stringify({
                        error: e.message
                    }))
                }
            }
        }
        }
}

submitProcesses()
