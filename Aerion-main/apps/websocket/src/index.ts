import { WebSocketServer } from "ws";
import { UsersManager } from "./UserManager";
const wss = new WebSocketServer({ port: 3002 });
UsersManager.getInstance()
wss.on("connection", (ws) => {
        UsersManager.getInstance().addUser(ws);
});


