import type { Server, WebSocketHandler } from 'bun'
import * as util from "node:util"
import * as api from "./api"
import home from "./src/index.html"

export interface ServeOptions {
  readonly hostname?: string
  readonly port?: number
  readonly development?: boolean
  readonly hot?: boolean
}

const BANNED_STRINGS = ['..'] as const

interface WebSocketData {
  // from request url
  // @example http://localhost:3000/client/test
  readonly url: string
  readonly host: string
  // origin header
  // @example "localhost:8080"
  readonly origin: string
  // sec-websocket-version header
  readonly secWebsocketVersion: string
  // from sec-websocket-key header
  // @example "iuw4bYAJhwDevoA62XM3kg=="
  readonly secWebsocketKey: string
  // from sec-websocket-extensions header
  // @example "permessage-deflate; client_max_window_bits"
  readonly secWebsocketExtensions: string
  // from the `new WebSocket(addr, ['protocol-1', 'protocol-2'])`
  // @example "ecas-environment-v1"
  readonly secWebsocketProtocol: string
  // user-agent header
  // @example "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"
  readonly userAgent: string
  // accept-encoding header
  // @example "gzip, deflate, br, zstd"
  readonly acceptEncoding: string

  // defined by request pathname
  // client/test
  readonly topic: string
  // which time it was connected via new Date()
  readonly date: Date
}

export function serve({
  hostname = 'localhost',
  port = 3000,
  development = false,
  hot = false
}: ServeOptions = {}): Server {
  console.log('Server Options', { hostname, port, development, hot })
  const server = Bun.serve({
    hostname,
    port,
    development,
    routes: {
      "/": home
    },
    async fetch(request, server): Promise<Response> {
      console.time(`Request ${request.url}`)
      if (BANNED_STRINGS.some((banned) => request.url.includes(banned))) {
        return new Response("404")
      }

      if (request.headers.get('upgrade')) {
        const data = getWebSocketData(request)
        if (
          !server.upgrade(request, { data })
        ) {
          return new Response('Upgrade failed', { status: 400 })
        }
      }

      const response = await getResponse(request, server)
      console.timeEnd(`Request ${request.url}`)
      return response
    },
    websocket: <WebSocketHandler<WebSocketData>>{
      async open(ws): Promise<void> {
        const topic = ws.data.topic
        ws.subscribe(topic)
        console.log(`[ws] open ${ws.remoteAddress} topic: ${topic} subscribers: ${server.subscriberCount(topic)}`)
        ws.sendText(
          JSON.stringify({
            protocolName: 'ts-signal-rpc',
            protocolVersion: '1.0.0',
          })
        )
      },
      message(ws, message): void {
        const topic = ws.data.topic
        if (!topic) {
          console.error(`[ws] Failed To Recieve Message For ${ws.data.url} due to no Topic`)
          return
        }
        ws.publish(topic, message as string | Bun.BufferSource)
      },
      close(ws, code, reason): void {
        console.log(`[ws] close ${ws.remoteAddress} code: ${code} reason: ${reason}`)
      }
    }
  })
  console.log(`Server running at ${server.url}`)
  console.log(`Websocket running at ws://${server.hostname}:${server.port}`)
  return server
}

function getWebSocketData(request: Request): WebSocketData {
  const data: WebSocketData = {
    url: request.url,
    topic: new URL(request.url).pathname.slice(1) || "none",
    host: request.headers.get("host") ?? "unknown",
    origin: request.headers.get("origin") ?? "unknown",
    secWebsocketVersion: request.headers.get("sec-websocket-version") ?? "unknown",
    secWebsocketKey: request.headers.get("sec-websocket-key") ?? "unknown",
    secWebsocketExtensions: request.headers.get("sec-websocket-extensions") ?? "unknown",
    secWebsocketProtocol: request.headers.get("sec-websocket-protocol") ?? "unknown",
    acceptEncoding: request.headers.get("accept-encoding") ?? "unknown",
    userAgent: request.headers.get("user-agent") ?? "unknown",
    date: new Date(),
  }
  return data
}

async function getResponse(request: Request, server: Server): Promise<Response> {
  switch (request.method) {
    case 'GET': {
      const response = await api.GET(request, server)
      return response
    }
    case 'POST': {
      console.timeEnd(`Request ${request.url}`)
      return api.POST(request, server)
    }
    case 'DELETE': {
      console.timeEnd(`Request ${request.url}`)
      return api.DELETE(request, server)
    }
    default: {
      console.timeEnd(`Request ${request.url}`)
      return new Response("404")
    }
  }
}

const cli = {
  collect() {
    const parsed = util.parseArgs({
      strict: true,
      options: {
        development: {
          type: "boolean",
          default: true
        },
        hostname: {
          type: "string",
          default: "127.0.0.1"
        },
        hot: {
          type: "boolean",
          default: false
        },
        port: {
          type: "string",
          default: "8080"
        }
      }
    })
    return {
      ...parsed.values,
      port: Number.parseInt(parsed.values.port ?? 8080)
    }
  }
}

if (import.meta.main) {
  const collected = cli.collect()
  serve(collected)
}
