import { payload } from "@repo/types/websocket"
export class WebSocketManager {
	private static instance: WebSocketManager
	private socket: WebSocket
	private bufferedMessage: payload[] = []
	private initialized: boolean = false
	private callbacks: { [key: string]: ((data: any) => void)[] } = {}
	private constructor() {
		this.socket = new WebSocket(import.meta.env.VITE_WS_URL ?? "ws://localhost:3002")
		this.init()
	}
	static getInstance() {
		if (!this.instance) {
			this.instance = new WebSocketManager()
		}
		return this.instance
	}
	sendMessage(message: payload) {
		if (!this.initialized) {
			this.bufferedMessage.push(message)
			return
		}
		this.socket.send(JSON.stringify(message))
	}
	attachCallback(stream: string, callback: (data: any) => void) {
		if (this.callbacks[stream]) {
			this.callbacks[stream].push(callback)
			return
		}
		this.callbacks[stream] = [callback]
	}
	detachCallback(stream: string, callback: (data: any) => void) {
		this.callbacks[stream] = this.callbacks[stream].filter(call => call !== callback)
	}
	handleIncomingData(data: any) {
		if (this.callbacks[data.e]) {
			this.callbacks[data.e].forEach((callback) => {
				callback(data)
			})
		}
	}
	init() {
		this.socket.onopen = () => {
			this.initialized = true
			this.bufferedMessage.forEach((message) => {
				this.socket.send(JSON.stringify(message))
			})
		}
		this.socket.addEventListener("message", (data: any) => {
			this.handleIncomingData(JSON.parse(data.data.toString()))
		})
		this.socket.onerror = (error: Event) => {
			console.error("WebSocket error:", error)
		}
		this.socket.onclose = () => {
			console.warn("WebSocket closed")
			this.initialized = false
		}
	}
}
