import type { RequestApi, ResponseApi } from './shared/api'
import { Socket } from "./shared/socket"

const socket = Socket.fromUrl<RequestApi, ResponseApi>("ws://127.0.0.1:8080")

const response = await socket.request({
  type: "score"
})

console.log("Response", response)
