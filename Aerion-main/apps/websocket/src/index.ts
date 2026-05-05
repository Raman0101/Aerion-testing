import { WebSocketServer } from "ws";
import { UsersManager } from "./UserManager";

const port = Number(process.env.PORT ?? 3002);
const wss = new WebSocketServer({ port });

console.log(`WebSocket server listening on port ${port}`);

UsersManager.getInstance()
wss.on("connection", (ws) => {
        UsersManager.getInstance().addUser(ws);
});

