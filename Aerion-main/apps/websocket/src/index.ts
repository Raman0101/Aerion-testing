import { createServer, Server } from "http";
import { WebSocketServer } from "ws";
import { UsersManager } from "./UserManager";

const ports = Array.from(
        new Set(
                [process.env.PORT, process.env.WEBSOCKET_PORT, "3002"]
                        .filter(Boolean)
                        .map((port) => Number(port))
                        .filter((port) => Number.isFinite(port) && port > 0)
        )
);

function createHttpServer() {
        return createServer((_, res) => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
        });
}

function attachWebSocketServer(server: Server, port: number) {
        const wss = new WebSocketServer({ server });

        wss.on("error", (error: NodeJS.ErrnoException) => {
                if (error.code === "EADDRINUSE") {
                        console.warn(`Port ${port} is already in use; skipping that websocket listener.`);
                        return;
                }

                console.error(`WebSocket listener failed on port ${port}:`, error);
        });

        wss.on("connection", (ws) => {
                UsersManager.getInstance().addUser(ws);
        });
}

UsersManager.getInstance()
ports.forEach((port) => {
        const server = createHttpServer();
        attachWebSocketServer(server, port);

        server.on("error", (error: NodeJS.ErrnoException) => {
                if (error.code === "EADDRINUSE") {
                        console.warn(`Port ${port} is already in use; skipping that listener.`);
                        return;
                }

                console.error(`WebSocket server failed on port ${port}:`, error);
        });

        server.listen(port, "0.0.0.0", () => {
                console.log(`WebSocket server listening on port ${port}`);
        });
});
