# Kazex + Aerion Deployment

This repo can be hosted as five services:

- `kazex-api`: public Go/Fiber HTTP API
- `kazex-engine`: private Rust worker that consumes Redis jobs
- `redis`: shared queue and pub/sub database
- `aerion-websocket`: public websocket bridge for Redis streams
- `aerion-frontend`: public Vite/React frontend

The API, engine, and websocket services need the same Redis instance.

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
Public networking target port: 3002
```

After Railway gives this service a public URL, use it as `wss://...` in the
frontend's `VITE_WS_URL`.

The websocket service also starts on Railway's injected `PORT`, but Railway's
public domain must route to one of the ports printed in the deploy logs. If HTTP
logs show `502`, compare the Settings > Networking target port with the
`WebSocket server listening on port ...` log line.

For the Aerion frontend service:

```txt
RAILWAY_DOCKERFILE_PATH=Dockerfile.frontend
VITE_API_URL=https://your-kazex-api-domain
VITE_WS_URL=wss://your-aerion-websocket-domain
Public networking: enabled
```

The frontend is a static Vite build served by Caddy. `VITE_API_URL` and
`VITE_WS_URL` are build-time variables, so redeploy the frontend after changing
either value.

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

## Deploy Frontend On Vercel

Use Vercel only for the frontend. Keep the Go API, Rust engine, Redis, and
websocket services on Railway.

When importing this repo into Vercel, set:

```txt
Root Directory: Aerion-main
Framework Preset: Other
Install Command: npm ci
Build Command: npm run build --workspace=frontend
Output Directory: apps/frontend/dist
```

The `Aerion-main/vercel.json` file already contains those build settings and an
SPA rewrite to serve `index.html` for client-side routes.

Set these Vercel environment variables for Production, Preview, and Development
as needed:

```env
VITE_API_URL=https://your-kazex-api-domain
VITE_WS_URL=wss://your-aerion-websocket-domain
```

For the currently deployed Railway backend, use:

```env
VITE_API_URL=https://go-api-production-96d5.up.railway.app
VITE_WS_URL=wss://websocket-production-4658.up.railway.app
```

## Aerion Websocket Service Variables

The websocket service reads Railway's port and Redis URL:

```ts
process.env.PORT
process.env.WEBSOCKET_PORT
```

```ts
createClient({ url: process.env.REDIS_URL })
```

Set the same `REDIS_URL` value that the Go API and Rust engine use.
