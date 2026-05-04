import WebSocket from "ws"
import { payload } from "@repo/types/websocket"
import { SubscriptionManager } from "./SubscriptionManager"
export class UsersManager {
	private static instance: UsersManager
	private Users: Map<string, User> = new Map()
	private constructor() {
		SubscriptionManager.getInstance()
	}
	static getInstance() {
		if (!this.instance) {
			this.instance = new UsersManager()
		}
		return this.instance
	}
	addUser(ws: WebSocket) {
		const id = Math.random().toString()
		const user = new User(id, ws)
		this.Users.set(id, user)
	}
	removeUser(id: string) {
		this.Users.delete(id)
	}
}
class User {
	private ws: WebSocket;
	private id: string;
	constructor(id: string, ws: WebSocket) {
		this.ws = ws
		this.id = id
		this.listen()
	}
	listen() {
		this.ws.on("message", (message: string) => {
			this.processRequest(JSON.parse(message))
		})
		this.ws.on("close", () => {
			SubscriptionManager.getInstance().removeUser(this.ws)
			UsersManager.getInstance().removeUser(this.id)
		})
	}
	processRequest(message: payload) {
		const Manager = SubscriptionManager.getInstance()
		switch (message.method) {
			case "SUBSCRIBE":
				message.params.forEach((param) => {
					Manager.Subscribe(this.ws, param)
				})
				break;
			case "UNSUBSCRIBE":
				message.params.forEach((param) => {
					Manager.Unsubscribe(this.ws, param)
				})
				break;
		}

	}
}
