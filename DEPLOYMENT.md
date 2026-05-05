# Kazex + Aerion Deployment

This repo can be hosted as two services:

- `kazex-api`: public Go/Fiber HTTP API
- `kazex-engine`: private Rust worker that consumes Redis jobs

Both services need the same Redis instance.

## Runtime Variables

Set these on both services:

```env
REDIS_URL=redis://...
```

The Go service also needs:

```env
PORT=3000
```

Most hosts set `PORT` automatically for public web services.

## Public API Surface For Aerion

The Go API exposes Aerion-compatible endpoints:

```txt
POST   /order
DELETE /order
GET    /depth?symbol=TATA_INR&clientId=1
GET    /ticker?symbol=TATA_INR
GET    /balance?clientId=1
GET    /klines?symbol=TATA_INR&interval=1m&startTime=0&endTime=0
```

`/order` and `/depth` are backed by the Rust engine through Redis. `/ticker`,
`/balance`, and `/klines` are currently lightweight compatibility responses so
the Aerion frontend can load while the engine contract grows.

## Railway Layout

Create one Railway project with:

1. Redis database
2. Go API service
3. Rust engine worker service
4. Aerion websocket service
5. Aerion frontend service

For the Go API service:

```txt
RAILWAY_DOCKERFILE_PATH=Dockerfile.api
Public networking: enabled
```

For the Rust engine service:

```txt
RAILWAY_DOCKERFILE_PATH=Dockerfile.engine
Public networking: disabled
```

The engine is a worker. It does not need a public URL.

For the Aerion websocket service:

```txt
RAILWAY_DOCKERFILE_PATH=Dockerfile.websocket
REDIS_URL=<same Redis URL used by Go API and Rust engine>
Public networking: enabled
```

After Railway gives this service a public URL, use it as `wss://...` in the
frontend's `VITE_WS_URL`.

## Aerion Frontend Variables

Change the frontend to read URLs from Vite env vars:

```ts
export const API_URL = import.meta.env.VITE_API_URL
```

```ts
this.socket = new WebSocket(import.meta.env.VITE_WS_URL)
```

Then set:

```env
VITE_API_URL=https://your-kazex-api-domain
VITE_WS_URL=wss://your-aerion-websocket-domain
```

If you do not deploy the Aerion websocket service yet, the REST endpoints will
still work, but live depth/ticker updates will not stream into the browser.

## Aerion Websocket Service Variables

The websocket service reads Railway's port and Redis URL:

```ts
new WebSocketServer({ port: Number(process.env.PORT ?? 3002) })
```

```ts
createClient({ url: process.env.REDIS_URL })
```

Set the same `REDIS_URL` value that the Go API and Rust engine use.
