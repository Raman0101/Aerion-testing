import { createServer } from "http";
import { WebSocketServer } from "ws";
import { UsersManager } from "./UserManager";

const port = Number(process.env.PORT ?? 3002);
const server = createServer((_, res) => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
});
const wss = new WebSocketServer({ server });

server.listen(port, "0.0.0.0", () => {
        console.log(`WebSocket server listening on port ${port}`);
});

UsersManager.getInstance()
wss.on("connection", (ws) => {
        UsersManager.getInstance().addUser(ws);
});
