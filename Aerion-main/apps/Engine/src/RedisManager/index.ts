import { requestPayload } from "@repo/types";
import { createClient, RedisClientType } from "redis"

export default class RedisManager {
    private client: RedisClientType;
    private publisher: RedisClientType;
    private static instance: RedisManager;
    private constructor() {
        this.client = createClient();
        this.publisher = createClient();
        this.client.connect()
        this.publisher.connect()
    }
    static getInstance() {
        if (!RedisManager.instance) {
            const instance = new RedisManager()
            RedisManager.instance = instance;
        }
        return RedisManager.instance;
    }
    async getFromQueue(): Promise<requestPayload> {
        return new Promise((resolve) => {
            this.client.brPop("Process", 0).then((response) => {
                if (!response) {
                    throw new Error("No Response!")
                }
                resolve(JSON.parse(response.element))
            })
        })
    }
    // Todo: Typecasing for sending to api back
    publishToAPI(id: string, payload: any) {
        this.publisher.publish(id, payload)
    }
    publishToWs(stream: string, message: any) {
        this.publisher.publish(stream, JSON.stringify(message))
    }
}
